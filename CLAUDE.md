# CLAUDE.md — contexto do projeto para o Claude Code

## O que é
Painel local (roda em http://127.0.0.1:8787) que monitora fontes de notícia sobre GTA VI e produz
YouTube Shorts de notícia com revisão humana: radar → pauta → roteiro (Claude API) → narração
(ElevenLabs) → montagem (ffmpeg + Pillow) → upload (YouTube Data API v3).

Idioma do produto e do código de interface: **português do Brasil**. Comentários e nomes em PT-BR são bem-vindos.

## Como rodar
- `./run.sh` (mac/linux) ou `run.bat` (windows). Cria `.venv`, instala `requirements.txt`, sobe `app.py`.
- Dependência externa: `ffmpeg`/`ffprobe` no PATH.
- Sem chaves configuradas o painel abre normalmente; só as ações de roteiro/voz/publicar falham com mensagem clara.

## Arquitetura
- `app.py` — FastAPI, rotas em `/api/*`, serve `static/` (painel), `media/` (arquivos gerados) e `assets/`.
  Thread `radar` roda `sources.refresh_all()` a cada `intervalo_minutos`.
- `core/config.py` — caminhos; `settings.json` com defaults em `DEFAULTS`. Chaves secretas mascaradas no GET.
- `core/db.py` — SQLite puro (`config/newsroom.db`). Tabelas: `sources`, `items`, `pautas`, `uploads`.
  Status da pauta: `pauta → roteiro → voz → video → aprovado → publicado`.
- `core/sources.py` — feedparser + httpx. Fonte tipo `youtube` recebe a URL do canal e descobre o `channel_id`
  raspando a página (`resolve_youtube_channel_id`), depois lê `youtube.com/feeds/videos.xml?channel_id=`.
  `filtrar=1` → só guarda itens que batem em `keywords`.
- `core/script.py` — prompt em `_SYSTEM`; resposta em JSON (roteiro, titulo, descricao, hashtags, eh_rumor, fonte_citada).
- `core/tts.py` — `POST /v1/text-to-speech/{voice}/with-timestamps` → mp3 + alinhamento → `.ass` (PlayRes 1080x1920).
  Fallback para o endpoint sem timestamps (sem legenda).
- `core/video.py` — `make_overlay` gera PNG 1080x1920 (selo da fonte, manchete em Anton, rodapé);
  `montar_video` roda ffmpeg com `cwd=media/` e caminhos relativos (evita escapar `C:` no Windows).
  Clipe de vídeo faz loop até a duração do áudio; imagem ganha uma deriva leve. Áudio do clipe é descartado.
- `core/youtube.py` — OAuth de app instalado (`InstalledAppFlow.run_local_server`), token em `config/youtube_token.json`.
  Upload resumable, categoria 20 (Gaming), `#Shorts` no título. Agendamento = `privacyStatus=private` + `publishAt`.
- `static/app.js` — front sem framework. `api()` lança erro quando `!r.ok`; respostas `{ok:false, erro}` com 200 são tratadas pelo chamador.

## Convenções
- Caminhos de mídia no banco são relativos a `media/` (ex: `audio/pauta_3.mp3`).
- Toda ação longa é uma rota `POST` síncrona (`def`, roda no threadpool do FastAPI). O front mostra spinner.
- Erros de pipeline vão para `pautas.erro` e aparecem no card/editor.
- Nunca automatizar a publicação sem aprovação humana — é regra de produto, não limitação técnica.

## Ideias de evolução (não feitas)
- Fila de publicação com horários fixos (ex: 3 shorts/dia) respeitando a cota.
- Transcrever o vídeo-fonte (YouTube) para enriquecer o roteiro.
- Thumbnail/capa automática para o feed do canal.
- Exportar também para TikTok/Instagram (arquivo já sai em 1080x1920).
- Testes: `pytest` para `tts.words_to_ass`, `sources.matches_keywords`, `video.make_overlay`.
