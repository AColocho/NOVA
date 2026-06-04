from datetime import date
from decimal import Decimal
from unittest import TestCase

from backend.receipt.model import ReceiptCreate


class ReceiptCreateDateParsingTests(TestCase):
    def test_accepts_short_numeric_receipt_date(self) -> None:
        receipt = ReceiptCreate.model_validate(
            {
                "store_name": "Example Store",
                "receipt_date": "06/03/26",
                "subtotal_amount": Decimal("10.00"),
                "total_amount": Decimal("10.00"),
                "items": [
                    {
                        "item_name": "Example Item",
                        "gross_amount": Decimal("10.00"),
                        "total_amount": Decimal("10.00"),
                    }
                ],
            }
        )

        self.assertEqual(receipt.receipt_date, date(2026, 6, 3))

    def test_accepts_iso_receipt_datetime(self) -> None:
        receipt = ReceiptCreate.model_validate(
            {
                "store_name": "Example Store",
                "receipt_date": "2026-06-03T12:30:00Z",
                "subtotal_amount": Decimal("10.00"),
                "total_amount": Decimal("10.00"),
                "items": [
                    {
                        "item_name": "Example Item",
                        "gross_amount": Decimal("10.00"),
                        "total_amount": Decimal("10.00"),
                    }
                ],
            }
        )

        self.assertEqual(receipt.receipt_date, date(2026, 6, 3))
