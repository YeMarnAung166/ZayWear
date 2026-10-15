from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class OrderStatus(str, Enum):
    pending = "pending"
    slip_uploaded = "slip_uploaded"
    pending_cod = "pending_cod"
    paid = "paid"
    dispatched = "dispatched"
    delivered = "delivered"
    cancelled = "cancelled"


class PaymentMethod(str, Enum):
    kbzpay = "kbzpay"
    wavepay = "wavepay"
    cod = "cod"


class ExchangeStatus(str, Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class Profile(SQLModel, table=True):
    id: str = Field(primary_key=True)
    phone: str = Field(index=True, unique=True)
    full_name: Optional[str] = None
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    base_price: Decimal = Field(max_digits=12, decimal_places=2)
    image_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    variants: list["ProductVariant"] = Relationship(back_populates="product")


class ProductVariant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="product.id")
    size: str
    color: str
    stock_quantity: int = 0
    price_delta: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    sku: Optional[str] = Field(default=None, index=True)

    product: Optional[Product] = Relationship(back_populates="variants")


class Township(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    region: Optional[str] = None
    shipping_fee: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    supports_cod: bool = True
    is_active: bool = True


class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="profile.id", index=True)
    township_id: Optional[int] = Field(default=None, foreign_key="township.id")
    status: OrderStatus = Field(default=OrderStatus.pending)
    payment_method: PaymentMethod = Field(default=PaymentMethod.kbzpay)
    subtotal: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    shipping_fee: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    total: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    shipping_address: Optional[str] = None
    phone: Optional[str] = None
    slip_url: Optional[str] = None
    slip_verified_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    items: list["OrderItem"] = Relationship(back_populates="order")


class OrderItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id")
    variant_id: int = Field(foreign_key="productvariant.id")
    quantity: int = 1
    unit_price: Decimal = Field(max_digits=12, decimal_places=2)

    order: Optional[Order] = Relationship(back_populates="items")


class ExchangeTicket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="order.id", index=True)
    order_item_id: int = Field(foreign_key="orderitem.id")
    requested_size: Optional[str] = None
    reason: Optional[str] = None
    status: ExchangeStatus = Field(default=ExchangeStatus.requested)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
