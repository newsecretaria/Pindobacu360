"""Montagem do short (1080x1920): clipe ou fundo + manchete + narração + legendas, via ffmpeg."""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .config import CLIPS_DIR, FONTS_DIR, MEDIA_DIR, OVERLAY_DIR, VIDEO_DIR

W, H = 1080, 1920
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp"}
VID_EXT = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}

TIER_COLOR = {"oficial": (46, 211, 183), "imprensa": (245, 184, 74), "fa": (255, 79, 123)}
TIER_LABEL = {"oficial": "OFICIAL", "imprensa": "IMPRENSA", "fa": "COMUNIDADE"}
SUN = (255, 122, 61)
INK = (13, 17, 32)


def ffmpeg_ok() -> bool:
    return bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))


def audio_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return round(float(out), 2)


def _font(name: str, size: int) -> ImageFont.FreeTypeFont:
    candidates = [FONTS_DIR / name, Path("C:/Windows/Fonts/arialbd.ttf"),
                  Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
                  Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")]
    for c in candidates:
        if c.exists():
            return ImageFont.truetype(str(c), size)
    return ImageFont.load_default(size)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_w: int, max_lines: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = f"{cur} {w}".strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(".,;:") + "…"
    return lines


def _gradient(img: Image.Image, y0: int, y1: int, a0: int, a1: int) -> None:
    """Faixa vertical de preto com alpha indo de a0 (em y0) até a1 (em y1)."""
    px = img.load()
    for y in range(y0, y1):
        t = (y - y0) / max(1, (y1 - y0))
        a = int(a0 + (a1 - a0) * t)
        for x in range(W):
            px[x, y] = (8, 10, 20, a)


def _pill(draw, xy, text, font, bg, fg=(255, 255, 255), pad=(26, 14), radius=22):
    x, y = xy
    tw = draw.textlength(text, font=font)
    th = font.size
    box = (x, y, x + tw + pad[0] * 2, y + th + pad[1] * 2)
    draw.rounded_rectangle(box, radius=radius, fill=bg)
    draw.text((x + pad[0], y + pad[1] - 2), text, font=font, fill=fg)
    return box[2]


def make_overlay(pauta: dict, settings: dict) -> Path:
    """PNG transparente 1080x1920 com faixa de fonte, manchete e rodapé do canal."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    _gradient(img, 0, 700, 215, 0)
    _gradient(img, 1440, H, 0, 190)
    d = ImageDraw.Draw(img)

    tier = pauta.get("tier") or "imprensa"
    rumor = bool(pauta.get("eh_rumor"))
    label = "RUMOR" if rumor else TIER_LABEL.get(tier, "NOTÍCIA")
    color = TIER_COLOR["fa"] if rumor else TIER_COLOR.get(tier, SUN)

    f_badge = _font("BarlowCondensed-Bold.ttf", 40)
    f_head = _font("Anton-Regular.ttf", 92)
    f_foot = _font("BarlowCondensed-SemiBold.ttf", 46)

    x = 70
    x = _pill(d, (x, 150), label, f_badge, color, fg=INK) + 16
    fonte = (pauta.get("fonte_citada") or pauta.get("source_nome") or "").upper()[:34]
    if fonte:
        _pill(d, (x, 150), fonte, f_badge, (20, 24, 40, 235))

    manchete = (pauta.get("titulo") or pauta.get("titulo_original") or "").strip()
    lines = _wrap(d, manchete.upper(), f_head, W - 140, 4)
    y = 250
    for ln in lines:
        d.text((72, y + 4), ln, font=f_head, fill=(0, 0, 0, 160))  # sombra
        d.text((70, y), ln, font=f_head, fill=(255, 255, 255, 255))
        y += 104
    d.rectangle((70, y + 18, 70 + 180, y + 26), fill=color)

    handle = settings.get("canal_handle") or settings.get("canal_nome") or ""
    if handle and not handle.startswith("@"):
        handle = "@" + handle
    if handle:
        d.text((70, 1790), handle, font=f_foot, fill=(255, 255, 255, 235))
    tag = "#GTA6"
    d.text((W - 70 - d.textlength(tag, font=f_foot), 1790), tag, font=f_foot, fill=SUN)

    out = OVERLAY_DIR / f"pauta_{pauta['id']}.png"
    img.save(out)
    return out


def make_background() -> Path:
    """Fundo padrão (degradê noturno) para pautas sem clipe."""
    out = OVERLAY_DIR / "fundo_padrao.png"
    if out.exists():
        return out
    img = Image.new("RGB", (W, H), INK)
    px = img.load()
    top, bottom = (24, 30, 58), (56, 22, 48)
    for y in range(H):
        t = y / H
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = c
    d = ImageDraw.Draw(img)
    for i in range(-H, W, 140):  # listras diagonais sutis
        d.line([(i, H), (i + H, 0)], fill=(255, 255, 255, 255), width=1)
    img = Image.blend(img, Image.new("RGB", (W, H), INK), 0.55)
    img.save(out)
    return out


def listar_clips() -> list[dict]:
    out = []
    for p in sorted(CLIPS_DIR.iterdir()):
        if p.suffix.lower() in IMG_EXT | VID_EXT:
            out.append({"nome": p.name, "tipo": "imagem" if p.suffix.lower() in IMG_EXT else "video",
                        "tamanho_mb": round(p.stat().st_size / 1e6, 1)})
    return out


def montar_video(pauta: dict, settings: dict) -> dict:
    if not ffmpeg_ok():
        raise RuntimeError("ffmpeg não encontrado. Instale (veja README) e reabra o painel.")
    if not pauta.get("audio_path"):
        raise RuntimeError("Gere a narração antes de montar o vídeo.")
    audio = MEDIA_DIR / pauta["audio_path"]
    dur = float(pauta.get("audio_duracao") or audio_duration(audio))

    overlay = make_overlay(pauta, settings)
    clip = pauta.get("clip")
    if clip:
        src = CLIPS_DIR / clip
        if not src.exists():
            raise RuntimeError(f"Clipe não encontrado: {clip}")
        is_img = src.suffix.lower() in IMG_EXT
    else:
        src, is_img = make_background(), True

    rel = lambda p: str(Path(p).resolve().relative_to(MEDIA_DIR)).replace("\\", "/")  # noqa: E731
    out = VIDEO_DIR / f"pauta_{pauta['id']}.mp4"

    if is_img:
        inputs = ["-loop", "1", "-framerate", "30", "-i", rel(src)]
        # leve movimento (deriva) para a imagem não ficar parada
        bg = ("[0:v]scale=1240:2200:force_original_aspect_ratio=increase,"
              "crop=1080:1920:x='(iw-1080)/2+50*sin(t/7)':y='(ih-1920)/2+40*cos(t/9)',setsar=1,fps=30[bg]")
    else:
        inputs = ["-stream_loop", "-1", "-i", rel(src)]
        bg = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[bg]"

    chain = [bg, "[bg][2:v]overlay=0:0:format=auto[ov]"]
    last = "[ov]"
    if pauta.get("legenda_path") and (MEDIA_DIR / pauta["legenda_path"]).exists():
        # caminhos relativos ao diretório media/ (cwd do ffmpeg) — evita escapar "C:" no Windows
        chain.append(f"{last}subtitles={rel(MEDIA_DIR / pauta['legenda_path'])}:fontsdir=../assets/fonts[v]")
        last = "[v]"
    else:
        chain.append(f"{last}null[v]")
        last = "[v]"

    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           *inputs, "-i", rel(audio), "-i", rel(overlay),
           "-filter_complex", ";".join(chain),
           "-map", last, "-map", "1:a", "-t", f"{dur + 0.4:.2f}",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-movflags", "+faststart", rel(out)]
    proc = subprocess.run(cmd, cwd=MEDIA_DIR, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError("ffmpeg falhou: " + proc.stderr[-800:])
    return {"video_path": rel(out), "duracao": dur}
