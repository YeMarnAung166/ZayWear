"""Provision the Telegram staff-alert channel for ZayWear.

Bot creation is a manual step in Telegram:

1. Open a chat with @BotFather and send /newbot; copy the bot token.
2. Add the bot to the staff group (or start a DM with it) and post any message
   there so the update appears for discovery.
3. Run ``discover`` to print the chat id, then set TELEGRAM_CHAT_ID.

Usage (PowerShell)::

    $env:TELEGRAM_BOT_TOKEN = "123456:ABC..."
    python scripts/telegram_setup.py discover

    $env:TELEGRAM_CHAT_ID = "-1001234567890"
    python scripts/telegram_setup.py test
"""

from __future__ import annotations

import os
import sys

import httpx

API = "https://api.telegram.org"


def _token() -> str:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        sys.exit("TELEGRAM_BOT_TOKEN is not set.")
    return token


def discover() -> None:
    """List chat ids recently seen by the bot (via getUpdates)."""
    response = httpx.get(f"{API}/bot{_token()}/getUpdates", timeout=15)
    response.raise_for_status()
    updates = response.json().get("result", [])
    if not updates:
        sys.exit(
            "No updates found. Send a message in the target chat, then retry."
        )

    seen: dict[int, str] = {}
    for update in updates:
        message = update.get("message") or update.get("channel_post") or {}
        chat = message.get("chat", {})
        if "id" in chat:
            seen[chat["id"]] = (
                chat.get("title") or chat.get("username") or chat.get("type", "?")
            )

    print("Chat ids found:")
    for chat_id, label in seen.items():
        print(f"  {chat_id}  ({label})")
    print("\nSet TELEGRAM_CHAT_ID to the id for the staff chat.")


def test() -> None:
    """Send a test message to TELEGRAM_CHAT_ID."""
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not chat_id:
        sys.exit("TELEGRAM_CHAT_ID is not set.")

    response = httpx.post(
        f"{API}/bot{_token()}/sendMessage",
        json={"chat_id": chat_id, "text": "[ZayWear] Telegram alerts are wired up."},
        timeout=15,
    )
    response.raise_for_status()
    print("Test message sent successfully.")


def main(argv: list[str]) -> None:
    command = argv[1] if len(argv) > 1 else "discover"
    if command == "discover":
        discover()
    elif command == "test":
        test()
    else:
        sys.exit(f"Unknown command '{command}'. Use 'discover' or 'test'.")


if __name__ == "__main__":
    main(sys.argv)
