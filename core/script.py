"""Roteiro do short (narração + título + descrição + hashtags) gerado pela API do Claude."""
from __future__ import annotations

import json
import re

import httpx

from .sources import UA, strip_html

_SYSTEM = """Você é redator de um canal brasileiro de notícias sobre GTA 6 no YouTube Shorts.
Escreva SEMPRE em português do Brasil, tom jornalístico e direto, sem gíria forçada.

Regras do roteiro (será narrado por voz sintética):
- Duração alvo: {dur} segundos (cerca de {palavras} palavras). Frases curtas, fáceis de narrar.
- Gancho na primeira frase: a informação mais forte primeiro. Nada de "fala galera" ou "você sabia".
- Use SOMENTE fatos presentes no material fornecido. Não invente números, datas ou declarações.
- Se o material NÃO for oficial (não veio da Rockstar / Take-Two / PlayStation / Xbox), trate como rumor:
  diga explicitamente "segundo <veículo/jornalista>" e nunca use "confirmado".
- Não descreva cenas de trailer nem cite músicas; foque no fato noticioso.
- Termine com esta chamada (pode adaptar levemente): "{cta}"
- Sem emojis, sem hashtags dentro do roteiro, sem marcações de cena.

Além do roteiro, gere:
- titulo: até 70 caracteres, forte, sem clickbait mentiroso. Se for rumor, o título deve deixar isso claro.
- descricao: 2 a 4 linhas, cita a fonte pelo nome e termina com #Shorts.
- hashtags: lista de 5 a 8 tags sem "#", ex: ["GTA6", "GTAVI", "Rockstar"].

Responda APENAS com um JSON válido, sem texto antes ou depois, sem cercas de código:
{{"roteiro": "...", "titulo": "...", "descricao": "...", "hashtags": ["..."], "eh_rumor": true/false, "fonte_citada": "nome da fonte"}}"""


def fetch_article_text(link: str, limit: int = 6000) -> str:
    """Baixa a página e devolve o texto cru (sem HTML). Para YouTube devolve vazio (usa o resumo)."""
    if not link or "youtube.com" in link or "youtu.be" in link:
        return ""
    try:
        r = httpx.get(link, headers={"User-Agent": UA}, follow_redirects=True, timeout=25)
        r.raise_for_status()
        t = re.sub(r"(?is)<(script|style|nav|footer|header|noscript)[^>]*>.*?</\1>", " ", r.text)
        return strip_html(t, limit)
    except Exception:
        return ""


def gerar_roteiro(pauta: dict, settings: dict) -> dict:
    api_key = settings.get("anthropic_api_key")
    if not api_key:
        raise RuntimeError("Falta a chave da API do Claude em Ajustes.")
    import anthropic  # importado aqui para o painel abrir mesmo sem o pacote configurado

    dur = int(settings.get("roteiro_duracao_seg") or 55)
    palavras = int(dur * 2.6)
    system = _SYSTEM.format(dur=dur, palavras=palavras, cta=settings.get("cta") or "")

    artigo = fetch_article_text(pauta.get("link") or "")
    tier_nome = {"oficial": "OFICIAL (primeira mão)", "imprensa": "IMPRENSA (segunda mão)",
                 "fa": "SITE DE FÃ / COMUNIDADE (rumor)"}.get(pauta.get("tier"), "DESCONHECIDA")
    material = (
        f"CLASSIFICAÇÃO DA FONTE: {tier_nome}\n"
        f"FONTE: {pauta.get('source_nome')}\n"
        f"TÍTULO ORIGINAL: {pauta.get('titulo_original')}\n"
        f"LINK: {pauta.get('link')}\n"
        f"RESUMO DO FEED: {pauta.get('resumo') or '(vazio)'}\n\n"
        f"TEXTO DA PÁGINA (pode conter ruído de menu/rodapé):\n{artigo or '(não disponível)'}"
    )

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=settings.get("claude_model") or "claude-sonnet-5",
        max_tokens=1500,
        system=system,
        messages=[{"role": "user", "content": material}],
    )
    texto = "".join(getattr(b, "text", "") for b in msg.content).strip()
    texto = re.sub(r"^```(?:json)?\s*|\s*```$", "", texto, flags=re.S)
    try:
        data = json.loads(texto)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", texto, flags=re.S)
        if not m:
            raise RuntimeError("O Claude não devolveu JSON válido. Tente gerar de novo.")
        data = json.loads(m.group(0))

    tags = data.get("hashtags") or []
    if isinstance(tags, str):
        tags = [t.strip("# ,") for t in re.split(r"[,\s]+", tags) if t.strip("# ,")]
    return {
        "roteiro": (data.get("roteiro") or "").strip(),
        "titulo": (data.get("titulo") or pauta.get("titulo_original") or "")[:100].strip(),
        "descricao": (data.get("descricao") or "").strip(),
        "hashtags": ", ".join(t.strip("# ") for t in tags),
        "eh_rumor": 1 if data.get("eh_rumor") else 0,
        "fonte_citada": (data.get("fonte_citada") or pauta.get("source_nome") or "").strip(),
    }
