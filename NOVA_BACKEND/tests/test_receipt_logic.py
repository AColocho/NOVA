from datetime import date
from decimal import Decimal
from unittest import TestCase
from unittest.mock import Mock

from backend.db_management.internal import Receipt
from backend.receipt.logic import Logic
from backend.receipt.model import ReceiptItemCreate


class ReceiptLogicTests(TestCase):
    def test_replacing_items_flushes_deleted_rows_before_adding_new_items(self) -> None:
        receipt = Receipt(store_name="Example", receipt_date=date(2026, 6, 7))
        original_item = Logic._build_receipt_item(
            ReceiptItemCreate(
                item_name="Old",
                gross_amount=Decimal("1.00"),
                total_amount=Decimal("1.00"),
            ),
            receipt=receipt,
        )
        receipt.items.append(original_item)
        session = Mock()

        Logic._apply_receipt_item_updates(
            receipt=receipt,
            session=session,
            items=[
                ReceiptItemCreate(
                    item_name="New",
                    gross_amount=Decimal("2.00"),
                    total_amount=Decimal("2.00"),
                )
            ],
        )

        session.flush.assert_called_once()
        self.assertEqual([item.item_name for item in receipt.items], ["New"])
