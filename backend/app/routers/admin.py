from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.dependencies import AdminUserDep, SessionDep
from app.models import ExchangeTicket, Order, OrderStatus
from app.schemas import ExchangeRead, OrderRead, SlipVerificationRequest, StatusUpdateRequest
from app.services import storage
from app.services.state_machine import assert_transition

router = APIRouter(prefix="/admin", tags=["admin"])


def _with_signed_slip(order: Order) -> OrderRead:
    data = OrderRead.model_validate(order)
    if order.slip_url:
        try:
            data.slip_url = storage.signed_slip_url(order.slip_url)
        except Exception:
            data.slip_url = order.slip_url
    return data


@router.get("/slips", response_model=list[OrderRead])
def verification_queue(session: SessionDep, _admin: AdminUserDep) -> list[OrderRead]:
    statement = select(Order).where(
        Order.status == OrderStatus.slip_uploaded,
        Order.slip_url.is_not(None),  # type: ignore[union-attr]
    )
    return [_with_signed_slip(o) for o in session.exec(statement).all()]


@router.post("/orders/{order_id}/verify", response_model=OrderRead)
def verify_slip(
    order_id: int,
    payload: SlipVerificationRequest,
    session: SessionDep,
    _admin: AdminUserDep,
) -> Order:
    order = session.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    target = OrderStatus.paid if payload.approve else OrderStatus.cancelled
    assert_transition(order.status, target)

    order.status = target
    order.slip_verified_at = datetime.now(timezone.utc) if payload.approve else None
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@router.get("/orders", response_model=list[OrderRead])
def all_orders(
    session: SessionDep,
    _admin: AdminUserDep,
    status: OrderStatus | None = None,
) -> list[Order]:
    statement = select(Order).order_by(Order.created_at.desc())
    if status is not None:
        statement = statement.where(Order.status == status)
    return list(session.exec(statement).all())


@router.get("/exchanges", response_model=list[ExchangeRead])
def all_exchanges(session: SessionDep, _admin: AdminUserDep) -> list[ExchangeTicket]:
    statement = select(ExchangeTicket).order_by(ExchangeTicket.created_at.desc())
    return list(session.exec(statement).all())


@router.patch("/orders/{order_id}/status", response_model=OrderRead)
def update_status(
    order_id: int,
    payload: StatusUpdateRequest,
    session: SessionDep,
    _admin: AdminUserDep,
) -> Order:
    order = session.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    assert_transition(order.status, payload.status)
    order.status = payload.status
    if payload.status == OrderStatus.delivered:
        order.delivered_at = datetime.now(timezone.utc)
    session.add(order)
    session.commit()
    session.refresh(order)
    return order
