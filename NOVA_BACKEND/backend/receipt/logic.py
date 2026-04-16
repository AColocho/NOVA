import base64
from datetime import datetime
from decimal import Decimal
import logging
from mimetypes import guess_extension, guess_type
from pathlib import Path
from uuid import UUID
from uuid import uuid4

from fastapi import HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from ..db_connector import ConnectionDB
from ..db_management.internal import Receipt, ReceiptDiscount, ReceiptItem
from ..logging_utils import get_logger, log_caught_exception, log_raise
from ..nova.gpt import GPTClient
from ..storage_connector import StorageClient
from .model import (ReceiptCreate, ReceiptDelete, ReceiptDiscountCreate,
                    ReceiptGet, ReceiptItemCreate, ReceiptMetadataWindow,
                    ReceiptUpdate)

logger = get_logger(__name__)


class Logic(ConnectionDB):
    _SUPPORTED_SCAN_CONTENT_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
    }

    @staticmethod
    def _decimal_to_string(value: Decimal | None) -> str | None:
        """Serialize Decimal values consistently for JSON responses."""
        if value is None:
            return None
        return format(value, "f")

    @classmethod
    def _resolve_scan_content_type(cls, uploaded_file: UploadFile) -> str:
        """Resolve and validate the content type for a receipt scan upload."""
        content_type = uploaded_file.content_type
        if not content_type and uploaded_file.filename:
            guessed_type, _ = guess_type(uploaded_file.filename)
            content_type = guessed_type

        if content_type not in cls._SUPPORTED_SCAN_CONTENT_TYPES:
            log_raise(
                logger,
                "Unsupported receipt scan content type",
                level=logging.WARNING,
                filename=uploaded_file.filename,
                content_type=content_type,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported receipt scan file type. Use PNG, JPEG, or PDF.",
            )

        return content_type

    @staticmethod
    def _resolve_scan_file_extension(
        uploaded_file: UploadFile, content_type: str
    ) -> str:
        """Resolve the object extension for a supported receipt upload."""
        if uploaded_file.filename:
            file_extension = Path(uploaded_file.filename).suffix.lower().lstrip(".")
            if file_extension in {"pdf", "jpeg", "jpg", "png"}:
                return file_extension

        guessed_extension = guess_extension(content_type)
        if guessed_extension is None:
            log_raise(
                logger,
                "Unable to determine receipt scan extension",
                level=logging.WARNING,
                filename=uploaded_file.filename,
                content_type=content_type,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to determine the uploaded receipt scan file type.",
            )

        return guessed_extension.lstrip(".")

    @staticmethod
    def _save_scan_file(
        *,
        file_bytes: bytes,
        content_type: str,
        file_extension: str,
        home_id: UUID,
    ) -> str:
        """Persist the uploaded scan to object storage and return the object key."""
        upload_date = datetime.now().astimezone().date().isoformat()
        file_id = uuid4()
        object_key = f"homes/{home_id}/upload_date={upload_date}/{file_id}.{file_extension}"
        storage = StorageClient()

        try:
            storage.client.put_object(
                Bucket=storage.receipt_bucket,
                Key=object_key,
                Body=file_bytes,
                ContentType=content_type,
            )
        except Exception as exc:
            log_caught_exception(
                logger,
                "Unable to store receipt scan in object storage",
                bucket=storage.receipt_bucket,
                key=object_key,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to store the uploaded receipt scan.",
            ) from exc

        return object_key

    @staticmethod
    def _build_scan_prompt_input(
        *,
        file_bytes: bytes,
        content_type: str,
        filename: str,
        scan_location: str | None,
    ) -> list[dict[str, object]]:
        """Build a Responses API multimodal input payload for receipt parsing."""
        base64_file = base64.b64encode(file_bytes).decode("ascii")
        file_data_url = f"data:{content_type};base64,{base64_file}"
        file_part: dict[str, str]

        if content_type == "application/pdf":
            file_part = {
                "type": "input_file",
                "filename": filename,
                "file_data": file_data_url,
            }
        else:
            file_part = {
                "type": "input_image",
                "image_url": file_data_url,
            }

        return [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Extract a retail receipt from this uploaded file and return "
                            "the structured receipt payload."
                        ),
                    },
                    {
                        "type": "input_text",
                        "text": (
                            f"Original filename: {filename}\n"
                            f"Scan location: {scan_location or 'unknown'}"
                        ),
                    },
                    file_part,
                ],
            }
        ]

    @staticmethod
    def _build_receipt_discount(
        payload: ReceiptDiscountCreate,
    ) -> ReceiptDiscount:
        """Build a receipt discount entity from the validated payload."""
        return ReceiptDiscount(label=payload.label, amount=payload.amount)

    @classmethod
    def _build_receipt_item(
        cls, payload: ReceiptItemCreate, receipt: Receipt
    ) -> ReceiptItem:
        """Build a receipt item entity including any nested item discounts."""
        item = ReceiptItem(
            item_name=payload.item_name,
            quantity=payload.quantity,
            unit_price_amount=payload.unit_price_amount,
            gross_amount=payload.gross_amount,
            discount_amount=payload.discount_amount,
            total_amount=payload.total_amount,
        )
        for discount_payload in payload.discounts:
            discount = cls._build_receipt_discount(discount_payload)
            discount.receipt = receipt
            item.discounts.append(discount)
        return item

    @classmethod
    def _build_receipt(cls, payload: ReceiptCreate, home_id: UUID, user_id: UUID) -> Receipt:
        """Build a SQLAlchemy receipt entity from the validated create payload."""
        receipt = Receipt(
            home_id=home_id,
            created_by_user_id=user_id,
            store_name=payload.store_name,
            invoice_number=payload.invoice_number,
            receipt_date=payload.receipt_date,
            city=payload.city,
            state=payload.state,
            scan_location=payload.scan_location,
            currency_code=payload.currency_code,
            subtotal_amount=payload.subtotal_amount,
            receipt_discount_total=payload.receipt_discount_total,
            tax_amount=payload.tax_amount,
            total_amount=payload.total_amount,
        )

        receipt.discounts.extend(
            cls._build_receipt_discount(discount)
            for discount in payload.receipt_discounts
        )
        receipt.items.extend(
            cls._build_receipt_item(item, receipt=receipt) for item in payload.items
        )

        return receipt

    def _save_receipt(self, payload: ReceiptCreate, home_id: UUID, user_id: UUID) -> Receipt:
        """Persist a receipt payload and return the created record."""
        receipt = self._build_receipt(payload, home_id=home_id, user_id=user_id)

        try:
            with self.session() as session:
                session.add(receipt)
                session.commit()
                session.refresh(receipt)
        except IntegrityError as exc:
            log_caught_exception(logger, "Unable to create receipt record")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to create receipt with the provided data.",
            ) from exc

        return receipt

    @classmethod
    def _serialize_receipt_metadata(cls, receipt: Receipt) -> dict[str, str | None]:
        """Return the subset of receipt fields used for card-style UI displays."""
        return {
            "receipt_id": str(receipt.id),
            "store_name": receipt.store_name,
            "invoice_number": receipt.invoice_number,
            "receipt_date": receipt.receipt_date.isoformat(),
            "city": receipt.city,
            "state": receipt.state,
            "scan_location": receipt.scan_location,
            "currency_code": receipt.currency_code,
            "total_amount": cls._decimal_to_string(receipt.total_amount),
            "updated_at": receipt.updated_at.isoformat(),
        }

    @classmethod
    def _serialize_receipt_discount(
        cls, discount: ReceiptDiscount
    ) -> dict[str, str]:
        """Serialize a receipt discount row."""
        return {
            "discount_id": str(discount.id),
            "label": discount.label,
            "amount": cls._decimal_to_string(discount.amount) or "0.00",
        }

    @classmethod
    def _serialize_receipt(cls, receipt: Receipt) -> dict[str, object]:
        """Return a full receipt payload including ordered items and discounts."""
        return {
            "receipt_id": str(receipt.id),
            "store_name": receipt.store_name,
            "invoice_number": receipt.invoice_number,
            "receipt_date": receipt.receipt_date.isoformat(),
            "city": receipt.city,
            "state": receipt.state,
            "scan_location": receipt.scan_location,
            "currency_code": receipt.currency_code,
            "subtotal_amount": cls._decimal_to_string(receipt.subtotal_amount),
            "receipt_discount_total": cls._decimal_to_string(
                receipt.receipt_discount_total
            ),
            "tax_amount": cls._decimal_to_string(receipt.tax_amount),
            "total_amount": cls._decimal_to_string(receipt.total_amount),
            "created_at": receipt.created_at.isoformat(),
            "updated_at": receipt.updated_at.isoformat(),
            "receipt_discounts": [
                cls._serialize_receipt_discount(discount)
                for discount in receipt.discounts
                if discount.receipt_item_id is None
            ],
            "items": [
                {
                    "item_id": str(item.id),
                    "line_number": item.line_number,
                    "item_name": item.item_name,
                    "quantity": cls._decimal_to_string(item.quantity) or "0",
                    "unit_price_amount": cls._decimal_to_string(item.unit_price_amount),
                    "gross_amount": cls._decimal_to_string(item.gross_amount) or "0.00",
                    "discount_amount": cls._decimal_to_string(item.discount_amount)
                    or "0.00",
                    "total_amount": cls._decimal_to_string(item.total_amount) or "0.00",
                    "discounts": [
                        cls._serialize_receipt_discount(discount)
                        for discount in item.discounts
                    ],
                }
                for item in receipt.items
            ],
        }

    @staticmethod
    def _apply_receipt_discount_updates(
        receipt: Receipt, discounts: list[ReceiptDiscountCreate]
    ) -> None:
        """Replace receipt-level discounts while preserving item-level discounts."""
        receipt_level_discounts = [
            discount for discount in receipt.discounts if discount.receipt_item_id is None
        ]
        for discount in receipt_level_discounts:
            receipt.discounts.remove(discount)

        receipt.discounts.extend(
            ReceiptDiscount(label=discount.label, amount=discount.amount)
            for discount in discounts
        )

    @classmethod
    def _apply_receipt_item_updates(
        cls, receipt: Receipt, items: list[ReceiptItemCreate]
    ) -> None:
        """Replace all receipt items and nested item-level discounts."""
        item_level_discounts = [
            discount for discount in receipt.discounts if discount.receipt_item_id is not None
        ]
        for discount in item_level_discounts:
            receipt.discounts.remove(discount)

        receipt.items[:] = [
            cls._build_receipt_item(item, receipt=receipt) for item in items
        ]

    def create_receipt(
        self, payload: ReceiptCreate, response: Response, home_id: UUID, user_id: UUID
    ) -> dict[str, str]:
        """Create a receipt and all nested items and discounts."""
        receipt = self._save_receipt(payload, home_id=home_id, user_id=user_id)

        response.status_code = status.HTTP_201_CREATED
        return {"receipt_id": str(receipt.id)}

    def create_receipt_from_scan(
        self,
        uploaded_file: UploadFile,
        scan_location: str | None,
        response: Response,
        home_id: UUID,
        user_id: UUID,
    ) -> ReceiptCreate:
        """Parse an uploaded receipt scan, persist it, and return the payload."""
        content_type = self._resolve_scan_content_type(uploaded_file)
        file_extension = self._resolve_scan_file_extension(uploaded_file, content_type)
        filename = uploaded_file.filename or "receipt-scan"
        file_bytes = uploaded_file.file.read()
        if not file_bytes:
            log_raise(
                logger,
                "Uploaded receipt scan file is empty",
                level=logging.WARNING,
                filename=filename,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded receipt scan file is empty.",
            )
        object_key = self._save_scan_file(
            file_bytes=file_bytes,
            content_type=content_type,
            file_extension=file_extension,
            home_id=home_id,
        )

        parsed_receipt = GPTClient().chat(
            input_data=self._build_scan_prompt_input(
                file_bytes=file_bytes,
                content_type=content_type,
                filename=filename,
                scan_location=scan_location,
            ),
            system_prompt=(
                "Extract exactly one receipt from the provided uploaded file. "
                "Return data that matches the receipt creation schema. "
                "Use the scan_location provided in the prompt when available. "
                "Do not invent missing values. Use null for unknown invoice_number, city, "
                "state, and scan_location. Use USD unless the receipt clearly indicates "
                "another currency. Include all identifiable purchased items, any item-level "
                "discounts, and any receipt-level discounts. If the uploaded file does not "
                "contain a usable receipt, fail."
            ),
            response_model=ReceiptCreate,
            temperature=0,
        )
        if not isinstance(parsed_receipt, ReceiptCreate):
            log_raise(
                logger,
                "Receipt parser returned unexpected payload type",
                filename=filename,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The receipt parser did not return the expected payload.",
            )
        parsed_receipt = parsed_receipt.model_copy(update={"scan_location": object_key})
        if not parsed_receipt.items:
            log_raise(
                logger,
                "Receipt parser returned no items",
                level=logging.WARNING,
                filename=filename,
                object_key=object_key,
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to extract receipt items from the provided scan file.",
            )

        self._save_receipt(parsed_receipt, home_id=home_id, user_id=user_id)
        response.status_code = status.HTTP_201_CREATED
        return parsed_receipt

    def get_receipt_metadata(
        self,
        payload: ReceiptMetadataWindow,
        response: Response,
        home_id: UUID,
    ) -> dict[str, int | list[dict[str, str | None]]]:
        """Return a window of receipt metadata for list or card views."""
        with self.session() as session:
            statement = (
                select(Receipt)
                .where(Receipt.home_id == home_id)
                .order_by(Receipt.receipt_date.desc(), Receipt.created_at.desc())
                .offset(payload.offset)
                .limit(payload.limit)
            )
            receipts = session.scalars(statement).all()

        response.status_code = status.HTTP_200_OK
        return {
            "offset": payload.offset,
            "limit": payload.limit,
            "count": len(receipts),
            "receipts": [self._serialize_receipt_metadata(receipt) for receipt in receipts],
        }

    def get_receipt(
        self, payload: ReceiptGet, response: Response, home_id: UUID
    ) -> dict[str, object]:
        """Return the full receipt record for a single receipt identifier."""
        with self.session() as session:
            statement = (
                select(Receipt)
                .options(
                    selectinload(Receipt.items).selectinload(ReceiptItem.discounts),
                    selectinload(Receipt.discounts),
                )
                .where(Receipt.id == payload.receipt_id, Receipt.home_id == home_id)
            )
            receipt = session.scalar(statement)
            if receipt is None:
                log_raise(
                    logger,
                    "Receipt not found",
                    level=logging.WARNING,
                    receipt_id=str(payload.receipt_id),
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Receipt not found.",
                )

        response.status_code = status.HTTP_200_OK
        return self._serialize_receipt(receipt)

    def delete_receipt(
        self, payload: ReceiptDelete, response: Response, home_id: UUID
    ) -> dict[str, str]:
        """Delete a receipt by identifier."""
        with self.session() as session:
            receipt = session.scalar(
                select(Receipt).where(
                    Receipt.id == payload.receipt_id,
                    Receipt.home_id == home_id,
                )
            )
            if receipt is None:
                log_raise(
                    logger,
                    "Receipt not found for delete",
                    level=logging.WARNING,
                    receipt_id=str(payload.receipt_id),
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Receipt not found.",
                )

            session.delete(receipt)
            session.commit()

        response.status_code = status.HTTP_200_OK
        return {"receipt_id": str(payload.receipt_id)}

    def update_receipt(
        self, payload: ReceiptUpdate, response: Response, home_id: UUID
    ) -> dict[str, str]:
        """Apply a partial update to a receipt and optionally replace nested lists."""
        try:
            with self.session() as session:
                statement = (
                    select(Receipt)
                    .options(
                        selectinload(Receipt.items).selectinload(ReceiptItem.discounts),
                        selectinload(Receipt.discounts),
                    )
                    .where(Receipt.id == payload.receipt_id, Receipt.home_id == home_id)
                )
                receipt = session.scalar(statement)
                if receipt is None:
                    log_raise(
                        logger,
                        "Receipt not found for update",
                        level=logging.WARNING,
                        receipt_id=str(payload.receipt_id),
                    )
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Receipt not found.",
                    )

                if "store_name" in payload.model_fields_set and payload.store_name is not None:
                    receipt.store_name = payload.store_name
                if "invoice_number" in payload.model_fields_set:
                    receipt.invoice_number = payload.invoice_number
                if "receipt_date" in payload.model_fields_set and payload.receipt_date is not None:
                    receipt.receipt_date = payload.receipt_date
                if "city" in payload.model_fields_set:
                    receipt.city = payload.city
                if "state" in payload.model_fields_set:
                    receipt.state = payload.state
                if "scan_location" in payload.model_fields_set:
                    receipt.scan_location = payload.scan_location
                if "currency_code" in payload.model_fields_set and payload.currency_code is not None:
                    receipt.currency_code = payload.currency_code
                if "subtotal_amount" in payload.model_fields_set and payload.subtotal_amount is not None:
                    receipt.subtotal_amount = payload.subtotal_amount
                if (
                    "receipt_discount_total" in payload.model_fields_set
                    and payload.receipt_discount_total is not None
                ):
                    receipt.receipt_discount_total = payload.receipt_discount_total
                if "tax_amount" in payload.model_fields_set and payload.tax_amount is not None:
                    receipt.tax_amount = payload.tax_amount
                if "total_amount" in payload.model_fields_set and payload.total_amount is not None:
                    receipt.total_amount = payload.total_amount
                if (
                    "receipt_discounts" in payload.model_fields_set
                    and payload.receipt_discounts is not None
                ):
                    self._apply_receipt_discount_updates(
                        receipt=receipt,
                        discounts=[
                            ReceiptDiscountCreate.model_validate(discount.model_dump())
                            for discount in payload.receipt_discounts
                        ],
                    )
                if "items" in payload.model_fields_set and payload.items is not None:
                    self._apply_receipt_item_updates(
                        receipt=receipt,
                        items=[
                            ReceiptItemCreate.model_validate(item.model_dump())
                            for item in payload.items
                        ],
                    )

                session.commit()
                session.refresh(receipt)
        except IntegrityError as exc:
            log_caught_exception(
                logger,
                "Unable to update receipt record",
                receipt_id=str(payload.receipt_id),
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to update receipt with the provided data.",
            ) from exc

        response.status_code = status.HTTP_200_OK
        return {"receipt_id": str(payload.receipt_id)}
