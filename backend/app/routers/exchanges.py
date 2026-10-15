from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.config import settings
from app.dependencies import AdminUserDep, CurrentUserDep, SessionDep
from app.models import ExchangeStatus, ExchangeTicket, Order, OrderItem, OrderStatus
from app.schemas import ExchangeCreate, ExchangeRead, ExchangeResolveRequest

router = APIRouter(prefix="/exchanges", tags=["exchanges"])


@router.post("", response_model=ExchangeRead, status_code=201)
def open_exchange(
    payload: ExchangeCreate,
    user: CurrentUserDep,
    session: SessionDep,
) -> ExchangeTicket:
    item = session.get(OrderItem, payload.order_item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Order item not found")

    order = session.get(Order, item.order_id)
    if order is None or order.user_id != user.id:
        raise HTTPException(status_code=404, detail="Order item not found")

    if order.status != OrderStatus.delivered:
        raise HTTPException(
            status_code=422,
            detail="Exchanges are only available for delivered orders",
        )
    if order.delivered_at is None or datetime.now(timezone.utc) - order.delivered_at > timedelta(
        days=settings.exchange_window_days
    ):
        raise HTTPException(
            status_code=422,
            detail=f"Exchange window of {settings.exchange_window_days} days has passed",
        )

    ticket = ExchangeTicket(
        order_id=order.id,
        order_item_id=item.id,
        requested_size=payload.requested_size,
        reason=payload.reason,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


@router.get("", response_model=list[ExchangeRead])
def my_exchanges(user: CurrentUserDep, session: SessionDep) -> list[ExchangeTicket]:
    order_ids = list(
        session.exec(select(Order.id).where(Order.user_id == user.id)).all()
    )
    if not order_ids:
        return []
    statement = (
        select(ExchangeTicket)
        .where(ExchangeTicket.order_id.in_(order_ids))  # type: ignore[union-attr]
        .order_by(ExchangeTicket.created_at.desc())
    )
    return list(session.exec(statement).all())


@router.get("/{ticket_id}", response_model=ExchangeRead)
def get_exchange(
    ticket_id: int,
    user: CurrentUserDep,
    session: SessionDep,
) -> ExchangeTicket:
    ticket = session.get(ExchangeTicket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Exchange ticket not found")
    order = session.get(Order, ticket.order_id)
    if order is None or (order.user_id != user.id and not user.is_admin):
        raise HTTPException(status_code=404, detail="Exchange ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=ExchangeRead)
def resolve_exchange(
    ticket_id: int,
    payload: ExchangeResolveRequest,
    session: SessionDep,
    _admin: AdminUserDep,
) -> ExchangeTicket:
    ticket = session.get(ExchangeTicket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Exchange ticket not found")
    if payload.status == ExchangeStatus.requested:
        raise HTTPException(status_code=422, detail="Invalid resolution status")

    ticket.status = payload.status
    ticket.resolved_at = datetime.now(timezone.utc)
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket
