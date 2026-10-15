from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from app.models import (
    Product,
    ProductVariant,
    Township,
)
from app.services import storage

PNG = b"\x89PNG\r\n\x1a\n" + b"fake-image-bytes"


@pytest.fixture()
def catalog(session) -> dict:
    product = Product(
        name="Linen Shirt",
        base_price=Decimal("15000.00"),
        image_url="http://example.com/shirt.jpg",
    )
    session.add(product)
    session.commit()
    session.refresh(product)

    variant = ProductVariant(
        product_id=product.id,
        size="M",
        color="Sand",
        stock_quantity=5,
        sku="LS-M-SAND",
    )
    township = Township(
        name="Hlaing",
        region="Yangon",
        shipping_fee=Decimal("3000.00"),
        supports_cod=True,
    )
    cod_off = Township(
        name="Remote",
        region="Chin",
        shipping_fee=Decimal("5000.00"),
        supports_cod=False,
    )
    for row in (variant, township, cod_off):
        session.add(row)
    session.commit()
    for row in (variant, township, cod_off):
        session.refresh(row)
    return {
        "product": product,
        "variant": variant,
        "township": township,
        "cod_off": cod_off,
    }


def _order_payload(catalog: dict, *, method: str = "kbzpay", qty: int = 2) -> dict:
    return {
        "township_id": catalog["township"].id,
        "payment_method": method,
        "shipping_address": "No. 1, Pyay Road, Yangon",
        "phone": "+959123456789",
        "items": [{"variant_id": catalog["variant"].id, "quantity": qty}],
    }


def test_full_order_lifecycle(client, session, catalog, monkeypatch):
    monkeypatch.setattr(storage, "upload_slip", lambda *a, **k: "slips/orders/1/slip.png")

    resp = client.post("/orders", json=_order_payload(catalog))
    assert resp.status_code == 201, resp.text
    order = resp.json()
    order_id = order["id"]
    item_id = order["items"][0]["id"]

    assert order["status"] == "pending"
    assert Decimal(str(order["subtotal"])) == Decimal("30000.00")
    assert Decimal(str(order["shipping_fee"])) == Decimal("3000.00")
    assert Decimal(str(order["total"])) == Decimal("33000.00")

    session.refresh(catalog["variant"])
    assert catalog["variant"].stock_quantity == 3

    resp = client.post(
        f"/orders/{order_id}/slip",
        files={"file": ("slip.png", PNG, "image/png")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "slip_uploaded"
    assert resp.json()["slip_url"] == "slips/orders/1/slip.png"

    resp = client.get("/admin/slips")
    assert resp.status_code == 200
    assert [o["id"] for o in resp.json()] == [order_id]

    resp = client.post(f"/admin/orders/{order_id}/verify", json={"approve": True})
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "paid"

    resp = client.patch(f"/admin/orders/{order_id}/status", json={"status": "dispatched"})
    assert resp.status_code == 200

    resp = client.patch(f"/admin/orders/{order_id}/status", json={"status": "delivered"})
    assert resp.status_code == 200
    assert resp.json()["delivered_at"] is not None

    resp = client.post(
        "/exchanges",
        json={"order_item_id": item_id, "requested_size": "L", "reason": "too small"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "requested"

    resp = client.patch(f"/exchanges/{resp.json()['id']}", json={"status": "approved"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


def test_illegal_transition_is_rejected(client, session, catalog):
    resp = client.post("/orders", json=_order_payload(catalog))
    order_id = resp.json()["id"]

    resp = client.patch(f"/admin/orders/{order_id}/status", json={"status": "delivered"})
    assert resp.status_code == 409
    assert "Illegal order transition" in resp.json()["detail"]


def test_insufficient_stock_rejected(client, session, catalog):
    resp = client.post("/orders", json=_order_payload(catalog, qty=99))
    assert resp.status_code == 422
    assert "Insufficient stock" in resp.json()["detail"]


def test_cod_flow_and_slip_rejected(client, session, catalog, monkeypatch):
    monkeypatch.setattr(storage, "upload_slip", lambda *a, **k: "unused")

    resp = client.post("/orders", json=_order_payload(catalog, method="cod"))
    assert resp.status_code == 201, resp.text
    order = resp.json()
    assert order["status"] == "pending_cod"

    resp = client.post(
        f"/orders/{order['id']}/slip",
        files={"file": ("slip.png", PNG, "image/png")},
    )
    assert resp.status_code == 409


def test_cod_unavailable_for_township(client, session, catalog):
    payload = _order_payload(catalog, method="cod")
    payload["township_id"] = catalog["cod_off"].id
    resp = client.post("/orders", json=payload)
    assert resp.status_code == 422


def test_exchange_window_enforced(client, session, catalog, monkeypatch):
    from datetime import timezone

    from app.models import Order

    monkeypatch.setattr(storage, "upload_slip", lambda *a, **k: "slips/x.png")

    resp = client.post("/orders", json=_order_payload(catalog))
    order_id = resp.json()["id"]
    client.post(f"/orders/{order_id}/slip", files={"file": ("s.png", PNG, "image/png")})
    client.post(f"/admin/orders/{order_id}/verify", json={"approve": True})
    client.patch(f"/admin/orders/{order_id}/status", json={"status": "dispatched"})
    client.patch(f"/admin/orders/{order_id}/status", json={"status": "delivered"})

    order = session.get(Order, order_id)
    order.delivered_at = datetime.now(timezone.utc) - timedelta(days=10)
    session.add(order)
    session.commit()

    item_id = resp.json()["items"][0]["id"]
    resp = client.post(
        "/exchanges",
        json={"order_item_id": item_id, "requested_size": "L"},
    )
    assert resp.status_code == 422
    assert "window" in resp.json()["detail"].lower()
