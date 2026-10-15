from fastapi import HTTPException, status

from app.models import OrderStatus

ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.pending: {
        OrderStatus.slip_uploaded,
        OrderStatus.pending_cod,
        OrderStatus.cancelled,
    },
    OrderStatus.slip_uploaded: {OrderStatus.paid, OrderStatus.cancelled},
    OrderStatus.pending_cod: {OrderStatus.paid, OrderStatus.cancelled},
    OrderStatus.paid: {OrderStatus.dispatched, OrderStatus.cancelled},
    OrderStatus.dispatched: {OrderStatus.delivered},
    OrderStatus.delivered: set(),
    OrderStatus.cancelled: set(),
}


def can_transition(current: OrderStatus, target: OrderStatus) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, set())


def assert_transition(current: OrderStatus, target: OrderStatus) -> None:
    if not can_transition(current, target):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Illegal order transition: {current.value} -> {target.value}",
        )
