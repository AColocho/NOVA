from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile

from ..auth.dependencies import get_current_user
from ..auth.logic import AuthenticatedUser
from .logic import Logic
from .model import (ReceiptCreate, ReceiptDelete, ReceiptGet,
                    ReceiptMetadataWindow, ReceiptUpdate)

l = Logic()

router = APIRouter(prefix="/receipt", tags=["receipt"])


@router.post(
    path="/create_receipt",
    status_code=201,
    summary="Create a receipt manually",
    description=(
        "Create a new receipt with receipt-level metadata, ordered line items, and "
        "optional receipt-level or item-level discounts."
    ),
    response_description="The created receipt identifier.",
)
def create_receipt(
    receipt_create: ReceiptCreate,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Persist a new receipt from the request payload."""
    return l.create_receipt(
        payload=receipt_create,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.post(
    path="/create_receipt_from_scan",
    status_code=201,
    summary="Create a receipt from an uploaded scan file",
    description=(
        "Parse an uploaded receipt file with GPT, store the resulting receipt, and "
        "return the parsed receipt payload. Supported file types are PNG, JPEG, and PDF."
    ),
    response_description="The parsed receipt payload that was saved.",
    response_model=ReceiptCreate,
)
def create_receipt_from_scan(
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    file: UploadFile = File(...),
    scan_location: str | None = Form(default=None),
):
    """Parse an uploaded receipt scan, persist it, and return the parsed payload."""
    return l.create_receipt_from_scan(
        uploaded_file=file,
        scan_location=scan_location,
        response=response,
        home_id=current_user.home_id,
        user_id=current_user.user_id,
    )


@router.get(
    path="/get_metadata",
    status_code=200,
    summary="Get receipt metadata window",
    description=(
        "Return a paged window of receipt metadata for UI card views. "
        "Use `offset` and `limit` query parameters to control how many receipts are returned."
    ),
    response_description="A metadata window of receipts.",
)
def get_receipt_metadata(
    receipt_metadata_window: Annotated[ReceiptMetadataWindow, Depends()],
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Return a limited metadata-only receipt list for the UI."""
    return l.get_receipt_metadata(
        payload=receipt_metadata_window,
        response=response,
        home_id=current_user.home_id,
    )


@router.get(
    path="/get_receipt",
    status_code=200,
    summary="Get a full receipt",
    description=(
        "Return the full receipt payload for a single `receipt_id`, including ordered "
        "items and both receipt-level and item-level discounts."
    ),
    response_description="The full receipt record.",
)
def get_receipt(
    receipt_get: Annotated[ReceiptGet, Depends()],
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Return a single full receipt by identifier."""
    return l.get_receipt(
        payload=receipt_get,
        response=response,
        home_id=current_user.home_id,
    )


@router.delete(
    path="/delete_receipt",
    status_code=200,
    summary="Delete a receipt",
    description="Delete a receipt by its `receipt_id`.",
    response_description="The deleted receipt identifier.",
)
def delete_receipt(
    receipt_delete: ReceiptDelete,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Delete an existing receipt."""
    return l.delete_receipt(
        payload=receipt_delete,
        response=response,
        home_id=current_user.home_id,
    )


@router.put(
    path="/update_receipt",
    status_code=200,
    summary="Update a receipt",
    description=(
        "Update an existing receipt by `receipt_id`. Scalar fields are updated only when "
        "included in the payload. Items and discounts replace the current lists when provided."
    ),
    response_description="The updated receipt identifier.",
)
def update_receipt(
    receipt_update: ReceiptUpdate,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Apply a partial update to an existing receipt."""
    return l.update_receipt(
        payload=receipt_update,
        response=response,
        home_id=current_user.home_id,
    )
