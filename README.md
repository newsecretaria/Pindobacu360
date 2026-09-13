# Newsroom GTA VI — painel local de shorts de notícia

Redação de uma pessoa só: o radar lê as fontes, você escolhe a pauta, o Claude escreve o roteiro,
o ElevenLabs narra, o ffmpeg monta o short (manchete + selo da fonte + legendas sincronizadas) e o
painel envia pro seu canal do YouTube — sempre depois da sua aprovação.

Tudo roda no seu computador. Nada sobe pra nuvem além das chamadas às APIs que você configurar.

---

## 1. Instalar

**Precisa de:** Python 3.11+ e ffmpeg.

| Sistema | ffmpeg |
|---|---|
| Windows | `winget install Gyan.FFmpeg` (depois feche e reabra o terminal) |
| macOS | `brew install ffmpeg` |
| Ubuntu/Debian | `sudo apt install ffmpeg` |

**Rodar:**

- Windows: dê dois cliques em `run.bat`
- macOS/Linux: `./run.sh`

Na primeira vez ele cria o ambiente e instala as dependências. Depois abre o navegador em
**http://127.0.0.1:8787**. Feche a janela do terminal para parar.

---

## 2. APIs necessárias (e onde pegar)

| Serviço | Pra quê | Onde | Custo/limite |
|---|---|---|---|
| **Claude (Anthropic)** | escreve o roteiro, título, descrição e hashtags | console.anthropic.com → API Keys | centavos por roteiro |
| **ElevenLabs** | narração + tempos das palavras (legendas) | elevenlabs.io → Profile → API Keys; Voice ID em *Voices* | o plano grátis **não** libera uso comercial — precisa de plano pago |
| **YouTube Data API v3** | enviar o short pro canal | Google Cloud Console (passo a passo abaixo) | 10.000 unidades/dia; cada upload gasta 1.600 → **~6 uploads/dia** |
| **Telegram** (opcional) | avisar no celular quando sai coisa nova | @BotFather (token) + @userinfobot (chat id) | grátis |
| **Feeds RSS / YouTube** | o radar | nenhuma chave | grátis |

Cole as chaves em **Ajustes** dentro do painel. Elas ficam em `config/settings.json`, só no seu computador.

### YouTube — configurar o OAuth (uma vez só)

1. Acesse https://console.cloud.google.com e crie um projeto (ex: "Newsroom").
2. **APIs e serviços → Biblioteca** → procure **YouTube Data API v3** → Ativar.
3. **Tela de consentimento OAuth** → tipo *Externo* → preencha nome e e-mail → em *Usuários de teste* adicione o e-mail da conta dona do canal.
4. **Credenciais → Criar credenciais → ID do cliente OAuth** → tipo **App para computador** → baixe o JSON.
5. Salve o arquivo como `config/client_secret.json`.
6. No painel: **Ajustes → Conectar canal**. Abre o navegador, você autoriza, pronto.

> Enquanto o app estiver com status *Teste* no Google, a autorização expira a cada 7 dias — é só clicar em
> *Conectar canal* de novo. Para não expirar, mude a tela de consentimento para *Em produção*
> (para uso pessoal não precisa passar pela verificação; o Google só mostra um aviso na hora de autorizar).

---

## 3. Fluxo de uso

1. **Radar** — o painel lê as fontes a cada 15 min (ajustável). Verde = oficial, amarelo = imprensa, vermelho = comunidade.
2. **Virar pauta** — clique no item. Ele vai pro quadro de **Pautas**.
3. **Roteiro** — *Gerar com Claude*. Revise o texto: é você quem assina.
4. **Voz** — *Gerar narração*. Gera o mp3 e as legendas sincronizadas.
5. **Vídeo** — escolha um clipe/print da pasta `media/clips` (ou envie pelo painel) e clique em *Montar short*.
   Sem clipe, ele usa um fundo padrão. O áudio do clipe é descartado: só a sua narração entra.
6. **Publicar** — assista, marque *aprovado* e *Enviar ao YouTube* (privado, não listado, público ou agendado).

Pauta que não veio de fonte oficial entra com o selo **RUMOR** no vídeo e o roteiro é obrigado a citar a fonte.

---

## 4. Regras da casa (o que mantém o canal vivo)

- Trecho de trailer curto — poucos segundos — e o resto é seu (roteiro, narração, arte, legenda).
- Nunca use o áudio original do trailer. O Content ID identifica áudio mais fácil que imagem.
- Rumor é rumor: nada de "confirmado" no título quando a fonte não é a Rockstar/Take-Two.
- Nada sai sem revisão humana. O YouTube derruba canal de conteúdo "inautêntico" produzido em massa.
- Máximo ~6 uploads/dia pela cota padrão da API (dá pra pedir aumento no Google Cloud).

---

## 5. Estrutura

```
app.py                 servidor local (FastAPI) + rotas da API + radar automático
core/config.py         caminhos e settings.json
core/db.py             SQLite (fontes, itens do radar, pautas, uploads)
core/sources.py        leitura dos feeds, descoberta do channel_id do YouTube, filtro por palavra-chave
core/script.py         roteiro via API do Claude
core/tts.py            narração ElevenLabs + legendas .ass sincronizadas
core/video.py          overlay (Pillow) + montagem do short (ffmpeg)
core/youtube.py        OAuth + upload (YouTube Data API v3)
core/notify.py         Telegram
static/                painel (HTML/CSS/JS puro, sem build)
assets/fonts/          fontes livres (OFL) usadas no painel e nos vídeos
media/clips/           coloque aqui seus clipes e prints
media/audio|video|legendas|overlays   gerados pelo painel
config/                settings.json, client_secret.json, youtube_token.json, newsroom.db
```

API local documentada em http://127.0.0.1:8787/api/docs

---

## 6. Problemas comuns

- **"ffmpeg não encontrado"** — instale (tabela acima) e reabra o terminal antes de rodar de novo.
- **Fonte com erro 403** — o site bloqueia leitura automática. Desative ela; o Google News cobre o mesmo assunto.
- **Canal do YouTube não conecta** — confira se o e-mail está em *Usuários de teste* e se o arquivo é `config/client_secret.json`.
- **"Rumor" aparecendo em pauta oficial** — desmarque *Tratar como rumor* no editor antes de montar o vídeo.
- **Legendas não apareceram** — a API do ElevenLabs não devolveu os tempos; gere a voz de novo. O vídeo sai mesmo assim, só sem legenda.
