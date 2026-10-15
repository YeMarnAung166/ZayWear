import logging

import httpx

from app.config import settings
from app.models import Order

logger = logging.getLogger("zaywear.telegram")


def _format_message(order: Order) -> str:
    lines = [
        f"[ZayWear] Order #{order.id} — {order.status.value}",
        f"Payment: {order.payment_method.value}",
        f"Total: {order.total} MMK",
    ]
    if order.phone:
        lines.append(f"Phone: {order.phone}")
    if order.shipping_address:
        lines.append(f"Address: {order.shipping_address}")
    return "\n".join(lines)


def send_order_alert(order: Order) -> None:
    """Fire-and-forget staff alert. Never raises into the request path."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        logger.warning("Telegram not configured; skipping alert for order %s", order.id)
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    try:
        response = httpx.post(
            url,
            json={"chat_id": settings.telegram_chat_id, "text": _format_message(order)},
            timeout=5.0,
        )
        response.raise_for_status()
    except Exception:  # noqa: BLE001 - alerts must not break orders
        logger.exception("Failed to send Telegram alert for order %s", order.id)
