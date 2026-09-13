"""Conexão com o YouTube (OAuth de app instalado) e upload do short pela YouTube Data API v3.

Cota: cada upload custa 1.600 unidades de uma cota diária padrão de 10.000 (≈ 6 uploads/dia).
"""
from __future__ import annotations

import json
from pathlib import Path

from .config import MEDIA_DIR, YOUTUBE_TOKEN_PATH, resolve_path

SCOPES = ["https://www.googleapis.com/auth/youtube.upload",
          "https://www.googleapis.com/auth/youtube.readonly"]
UPLOAD_COST = 1600
DAILY_QUOTA = 10000

_channel_cache: dict = {}


def _load_creds():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    if not YOUTUBE_TOKEN_PATH.exists():
        return None
    creds = Credentials.from_authorized_user_file(str(YOUTUBE_TOKEN_PATH), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        YOUTUBE_TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
    return creds if creds and creds.valid else None


def conectar(settings: dict) -> dict:
    """Abre o navegador para autorizar o canal. Precisa do client_secret.json (Google Cloud Console)."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    secret = resolve_path(settings.get("youtube_client_secret_path") or "config/client_secret.json")
    if not secret.exists():
        raise RuntimeError(f"Não achei {secret.name} na pasta config/. Baixe do Google Cloud Console "
                           "(Credenciais → ID do cliente OAuth → tipo 'App para computador').")
    flow = InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES)
    creds = flow.run_local_server(port=0, open_browser=True, prompt="consent",
                                  authorization_prompt_message="")
    YOUTUBE_TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
    _channel_cache.clear()
    return status()


def desconectar() -> None:
    if YOUTUBE_TOKEN_PATH.exists():
        YOUTUBE_TOKEN_PATH.unlink()
    _channel_cache.clear()


def _service():
    from googleapiclient.discovery import build

    creds = _load_creds()
    if not creds:
        raise RuntimeError("YouTube não conectado. Vá em Ajustes → Conectar canal.")
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def status() -> dict:
    try:
        creds = _load_creds()
    except Exception as ex:  # token inválido/revogado
        return {"conectado": False, "erro": str(ex)[:200]}
    if not creds:
        return {"conectado": False}
    if "canal" in _channel_cache:
        return {"conectado": True, **_channel_cache["canal"]}
    try:
        resp = _service().channels().list(part="snippet", mine=True).execute()
        it = (resp.get("items") or [{}])[0]
        canal = {"canal_titulo": it.get("snippet", {}).get("title"),
                 "canal_handle": it.get("snippet", {}).get("customUrl"),
                 "canal_id": it.get("id")}
        _channel_cache["canal"] = canal
        return {"conectado": True, **canal}
    except Exception as ex:  # noqa: BLE001
        return {"conectado": True, "erro": str(ex)[:200]}


def publicar(pauta: dict, privacidade: str = "private", publicar_em: str | None = None,
             progress_cb=None) -> dict:
    """Envia o vídeo. Para agendar (publicar_em ISO 8601, ex: 2026-09-20T18:00:00-03:00) a privacidade
    precisa ser 'private' — o YouTube torna público sozinho na hora marcada."""
    from googleapiclient.http import MediaFileUpload

    if not pauta.get("video_path"):
        raise RuntimeError("Monte o vídeo antes de publicar.")
    video = MEDIA_DIR / pauta["video_path"]
    if not video.exists():
        raise RuntimeError("Arquivo de vídeo não encontrado. Monte o vídeo de novo.")

    tags = [t.strip() for t in (pauta.get("hashtags") or "").split(",") if t.strip()]
    titulo = (pauta.get("titulo") or pauta.get("titulo_original") or "GTA 6")[:100]
    if "#shorts" not in titulo.lower() and len(titulo) <= 92:
        titulo += " #Shorts"
    descricao = pauta.get("descricao") or ""
    if tags:
        descricao += "\n\n" + " ".join("#" + t.replace(" ", "") for t in tags)
    if pauta.get("link"):
        descricao += f"\n\nFonte: {pauta['link']}"

    body = {
        "snippet": {"title": titulo, "description": descricao[:5000], "tags": tags[:30],
                    "categoryId": "20", "defaultLanguage": "pt-BR"},
        "status": {"privacyStatus": privacidade, "selfDeclaredMadeForKids": False},
    }
    if publicar_em:
        body["status"]["privacyStatus"] = "private"
        body["status"]["publishAt"] = publicar_em

    media = MediaFileUpload(str(video), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
    req = _service().videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        st, resp = req.next_chunk()
        if st and progress_cb:
            progress_cb(int(st.progress() * 100))
    vid = resp["id"]
    return {"youtube_id": vid, "youtube_url": f"https://youtube.com/shorts/{vid}",
            "titulo_enviado": titulo, "agendado": bool(publicar_em)}
