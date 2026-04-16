from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
CurrencyCode = Annotated[
    str, StringConstraints(strip_whitespace=True, to_upper=True, min_length=3, max_length=3)
]


class ReceiptDiscountCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: NonEmptyString
    amount: Decimal = Field(ge=0)


class ReceiptItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_name: NonEmptyString
    quantity: Decimal = Field(default=Decimal("1.000"), gt=0)
    unit_price_amount: Decimal | None = Field(default=None, ge=0)
    gross_amount: Decimal = Field(ge=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_amount: Decimal = Field(ge=0)
    discounts: list[ReceiptDiscountCreate] = Field(default_factory=list)


class _ReceiptDateMixin(BaseModel):
    @field_validator("receipt_date", mode="before", check_fields=False)
    @classmethod
    def _coerce_receipt_date(cls, value: object) -> object:
        """Accept datetime inputs and normalize them to a plain calendar date."""
        if value is None or isinstance(value, date) and not isinstance(value, datetime):
            return value

        if isinstance(value, datetime):
            return value.date()

        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
            except ValueError:
                return value

        return value


class ReceiptCreate(_ReceiptDateMixin):
    model_config = ConfigDict(extra="forbid")

    store_name: NonEmptyString
    invoice_number: str | None = Field(default=None, max_length=100)
    receipt_date: date
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    scan_location: str | None = Field(default=None, max_length=500)
    currency_code: CurrencyCode = "USD"
    subtotal_amount: Decimal = Field(ge=0)
    receipt_discount_total: Decimal = Field(default=Decimal("0.00"), ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_amount: Decimal = Field(ge=0)
    receipt_discounts: list[ReceiptDiscountCreate] = Field(default_factory=list)
    items: list[ReceiptItemCreate] = Field(min_length=1)


class ReceiptDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    receipt_id: UUID


class ReceiptDiscountUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: NonEmptyString
    amount: Decimal = Field(ge=0)


class ReceiptItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_name: NonEmptyString
    quantity: Decimal = Field(default=Decimal("1.000"), gt=0)
    unit_price_amount: Decimal | None = Field(default=None, ge=0)
    gross_amount: Decimal = Field(ge=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_amount: Decimal = Field(ge=0)
    discounts: list[ReceiptDiscountUpdate] = Field(default_factory=list)


class ReceiptUpdate(_ReceiptDateMixin):
    model_config = ConfigDict(extra="forbid")

    receipt_id: UUID
    store_name: NonEmptyString | None = None
    invoice_number: str | None = Field(default=None, max_length=100)
    receipt_date: date | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    scan_location: str | None = Field(default=None, max_length=500)
    currency_code: CurrencyCode | None = None
    subtotal_amount: Decimal | None = Field(default=None, ge=0)
    receipt_discount_total: Decimal | None = Field(default=None, ge=0)
    tax_amount: Decimal | None = Field(default=None, ge=0)
    total_amount: Decimal | None = Field(default=None, ge=0)
    receipt_discounts: list[ReceiptDiscountUpdate] | None = None
    items: list[ReceiptItemUpdate] | None = None


class ReceiptMetadataWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, gt=0, le=100)


class ReceiptGet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    receipt_id: UUID
