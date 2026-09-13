"""SQLite: fontes monitoradas, itens capturados pelo radar e pautas em produção."""
from __future__ import annotations

import sqlite3
import threading
from datetime import datetime, timezone

from .config import DB_PATH

_lock = threading.RLock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL DEFAULT 'rss',        -- rss | youtube
    tier TEXT NOT NULL DEFAULT 'imprensa',   -- oficial | imprensa | fa
    ativo INTEGER NOT NULL DEFAULT 1,
    filtrar INTEGER NOT NULL DEFAULT 1,      -- 1 = só guarda itens que batem nas palavras-chave
    channel_id TEXT,
    ultimo_fetch TEXT,
    ultimo_erro TEXT,
    ultimo_novos INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    source_nome TEXT NOT NULL,
    tier TEXT NOT NULL,
    titulo TEXT NOT NULL,
    link TEXT NOT NULL UNIQUE,
    resumo TEXT,
    thumb TEXT,
    publicado_em TEXT,
    capturado_em TEXT NOT NULL,
    arquivado INTEGER NOT NULL DEFAULT 0,
    pauta_id INTEGER
);

CREATE TABLE IF NOT EXISTS pautas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    titulo_original TEXT NOT NULL,
    link TEXT,
    source_nome TEXT,
    tier TEXT,
    resumo TEXT,
    status TEXT NOT NULL DEFAULT 'pauta',    -- pauta | roteiro | voz | video | aprovado | publicado
    roteiro TEXT,
    titulo TEXT,
    descricao TEXT,
    hashtags TEXT,
    eh_rumor INTEGER NOT NULL DEFAULT 0,
    fonte_citada TEXT,
    clip TEXT,
    audio_path TEXT,
    audio_duracao REAL,
    legenda_path TEXT,
    video_path TEXT,
    youtube_id TEXT,
    youtube_url TEXT,
    erro TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pauta_id INTEGER,
    youtube_id TEXT,
    enviado_em TEXT NOT NULL
);
"""

# Fontes iniciais. Se alguma der erro, aparece na aba Fontes — é só corrigir a URL por lá.
SEED_SOURCES = [
    # ---- Primeira mão (oficial) ----
    ("Rockstar Newswire", "https://www.rockstargames.com/newswire.rss", "rss", "oficial", 0),
    ("Rockstar Games (YouTube)", "https://www.youtube.com/@rockstargames", "youtube", "oficial", 0),
    ("PlayStation (YouTube)", "https://www.youtube.com/@PlayStation", "youtube", "oficial", 1),
    ("Xbox (YouTube)", "https://www.youtube.com/@xbox", "youtube", "oficial", 1),
    # ---- Imprensa / jornalistas ----
    ("Google News · GTA 6 (pt-BR)",
     "https://news.google.com/rss/search?q=%22GTA+6%22+OR+%22GTA+VI%22&hl=pt-BR&gl=BR&ceid=BR:pt-419",
     "rss", "imprensa", 0),
    ("Google News · GTA 6 (inglês)",
     "https://news.google.com/rss/search?q=%22GTA+6%22+OR+%22GTA+VI%22&hl=en-US&gl=US&ceid=US:en",
     "rss", "imprensa", 0),
    ("Google News · Take-Two",
     "https://news.google.com/rss/search?q=%22Take-Two+Interactive%22&hl=en-US&gl=US&ceid=US:en",
     "rss", "imprensa", 1),
    ("Insider Gaming", "https://insider-gaming.com/feed/", "rss", "imprensa", 1),
    # ---- Sites de fã / comunidade (tratar como rumor) ----
    ("GTAVice.net", "https://www.gtavice.net/feed/", "rss", "fa", 0),
    ("Rockstar Intel", "https://rockstarintel.com/feed/", "rss", "fa", 1),
    ("Reddit r/GTA6", "https://www.reddit.com/r/GTA6/.rss", "rss", "fa", 0),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=30)
    con.row_factory = sqlite3.Row
    return con


def init_db() -> None:
    with _lock, connect() as con:
        con.executescript(SCHEMA)
        n = con.execute("SELECT COUNT(*) FROM sources").fetchone()[0]
        if n == 0:
            con.executemany(
                "INSERT OR IGNORE INTO sources (nome, url, tipo, tier, filtrar) VALUES (?,?,?,?,?)",
                SEED_SOURCES,
            )


def rows(cur) -> list[dict]:
    return [dict(r) for r in cur.fetchall()]


def row(cur) -> dict | None:
    r = cur.fetchone()
    return dict(r) if r else None


# ---------- sources ----------
def list_sources() -> list[dict]:
    with _lock, connect() as con:
        return rows(con.execute("SELECT * FROM sources ORDER BY tier, id"))


def get_source(sid: int) -> dict | None:
    with _lock, connect() as con:
        return row(con.execute("SELECT * FROM sources WHERE id=?", (sid,)))


def add_source(nome: str, url: str, tipo: str, tier: str, filtrar: int = 1) -> dict:
    with _lock, connect() as con:
        cur = con.execute(
            "INSERT INTO sources (nome, url, tipo, tier, filtrar) VALUES (?,?,?,?,?)",
            (nome, url, tipo, tier, filtrar),
        )
        sid = cur.lastrowid
    return get_source(sid)


def update_source(sid: int, **fields) -> dict | None:
    if not fields:
        return get_source(sid)
    cols = ", ".join(f"{k}=?" for k in fields)
    with _lock, connect() as con:
        con.execute(f"UPDATE sources SET {cols} WHERE id=?", (*fields.values(), sid))
    return get_source(sid)


def delete_source(sid: int) -> None:
    with _lock, connect() as con:
        con.execute("DELETE FROM sources WHERE id=?", (sid,))


# ---------- items ----------
def insert_item(**it) -> bool:
    """Retorna True se o item era novo."""
    with _lock, connect() as con:
        cur = con.execute(
            """INSERT OR IGNORE INTO items
               (source_id, source_nome, tier, titulo, link, resumo, thumb, publicado_em, capturado_em)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (it["source_id"], it["source_nome"], it["tier"], it["titulo"], it["link"],
             it.get("resumo"), it.get("thumb"), it.get("publicado_em"), now_iso()),
        )
        return cur.rowcount == 1


def list_items(tier: str | None = None, q: str | None = None, limit: int = 300,
               incluir_arquivados: bool = False) -> list[dict]:
    sql = "SELECT * FROM items WHERE 1=1"
    args: list = []
    if not incluir_arquivados:
        sql += " AND arquivado=0"
    if tier:
        sql += " AND tier=?"
        args.append(tier)
    if q:
        sql += " AND (titulo LIKE ? OR resumo LIKE ?)"
        args += [f"%{q}%", f"%{q}%"]
    sql += " ORDER BY COALESCE(publicado_em, capturado_em) DESC LIMIT ?"
    args.append(limit)
    with _lock, connect() as con:
        return rows(con.execute(sql, args))


def get_item(iid: int) -> dict | None:
    with _lock, connect() as con:
        return row(con.execute("SELECT * FROM items WHERE id=?", (iid,)))


def update_item(iid: int, **fields) -> None:
    cols = ", ".join(f"{k}=?" for k in fields)
    with _lock, connect() as con:
        con.execute(f"UPDATE items SET {cols} WHERE id=?", (*fields.values(), iid))


# ---------- pautas ----------
def create_pauta(item: dict | None = None, **manual) -> dict:
    ts = now_iso()
    if item:
        data = dict(
            item_id=item["id"], titulo_original=item["titulo"], link=item["link"],
            source_nome=item["source_nome"], tier=item["tier"], resumo=item.get("resumo"),
            eh_rumor=0 if item["tier"] == "oficial" else 1,
        )
    else:
        data = dict(
            item_id=None, titulo_original=manual.get("titulo_original", "Pauta manual"),
            link=manual.get("link"), source_nome=manual.get("source_nome", "Manual"),
            tier=manual.get("tier", "imprensa"), resumo=manual.get("resumo"),
            eh_rumor=1 if manual.get("tier", "imprensa") != "oficial" else 0,
        )
    with _lock, connect() as con:
        cur = con.execute(
            """INSERT INTO pautas (item_id, titulo_original, link, source_nome, tier, resumo, eh_rumor,
                                   status, criado_em, atualizado_em)
               VALUES (?,?,?,?,?,?,?,'pauta',?,?)""",
            (data["item_id"], data["titulo_original"], data["link"], data["source_nome"],
             data["tier"], data["resumo"], data["eh_rumor"], ts, ts),
        )
        pid = cur.lastrowid
        if item:
            con.execute("UPDATE items SET pauta_id=? WHERE id=?", (pid, item["id"]))
    return get_pauta(pid)


def get_pauta(pid: int) -> dict | None:
    with _lock, connect() as con:
        return row(con.execute("SELECT * FROM pautas WHERE id=?", (pid,)))


def list_pautas() -> list[dict]:
    with _lock, connect() as con:
        return rows(con.execute("SELECT * FROM pautas ORDER BY atualizado_em DESC"))


def update_pauta(pid: int, **fields) -> dict | None:
    fields["atualizado_em"] = now_iso()
    cols = ", ".join(f"{k}=?" for k in fields)
    with _lock, connect() as con:
        con.execute(f"UPDATE pautas SET {cols} WHERE id=?", (*fields.values(), pid))
    return get_pauta(pid)


def delete_pauta(pid: int) -> None:
    with _lock, connect() as con:
        con.execute("UPDATE items SET pauta_id=NULL WHERE pauta_id=?", (pid,))
        con.execute("DELETE FROM pautas WHERE id=?", (pid,))


def count_by_status() -> dict:
    with _lock, connect() as con:
        out = {r["status"]: r["n"] for r in con.execute(
            "SELECT status, COUNT(*) n FROM pautas GROUP BY status").fetchall()}
        out["itens_novos"] = con.execute(
            "SELECT COUNT(*) FROM items WHERE arquivado=0 AND pauta_id IS NULL").fetchone()[0]
        return out


# ---------- uploads (controle da cota diária do YouTube) ----------
def register_upload(pauta_id: int, youtube_id: str) -> None:
    with _lock, connect() as con:
        con.execute("INSERT INTO uploads (pauta_id, youtube_id, enviado_em) VALUES (?,?,?)",
                    (pauta_id, youtube_id, now_iso()))


def uploads_hoje() -> int:
    # A cota do YouTube zera à meia-noite no horário do Pacífico (PT). Aproximação por data UTC-7.
    from datetime import timedelta
    inicio = (datetime.now(timezone.utc) - timedelta(hours=7)).replace(
        hour=0, minute=0, second=0, microsecond=0) + timedelta(hours=7)
    with _lock, connect() as con:
        return con.execute("SELECT COUNT(*) FROM uploads WHERE enviado_em >= ?",
                           (inicio.isoformat(timespec="seconds"),)).fetchone()[0]
