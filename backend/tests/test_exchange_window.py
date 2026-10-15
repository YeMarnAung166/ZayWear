from datetime import datetime, timedelta

from app.config import settings


def _within_exchange_window(delivered_at: datetime, now: datetime) -> bool:
    return now - delivered_at <= timedelta(days=settings.exchange_window_days)


def test_exchange_window_boundary():
    delivered = datetime(2026, 1, 1, 12, 0, 0)
    on_time = delivered + timedelta(days=3)
    too_late = delivered + timedelta(days=3, seconds=1)

    assert _within_exchange_window(delivered, on_time)
    assert not _within_exchange_window(delivered, too_late)
