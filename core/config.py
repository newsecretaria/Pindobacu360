"""Configurações: caminhos do projeto e settings.json (chaves de API, palavras-chave etc.)."""
from __future__ import annotations

import json
import threading
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = BASE_DIR / "config"
MEDIA_DIR = BASE_DIR / "media"
CLIPS_DIR = MEDIA_DIR / "clips"
AUDIO_DIR = MEDIA_DIR / "audio"
VIDEO_DIR = MEDIA_DIR / "video"
OVERLAY_DIR = MEDIA_DIR / "overlays"
LEGENDA_DIR = MEDIA_DIR / "legendas"
ASSETS_DIR = BASE_DIR / "assets"
FONTS_DIR = ASSETS_DIR / "fonts"
STATIC_DIR = BASE_DIR / "static"
DB_PATH = CONFIG_DIR / "newsroom.db"
SETTINGS_PATH = CONFIG_DIR / "settings.json"
YOUTUBE_TOKEN_PATH = CONFIG_DIR / "youtube_token.json"

for d in (CONFIG_DIR, CLIPS_DIR, AUDIO_DIR, VIDEO_DIR, OVERLAY_DIR, LEGENDA_DIR):
    d.mkdir(parents=True, exist_ok=True)

DEFAULTS: dict = {
    # Claude (roteiro)
    "anthropic_api_key": "",
    "claude_model": "claude-sonnet-5",
    # ElevenLabs (narração)
    "elevenlabs_api_key": "",
    "elevenlabs_voice_id": "",
    "elevenlabs_model": "eleven_multilingual_v2",
    # YouTube
    "youtube_client_secret_path": "config/client_secret.json",
    "youtube_default_privacy": "private",  # private | unlisted | public
    # Canal
    "canal_nome": "",
    "canal_handle": "",
    "cta": "Segue o canal pra não perder nada de GTA 6.",
    "roteiro_duracao_seg": 55,
    # Radar
    "keywords": [
        "GTA 6", "GTA VI", "GTA6", "Grand Theft Auto VI", "Grand Theft Auto 6",
        "Rockstar", "Take-Two", "Vice City", "Leonida",
    ],
    "intervalo_minutos": 15,
    # Telegram (opcional)
    "telegram_bot_token": "",
    "telegram_chat_id": "",
}

SECRET_KEYS = ("anthropic_api_key", "elevenlabs_api_key", "telegram_bot_token")

_lock = threading.Lock()


def load_settings() -> dict:
    data = dict(DEFAULTS)
    if SETTINGS_PATH.exists():
        try:
            data.update(json.loads(SETTINGS_PATH.read_text(encoding="utf-8")))
        except Exception:
            pass
    return data


def save_settings(partial: dict) -> dict:
    """Atualiza só as chaves enviadas. Chaves secretas vazias não apagam o valor salvo."""
    with _lock:
        current = load_settings()
        for k, v in partial.items():
            if k not in DEFAULTS:
                continue
            if k in SECRET_KEYS and (v is None or str(v).strip() == "" or str(v).startswith("••")):
                continue
            current[k] = v
        SETTINGS_PATH.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")
        return current


def masked_settings() -> dict:
    data = load_settings()
    for k in SECRET_KEYS:
        v = data.get(k) or ""
        data[k] = ("••••••••" + v[-4:]) if len(v) > 4 else ""
    return data


def resolve_path(p: str) -> Path:
    path = Path(p)
    return path if path.is_absolute() else BASE_DIR / path
