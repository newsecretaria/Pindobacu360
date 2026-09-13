"""Avisos no Telegram (opcional). Crie um bot no @BotFather e pegue seu chat_id no @userinfobot."""
from __future__ import annotations

import httpx


def send_telegram(token: str, chat_id: str, text: str) -> None:
    r = httpx.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": text[:4000], "disable_web_page_preview": True},
        timeout=20,
    )
    r.raise_for_status()
