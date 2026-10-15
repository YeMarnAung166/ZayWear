from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.models import OrderStatus
from app.services.pricing import compute_total
from app.services.state_machine import assert_transition, can_transition


def test_happy_path_transitions():
    assert can_transition(OrderStatus.pending, OrderStatus.slip_uploaded)
    assert can_transition(OrderStatus.slip_uploaded, OrderStatus.paid)
    assert can_transition(OrderStatus.paid, OrderStatus.dispatched)
    assert can_transition(OrderStatus.dispatched, OrderStatus.delivered)


def test_cod_path_transitions():
    assert can_transition(OrderStatus.pending, OrderStatus.pending_cod)
    assert can_transition(OrderStatus.pending_cod, OrderStatus.paid)


def test_illegal_transitions_rejected():
    assert not can_transition(OrderStatus.pending, OrderStatus.paid)
    assert not can_transition(OrderStatus.delivered, OrderStatus.paid)
    assert not can_transition(OrderStatus.cancelled, OrderStatus.paid)


def test_assert_transition_raises_conflict():
    with pytest.raises(HTTPException) as exc:
        assert_transition(OrderStatus.delivered, OrderStatus.dispatched)
    assert exc.value.status_code == 409


def test_total_is_sum_of_subtotal_and_shipping():
    assert compute_total(Decimal("85000.00"), Decimal("3000.00")) == Decimal("88000")


def test_total_rounds_half_up():
    assert compute_total(Decimal("100.50"), Decimal("0.00")) == Decimal("101")
