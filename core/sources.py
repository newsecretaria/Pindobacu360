"""Radar de fontes: lê feeds RSS e canais do YouTube, filtra por palavras-chave e guarda no banco."""
from __future__ import annotations

import html
import re
import time
from datetime import datetime, timezone

import feedparser
import httpx

from . import db
from .config import load_settings
from .notify import send_telegram

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def strip_html(text: str | None, limit: int = 600) -> str:
    if not text:
        return ""
    t = html.unescape(_TAG_RE.sub(" ", text))
    t = _WS_RE.sub(" ", t).strip()
    return t[:limit]


def resolve_youtube_channel_id(url: str) -> str:
    """Descobre o channel_id (UC...) a partir da URL/handle do canal (não precisa de API key)."""
    m = re.search(r"(UC[0-9A-Za-z_-]{22})", url)
    if m:
        return m.group(1)
    r = httpx.get(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.8"},
                  follow_redirects=True, timeout=25)
    r.raise_for_status()
    for pat in (r'"channelId":"(UC[0-9A-Za-z_-]{22})"',
                r'"externalId":"(UC[0-9A-Za-z_-]{22})"',
                r'youtube\.com/channel/(UC[0-9A-Za-z_-]{22})'):
        m = re.search(pat, r.text)
        if m:
            return m.group(1)
    raise RuntimeError("Não achei o channel_id nessa página do YouTube.")


def feed_url_for(source: dict) -> tuple[str, str | None]:
    """Retorna (url_do_feed, channel_id_descoberto_ou_None)."""
    if source["tipo"] == "youtube":
        cid = source.get("channel_id") or resolve_youtube_channel_id(source["url"])
        return f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", cid
    return source["url"], None


def matches_keywords(text: str, keywords: list[str]) -> bool:
    t = text.lower()
    return any(k.lower() in t for k in keywords if k.strip())


def _entry_datetime(entry) -> str | None:
    for key in ("published_parsed", "updated_parsed"):
        st = entry.get(key)
        if st:
            try:
                return datetime(*st[:6], tzinfo=timezone.utc).isoformat(timespec="seconds")
            except Exception:
                pass
    return None


def _entry_thumb(entry) -> str | None:
    for key in ("media_thumbnail", "media_content"):
        v = entry.get(key)
        if isinstance(v, list) and v and isinstance(v[0], dict) and v[0].get("url"):
            return v[0]["url"]
    return None


def _entry_summary(entry) -> str:
    for key in ("media_description", "summary", "description"):
        v = entry.get(key)
        if v:
            return strip_html(v)
    # feeds do YouTube guardam a descrição em media_group
    mg = entry.get("media_group")
    if isinstance(mg, dict) and mg.get("media_description"):
        return strip_html(mg["media_description"])
    return ""


def fetch_source(source: dict, keywords: list[str]) -> tuple[int, list[dict]]:
    """Lê uma fonte. Retorna (qtd_novos, itens_novos)."""
    feed_url, cid = feed_url_for(source)
    if cid and cid != source.get("channel_id"):
        db.update_source(source["id"], channel_id=cid)

    r = httpx.get(feed_url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, */*"},
                  follow_redirects=True, timeout=30)
    r.raise_for_status()
    parsed = feedparser.parse(r.content)
    if parsed.bozo and not parsed.entries:
        raise RuntimeError(f"Feed inválido: {getattr(parsed, 'bozo_exception', 'sem entradas')}")

    novos: list[dict] = []
    for e in parsed.entries[:60]:
        titulo = strip_html(e.get("title"), 300)
        link = (e.get("link") or "").strip()
        if not titulo or not link:
            continue
        resumo = _entry_summary(e)
        if source["filtrar"] and not matches_keywords(f"{titulo} {resumo}", keywords):
            continue
        item = dict(
            source_id=source["id"], source_nome=source["nome"], tier=source["tier"],
            titulo=titulo, link=link, resumo=resumo, thumb=_entry_thumb(e),
            publicado_em=_entry_datetime(e),
        )
        if db.insert_item(**item):
            novos.append(item)
    return len(novos), novos


def refresh_all(only_source_id: int | None = None) -> dict:
    settings = load_settings()
    keywords = settings.get("keywords") or []
    total_novos = 0
    resumo_novos: list[dict] = []
    resultado = []
    for src in db.list_sources():
        if only_source_id and src["id"] != only_source_id:
            continue
        if not src["ativo"] and not only_source_id:
            continue
        try:
            n, novos = fetch_source(src, keywords)
            db.update_source(src["id"], ultimo_fetch=db.now_iso(), ultimo_erro=None, ultimo_novos=n)
            total_novos += n
            resumo_novos += novos
            resultado.append({"id": src["id"], "nome": src["nome"], "novos": n, "erro": None})
        except Exception as ex:  # noqa: BLE001
            msg = f"{type(ex).__name__}: {ex}".split(" For more information")[0][:300]
            db.update_source(src["id"], ultimo_fetch=db.now_iso(), ultimo_erro=msg)
            resultado.append({"id": src["id"], "nome": src["nome"], "novos": 0, "erro": msg})
        time.sleep(0.4)  # educação com os servidores

    if resumo_novos and settings.get("telegram_bot_token") and settings.get("telegram_chat_id"):
        linhas = [f"📰 {len(resumo_novos)} novidade(s) no radar GTA VI:"]
        for it in resumo_novos[:8]:
            tag = {"oficial": "🟢", "imprensa": "🟡", "fa": "🔴"}.get(it["tier"], "•")
            linhas.append(f"{tag} {it['source_nome']}: {it['titulo']}\n{it['link']}")
        try:
            send_telegram(settings["telegram_bot_token"], settings["telegram_chat_id"], "\n\n".join(linhas))
        except Exception:
            pass
    return {"novos": total_novos, "fontes": resultado}
