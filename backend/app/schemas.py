from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models import ExchangeStatus, OrderStatus, PaymentMethod


class ProfileRead(BaseModel):
    id: str
    phone: str
    full_name: Optional[str] = None
    is_admin: bool = False

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class VariantRead(BaseModel):
    id: int
    size: str
    color: str
    stock_quantity: int
    price_delta: Decimal

    class Config:
        from_attributes = True


class ProductRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    base_price: Decimal
    image_url: Optional[str] = None
    variants: list[VariantRead] = []

    class Config:
        from_attributes = True


class TownshipRead(BaseModel):
    id: int
    name: str
    region: Optional[str] = None
    shipping_fee: Decimal
    supports_cod: bool

    class Config:
        from_attributes = True


class TownshipCreate(BaseModel):
    name: str
    region: Optional[str] = None
    shipping_fee: Decimal = Decimal("0.00")
    supports_cod: bool = True


class TownshipUpdate(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    shipping_fee: Optional[Decimal] = None
    supports_cod: Optional[bool] = None
    is_active: Optional[bool] = None


class OrderItemCreate(BaseModel):
    variant_id: int
    quantity: int = 1


class OrderCreate(BaseModel):
    township_id: int
    payment_method: PaymentMethod
    shipping_address: str
    phone: str
    items: list[OrderItemCreate]


class OrderItemRead(BaseModel):
    id: int
    variant_id: int
    quantity: int
    unit_price: Decimal

    class Config:
        from_attributes = True


class OrderRead(BaseModel):
    id: int
    status: OrderStatus
    payment_method: PaymentMethod
    subtotal: Decimal
    shipping_fee: Decimal
    total: Decimal
    shipping_address: Optional[str] = None
    phone: Optional[str] = None
    slip_url: Optional[str] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    items: list[OrderItemRead] = []

    class Config:
        from_attributes = True


class SlipVerificationRequest(BaseModel):
    approve: bool
    note: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: OrderStatus


class ExchangeCreate(BaseModel):
    order_item_id: int
    requested_size: Optional[str] = None
    reason: Optional[str] = None


class ExchangeResolveRequest(BaseModel):
    status: ExchangeStatus
    note: Optional[str] = None


class ExchangeRead(BaseModel):
    id: int
    order_id: int
    order_item_id: int
    requested_size: Optional[str] = None
    reason: Optional[str] = None
    status: ExchangeStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
