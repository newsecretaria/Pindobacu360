"""Narração pelo ElevenLabs + legendas sincronizadas palavra a palavra (formato ASS, queimadas no vídeo)."""
from __future__ import annotations

import base64
from pathlib import Path

import httpx

from .config import AUDIO_DIR, LEGENDA_DIR

API = "https://api.elevenlabs.io/v1"

ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,Barlow Condensed SemiBold,84,&H00FFFFFF,&H000000FF,&H00141A2E,&H80000000,-1,0,0,0,100,100,1,0,1,5,0,2,60,60,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def _ass_time(t: float) -> str:
    t = max(0.0, t)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h:d}:{m:02d}:{s:05.2f}"


def alignment_to_words(alignment: dict) -> list[tuple[str, float, float]]:
    chars = alignment.get("characters") or []
    starts = alignment.get("character_start_times_seconds") or []
    ends = alignment.get("character_end_times_seconds") or []
    words: list[tuple[str, float, float]] = []
    buf, w_start, w_end = "", None, None
    for ch, st, en in zip(chars, starts, ends):
        if ch.isspace():
            if buf:
                words.append((buf, w_start, w_end))
            buf, w_start, w_end = "", None, None
            continue
        if not buf:
            w_start = st
        buf += ch
        w_end = en
    if buf:
        words.append((buf, w_start, w_end))
    return words


def words_to_ass(words: list[tuple[str, float, float]], max_words: int = 3, max_chars: int = 20) -> str:
    """Agrupa em blocos curtos (2-3 palavras), estilo legenda de Shorts."""
    linhas = [ASS_HEADER]
    bloco: list[tuple[str, float, float]] = []

    def flush():
        if not bloco:
            return
        texto = " ".join(w for w, _, _ in bloco).replace("{", "").replace("}", "")
        st, en = bloco[0][1], bloco[-1][2] + 0.05
        linhas.append(f"Dialogue: 0,{_ass_time(st)},{_ass_time(en)},Legenda,,0,0,0,,{texto}\n")

    for w in words:
        atual = " ".join(x for x, _, _ in bloco)
        if bloco and (len(bloco) >= max_words or len(atual) + 1 + len(w[0]) > max_chars
                      or bloco[-1][0].endswith((".", "!", "?", ":"))):
            flush()
            bloco = []
        bloco.append(w)
    flush()
    return "".join(linhas)


def gerar_voz(pauta_id: int, texto: str, settings: dict) -> dict:
    api_key = settings.get("elevenlabs_api_key")
    voice = settings.get("elevenlabs_voice_id")
    if not api_key or not voice:
        raise RuntimeError("Falta a chave do ElevenLabs ou o Voice ID em Ajustes.")
    if not texto.strip():
        raise RuntimeError("O roteiro está vazio.")

    body = {
        "text": texto,
        "model_id": settings.get("elevenlabs_model") or "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.2, "use_speaker_boost": True},
    }
    headers = {"xi-api-key": api_key, "Content-Type": "application/json"}
    mp3 = AUDIO_DIR / f"pauta_{pauta_id}.mp3"
    ass = LEGENDA_DIR / f"pauta_{pauta_id}.ass"
    legenda_ok = False

    # 1) tenta com timestamps (áudio + alinhamento por caractere) para legendas sincronizadas
    r = httpx.post(f"{API}/text-to-speech/{voice}/with-timestamps", headers=headers, json=body,
                   params={"output_format": "mp3_44100_128"}, timeout=180)
    if r.status_code == 200:
        data = r.json()
        mp3.write_bytes(base64.b64decode(data["audio_base64"]))
        alignment = data.get("normalized_alignment") or data.get("alignment") or {}
        words = alignment_to_words(alignment)
        if words:
            ass.write_text(words_to_ass(words), encoding="utf-8")
            legenda_ok = True
    else:
        # 2) fallback: endpoint simples (só áudio, sem legenda)
        r2 = httpx.post(f"{API}/text-to-speech/{voice}", headers={**headers, "Accept": "audio/mpeg"},
                        json=body, params={"output_format": "mp3_44100_128"}, timeout=180)
        if r2.status_code != 200:
            raise RuntimeError(f"ElevenLabs respondeu {r2.status_code}: {r2.text[:300]}")
        mp3.write_bytes(r2.content)

    from .video import audio_duration
    return {
        "audio_path": mp3.relative_to(mp3.parents[1]).as_posix(),
        "legenda_path": ass.relative_to(ass.parents[1]).as_posix() if legenda_ok else None,
        "audio_duracao": audio_duration(mp3),
    }


def listar_vozes(api_key: str) -> list[dict]:
    r = httpx.get(f"{API}/voices", headers={"xi-api-key": api_key}, timeout=30)
    r.raise_for_status()
    return [{"voice_id": v["voice_id"], "name": v.get("name"), "labels": v.get("labels", {})}
            for v in r.json().get("voices", [])]
