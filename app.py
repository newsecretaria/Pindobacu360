"""Newsroom GTA VI — painel local.

Rode:  python app.py   (ou run.bat / run.sh)   →   abre em http://127.0.0.1:8787
"""
from __future__ import annotations

import shutil
import threading
import time
import webbrowser
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core import db, script, sources, tts, video, youtube
from core.config import (ASSETS_DIR, CLIPS_DIR, MEDIA_DIR, STATIC_DIR, load_settings,
                         masked_settings, save_settings)

HOST, PORT = "127.0.0.1", 8787
app = FastAPI(title="Newsroom GTA VI", docs_url="/api/docs")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

_state = {"radar_rodando": False, "ultimo_radar": None, "ultimo_radar_novos": 0, "tarefas": {}}


def _err(ex: Exception, code: int = 400):
    return JSONResponse({"erro": f"{ex}"}, status_code=code)


# ------------------------------------------------------------------ páginas
@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


# ------------------------------------------------------------------ status
@app.get("/api/status")
def status():
    s = load_settings()
    return {
        "ffmpeg": video.ffmpeg_ok(),
        "claude": bool(s.get("anthropic_api_key")),
        "elevenlabs": bool(s.get("elevenlabs_api_key") and s.get("elevenlabs_voice_id")),
        "telegram": bool(s.get("telegram_bot_token") and s.get("telegram_chat_id")),
        "youtube": youtube.status(),
        "uploads_hoje": db.uploads_hoje(),
        "uploads_max_dia": youtube.DAILY_QUOTA // youtube.UPLOAD_COST,
        "contagem": db.count_by_status(),
        "radar": {"rodando": _state["radar_rodando"], "ultimo": _state["ultimo_radar"],
                  "ultimo_novos": _state["ultimo_radar_novos"],
                  "intervalo_min": s.get("intervalo_minutos")},
        "tarefas": _state["tarefas"],
    }


# ------------------------------------------------------------------ radar / itens
@app.get("/api/items")
def items(tier: Optional[str] = None, q: Optional[str] = None, arquivados: int = 0):
    return db.list_items(tier=tier or None, q=q or None, incluir_arquivados=bool(arquivados))


@app.post("/api/radar/refresh")
def radar_refresh(source_id: Optional[int] = None):
    if _state["radar_rodando"]:
        return {"ok": False, "mensagem": "O radar já está lendo as fontes."}
    return _rodar_radar(source_id)


def _rodar_radar(source_id: Optional[int] = None) -> dict:
    _state["radar_rodando"] = True
    try:
        r = sources.refresh_all(source_id)
        _state["ultimo_radar"] = db.now_iso()
        _state["ultimo_radar_novos"] = r["novos"]
        return {"ok": True, **r}
    finally:
        _state["radar_rodando"] = False


@app.post("/api/items/{iid}/pauta")
def item_virar_pauta(iid: int):
    it = db.get_item(iid)
    if not it:
        raise HTTPException(404, "Item não encontrado")
    if it.get("pauta_id"):
        return db.get_pauta(it["pauta_id"])
    return db.create_pauta(it)


@app.post("/api/items/{iid}/arquivar")
def item_arquivar(iid: int, desfazer: int = 0):
    db.update_item(iid, arquivado=0 if desfazer else 1)
    return {"ok": True}


# ------------------------------------------------------------------ fontes
class SourceIn(BaseModel):
    nome: str
    url: str
    tipo: str = "rss"      # rss | youtube
    tier: str = "imprensa"  # oficial | imprensa | fa
    filtrar: int = 1


class SourcePatch(BaseModel):
    nome: Optional[str] = None
    url: Optional[str] = None
    tipo: Optional[str] = None
    tier: Optional[str] = None
    ativo: Optional[int] = None
    filtrar: Optional[int] = None


@app.get("/api/sources")
def sources_list():
    return db.list_sources()


@app.post("/api/sources")
def sources_add(body: SourceIn):
    try:
        return db.add_source(body.nome.strip(), body.url.strip(), body.tipo, body.tier, body.filtrar)
    except Exception as ex:  # noqa: BLE001
        return _err(ex)


@app.patch("/api/sources/{sid}")
def sources_patch(sid: int, body: SourcePatch):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if "url" in fields or "tipo" in fields:
        fields["channel_id"] = None
    return db.update_source(sid, **fields)


@app.delete("/api/sources/{sid}")
def sources_delete(sid: int):
    db.delete_source(sid)
    return {"ok": True}


@app.post("/api/sources/{sid}/testar")
def sources_testar(sid: int):
    src = db.get_source(sid)
    if not src:
        raise HTTPException(404)
    try:
        n, novos = sources.fetch_source(src, load_settings().get("keywords") or [])
        db.update_source(sid, ultimo_fetch=db.now_iso(), ultimo_erro=None, ultimo_novos=n)
        return {"ok": True, "novos": n}
    except Exception as ex:  # noqa: BLE001
        msg = f"{type(ex).__name__}: {ex}".split(" For more information")[0][:300]
        db.update_source(sid, ultimo_fetch=db.now_iso(), ultimo_erro=msg)
        return {"ok": False, "erro": msg}


# ------------------------------------------------------------------ pautas
class PautaPatch(BaseModel):
    roteiro: Optional[str] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    hashtags: Optional[str] = None
    eh_rumor: Optional[int] = None
    fonte_citada: Optional[str] = None
    clip: Optional[str] = None
    status: Optional[str] = None


class PautaManual(BaseModel):
    titulo_original: str
    link: Optional[str] = None
    source_nome: str = "Manual"
    tier: str = "imprensa"
    resumo: Optional[str] = None


@app.get("/api/pautas")
def pautas_list():
    return db.list_pautas()


@app.post("/api/pautas")
def pautas_add(body: PautaManual):
    return db.create_pauta(None, **body.model_dump())


@app.get("/api/pautas/{pid}")
def pautas_get(pid: int):
    p = db.get_pauta(pid)
    if not p:
        raise HTTPException(404)
    return p


@app.patch("/api/pautas/{pid}")
def pautas_patch(pid: int, body: PautaPatch):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if "clip" in fields and fields["clip"] == "":
        fields["clip"] = None
    return db.update_pauta(pid, **fields)


@app.delete("/api/pautas/{pid}")
def pautas_delete(pid: int):
    db.delete_pauta(pid)
    return {"ok": True}


@app.post("/api/pautas/{pid}/roteiro")
def pautas_roteiro(pid: int):
    p = db.get_pauta(pid)
    if not p:
        raise HTTPException(404)
    try:
        r = script.gerar_roteiro(p, load_settings())
        return db.update_pauta(pid, **r, status="roteiro", erro=None)
    except Exception as ex:  # noqa: BLE001
        db.update_pauta(pid, erro=str(ex)[:400])
        return _err(ex)


@app.post("/api/pautas/{pid}/voz")
def pautas_voz(pid: int):
    p = db.get_pauta(pid)
    if not p:
        raise HTTPException(404)
    try:
        r = tts.gerar_voz(pid, p.get("roteiro") or "", load_settings())
        return db.update_pauta(pid, **r, status="voz", erro=None, video_path=None)
    except Exception as ex:  # noqa: BLE001
        db.update_pauta(pid, erro=str(ex)[:400])
        return _err(ex)


@app.post("/api/pautas/{pid}/video")
def pautas_video(pid: int):
    p = db.get_pauta(pid)
    if not p:
        raise HTTPException(404)
    try:
        r = video.montar_video(p, load_settings())
        return db.update_pauta(pid, video_path=r["video_path"], status="video", erro=None)
    except Exception as ex:  # noqa: BLE001
        db.update_pauta(pid, erro=str(ex)[:400])
        return _err(ex)


class PublicarIn(BaseModel):
    privacidade: str = "private"
    publicar_em: Optional[str] = None  # ISO 8601 com fuso, ex: 2026-09-20T18:00:00-03:00


@app.post("/api/pautas/{pid}/publicar")
def pautas_publicar(pid: int, body: PublicarIn):
    p = db.get_pauta(pid)
    if not p:
        raise HTTPException(404)
    try:
        _state["tarefas"][f"upload_{pid}"] = 0
        r = youtube.publicar(p, body.privacidade, body.publicar_em,
                             progress_cb=lambda pct: _state["tarefas"].__setitem__(f"upload_{pid}", pct))
        db.register_upload(pid, r["youtube_id"])
        return db.update_pauta(pid, youtube_id=r["youtube_id"], youtube_url=r["youtube_url"],
                               status="publicado", erro=None)
    except Exception as ex:  # noqa: BLE001
        db.update_pauta(pid, erro=str(ex)[:400])
        return _err(ex)
    finally:
        _state["tarefas"].pop(f"upload_{pid}", None)


# ------------------------------------------------------------------ clipes
@app.get("/api/clips")
def clips_list():
    return video.listar_clips()


@app.post("/api/clips")
def clips_upload(arquivo: UploadFile = File(...)):
    nome = Path(arquivo.filename or "clipe").name
    if Path(nome).suffix.lower() not in video.IMG_EXT | video.VID_EXT:
        raise HTTPException(400, "Envie um vídeo (mp4/mov/webm) ou imagem (png/jpg).")
    dest = CLIPS_DIR / nome
    with dest.open("wb") as f:
        shutil.copyfileobj(arquivo.file, f)
    return {"ok": True, "nome": nome}


@app.delete("/api/clips/{nome}")
def clips_delete(nome: str):
    p = CLIPS_DIR / Path(nome).name
    if p.exists():
        p.unlink()
    return {"ok": True}


# ------------------------------------------------------------------ ajustes
@app.get("/api/settings")
def settings_get():
    return masked_settings()


@app.put("/api/settings")
def settings_put(body: dict):
    if isinstance(body.get("keywords"), str):
        body["keywords"] = [k.strip() for k in body["keywords"].split(",") if k.strip()]
    save_settings(body)
    return masked_settings()


@app.get("/api/elevenlabs/vozes")
def elevenlabs_vozes():
    s = load_settings()
    try:
        return tts.listar_vozes(s.get("elevenlabs_api_key") or "")
    except Exception as ex:  # noqa: BLE001
        return _err(ex)


@app.post("/api/youtube/conectar")
def youtube_conectar():
    try:
        return youtube.conectar(load_settings())
    except Exception as ex:  # noqa: BLE001
        return _err(ex)


@app.post("/api/youtube/desconectar")
def youtube_desconectar():
    youtube.desconectar()
    return {"ok": True}


# ------------------------------------------------------------------ radar automático
def _scheduler():
    time.sleep(3)
    while True:
        try:
            if not _state["radar_rodando"]:
                _rodar_radar()
        except Exception:
            pass
        mins = int(load_settings().get("intervalo_minutos") or 15)
        time.sleep(max(3, mins) * 60)


from contextlib import asynccontextmanager


@asynccontextmanager
async def _lifespan(_app):
    db.init_db()
    threading.Thread(target=_scheduler, daemon=True, name="radar").start()
    yield


app.router.lifespan_context = _lifespan


if __name__ == "__main__":
    threading.Timer(1.5, lambda: webbrowser.open(f"http://{HOST}:{PORT}")).start()
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
