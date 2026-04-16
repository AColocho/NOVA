import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import UUID as SQLUUID
from sqlalchemy import (Boolean, CheckConstraint, Date, DateTime, ForeignKey,
                        Integer, Numeric, String, Text, UniqueConstraint, event,
                        func, select)
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import (DeclarativeBase, Mapped, Session, mapped_column,
                            relationship)


class Base(DeclarativeBase):
    """Base SQLAlchemy declarative model."""


class Home(Base):
    __tablename__ = "homes"
    __table_args__ = {"schema": "auth"}

    id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    users: Mapped[list["UserAuth"]] = relationship(back_populates="home")
    recipes: Mapped[list["Recipe"]] = relationship(back_populates="home")
    receipts: Mapped[list["Receipt"]] = relationship(back_populates="home")


class UserAuth(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_auth_users_email"),
        {"schema": "auth"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    home_id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("auth.homes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_home_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    home: Mapped["Home"] = relationship(back_populates="users")
    created_recipes: Mapped[list["Recipe"]] = relationship(
        back_populates="created_by_user",
        foreign_keys="Recipe.created_by_user_id",
    )
    created_receipts: Mapped[list["Receipt"]] = relationship(
        back_populates="created_by_user",
        foreign_keys="Receipt.created_by_user_id",
    )


class Recipe(Base):
    __tablename__ = "recipes"
    __table_args__ = (
        CheckConstraint("prep_time >= 0", name="ck_recipes_prep_time_non_negative"),
        CheckConstraint("cook_time >= 0", name="ck_recipes_cook_time_non_negative"),
        CheckConstraint("servings > 0", name="ck_recipes_servings_positive"),
        {"schema": "recipe"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    home_id: Mapped[uuid.UUID | None] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("auth.homes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prep_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cook_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    servings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    ingredients: Mapped[list["Ingredient"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    home: Mapped["Home | None"] = relationship(back_populates="recipes")
    created_by_user: Mapped["UserAuth | None"] = relationship(
        back_populates="created_recipes",
        foreign_keys=[created_by_user_id],
    )
    steps: Mapped[list["Step"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        collection_class=ordering_list("step_number", count_from=1),
        passive_deletes=True,
        order_by="Step.step_number",
    )


class Ingredient(Base):
    __tablename__ = "ingredients"
    __table_args__ = {"schema": "recipe"}

    id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("recipe.recipes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[str | None] = mapped_column(String, nullable=True)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)

    recipe: Mapped["Recipe"] = relationship(back_populates="ingredients")


class Step(Base):
    __tablename__ = "steps"
    __table_args__ = (
        UniqueConstraint(
            "recipe_id",
            "step_number",
            name="uq_steps_recipe_id_step_number",
            deferrable=True,
            initially="DEFERRED",
        ),
        CheckConstraint("step_number > 0", name="ck_steps_step_number_positive"),
        {"schema": "recipe"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    recipe_id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("recipe.recipes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)

    recipe: Mapped["Recipe"] = relationship(back_populates="steps")


class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = (
        CheckConstraint(
            "subtotal_amount >= 0", name="ck_receipts_subtotal_amount_non_negative"
        ),
        CheckConstraint(
            "receipt_discount_total >= 0",
            name="ck_receipts_receipt_discount_total_non_negative",
        ),
        CheckConstraint("tax_amount >= 0", name="ck_receipts_tax_amount_non_negative"),
        CheckConstraint(
            "total_amount >= 0", name="ck_receipts_total_amount_non_negative"
        ),
        {"schema": "receipt"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    home_id: Mapped[uuid.UUID | None] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("auth.homes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    store_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    invoice_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True
    )
    receipt_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    scan_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    subtotal_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    receipt_discount_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    items: Mapped[list["ReceiptItem"]] = relationship(
        back_populates="receipt",
        cascade="all, delete-orphan",
        collection_class=ordering_list("line_number", count_from=1),
        passive_deletes=True,
        order_by="ReceiptItem.line_number",
    )
    discounts: Mapped[list["ReceiptDiscount"]] = relationship(
        back_populates="receipt",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    home: Mapped["Home | None"] = relationship(back_populates="receipts")
    created_by_user: Mapped["UserAuth | None"] = relationship(
        back_populates="created_receipts",
        foreign_keys=[created_by_user_id],
    )


class ReceiptItem(Base):
    __tablename__ = "receipt_items"
    __table_args__ = (
        UniqueConstraint(
            "receipt_id",
            "line_number",
            name="uq_receipt_items_receipt_id_line_number",
        ),
        CheckConstraint(
            "line_number > 0", name="ck_receipt_items_line_number_positive"
        ),
        CheckConstraint("quantity > 0", name="ck_receipt_items_quantity_positive"),
        CheckConstraint(
            "unit_price_amount IS NULL OR unit_price_amount >= 0",
            name="ck_receipt_items_unit_price_amount_non_negative",
        ),
        CheckConstraint(
            "gross_amount >= 0", name="ck_receipt_items_gross_amount_non_negative"
        ),
        CheckConstraint(
            "discount_amount >= 0",
            name="ck_receipt_items_discount_amount_non_negative",
        ),
        CheckConstraint(
            "total_amount >= 0", name="ck_receipt_items_total_amount_non_negative"
        ),
        {"schema": "receipt"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    receipt_id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("receipt.receipts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False, default=Decimal("1.000")
    )
    unit_price_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    gross_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )

    receipt: Mapped["Receipt"] = relationship(back_populates="items")
    discounts: Mapped[list["ReceiptDiscount"]] = relationship(
        back_populates="item",
        passive_deletes=True,
    )


class ReceiptDiscount(Base):
    __tablename__ = "receipt_discounts"
    __table_args__ = (
        CheckConstraint(
            "amount >= 0", name="ck_receipt_discounts_amount_non_negative"
        ),
        {"schema": "receipt"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    receipt_id: Mapped[uuid.UUID] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("receipt.receipts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    receipt_item_id: Mapped[uuid.UUID | None] = mapped_column(
        SQLUUID(as_uuid=True),
        ForeignKey("receipt.receipt_items.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )

    receipt: Mapped["Receipt"] = relationship(back_populates="discounts")
    item: Mapped["ReceiptItem | None"] = relationship(back_populates="discounts")


@event.listens_for(Session, "before_flush")
def _assign_receipt_item_line_numbers(
    session: Session, flush_context, instances
) -> None:
    """Assign the next line number within each receipt for new receipt items."""
    pending_items = [
        obj
        for obj in session.new
        if isinstance(obj, ReceiptItem) and obj.line_number is None
    ]
    if not pending_items:
        return

    next_line_by_group: dict[tuple[str, object], int] = {}

    for item in pending_items:
        if item.receipt is not None:
            group_key = ("receipt_obj", id(item.receipt))
            if group_key not in next_line_by_group:
                current_lines = [
                    existing_item.line_number or 0
                    for existing_item in item.receipt.items
                    if existing_item is not item
                ]
                next_line_by_group[group_key] = max(current_lines, default=0) + 1

            item.line_number = next_line_by_group[group_key]
            next_line_by_group[group_key] += 1
            continue

        group_key = ("receipt_id", item.receipt_id)
        if group_key not in next_line_by_group:
            current_max = session.execute(
                select(func.max(ReceiptItem.line_number)).where(
                    ReceiptItem.receipt_id == item.receipt_id
                )
            ).scalar_one()
            next_line_by_group[group_key] = (current_max or 0) + 1

        item.line_number = next_line_by_group[group_key]
        next_line_by_group[group_key] += 1
