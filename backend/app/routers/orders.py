from decimal import Decimal

from fastapi import APIRouter, File, HTTPException, UploadFile
from sqlmodel import select

from app.dependencies import CurrentUserDep, SessionDep
from app.models import (
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    Product,
    ProductVariant,
    Township,
)
from app.schemas import OrderCreate, OrderRead
from app.services import storage, telegram
from app.services.pricing import compute_total

router = APIRouter(prefix="/orders", tags=["orders"])

ZERO = Decimal("0.00")


@router.get("", response_model=list[OrderRead])
def my_orders(user: CurrentUserDep, session: SessionDep) -> list[Order]:
    statement = (
        select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc())
    )
    return list(session.exec(statement).all())


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, user: CurrentUserDep, session: SessionDep) -> Order:
    order = session.get(Order, order_id)
    if order is None or (order.user_id != user.id and not user.is_admin):
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("", response_model=OrderRead, status_code=201)
def create_order(
    payload: OrderCreate,
    user: CurrentUserDep,
    session: SessionDep,
) -> Order:
    if not payload.items:
        raise HTTPException(status_code=422, detail="Order has no items")

    township = session.get(Township, payload.township_id)
    if township is None or not township.is_active:
        raise HTTPException(status_code=404, detail="Township not found")
    if payload.payment_method == PaymentMethod.cod and not township.supports_cod:
        raise HTTPException(
            status_code=422,
            detail="Cash on delivery is not available for this township",
        )

    order = Order(
        user_id=user.id,
        township_id=township.id,
        payment_method=payload.payment_method,
        shipping_address=payload.shipping_address,
        phone=payload.phone,
        shipping_fee=township.shipping_fee,
    )

    subtotal = ZERO
    for line in payload.items:
        if line.quantity < 1:
            raise HTTPException(status_code=422, detail="Quantity must be >= 1")

        variant = session.get(ProductVariant, line.variant_id)
        if variant is None:
            raise HTTPException(
                status_code=422,
                detail=f"Variant {line.variant_id} not found",
            )
        if variant.stock_quantity < line.quantity:
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient stock for variant {variant.id}",
            )

        product = session.get(Product, variant.product_id)
        unit_price = (product.base_price if product else ZERO) + variant.price_delta
        subtotal += unit_price * line.quantity

        variant.stock_quantity -= line.quantity
        session.add(variant)
        order.items.append(
            OrderItem(
                variant_id=variant.id,
                quantity=line.quantity,
                unit_price=unit_price,
            )
        )

    order.subtotal = subtotal
    order.total = compute_total(subtotal, township.shipping_fee)
    order.status = (
        OrderStatus.pending_cod
        if payload.payment_method == PaymentMethod.cod
        else OrderStatus.pending
    )

    session.add(order)
    session.commit()
    session.refresh(order)

    if order.status == OrderStatus.pending_cod:
        telegram.send_order_alert(order)

    return order


@router.post("/{order_id}/slip", response_model=OrderRead)
async def upload_slip(
    order_id: int,
    user: CurrentUserDep,
    session: SessionDep,
    file: UploadFile = File(...),
) -> Order:
    order = session.get(Order, order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_method == PaymentMethod.cod:
        raise HTTPException(
            status_code=409,
            detail="Cash-on-delivery orders do not require a slip",
        )
    if order.status not in (OrderStatus.pending, OrderStatus.slip_uploaded):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot upload a slip for a {order.status.value} order",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=422, detail="Empty file")
    if len(contents) > storage.MAX_SLIP_BYTES:
        raise HTTPException(status_code=413, detail="Slip exceeds 5MB limit")

    content_type = file.content_type or "application/octet-stream"
    if content_type not in storage.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Slip must be a JPEG, PNG, or WEBP image",
        )

    slip_url = storage.upload_slip(
        order_id,
        contents,
        content_type,
        file.filename or "slip.jpg",
    )
    order.slip_url = slip_url
    order.status = OrderStatus.slip_uploaded
    session.add(order)
    session.commit()
    session.refresh(order)

    telegram.send_order_alert(order)
    return order
