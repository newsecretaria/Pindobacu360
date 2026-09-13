# Pindobaçu Shorts

Sistema local que acompanha fontes de notícia, seleciona o que interessa a
Pindobaçu-BA e região, reescreve o conteúdo e gera um short vertical com o
cabeçalho do perfil **Pindobaçu Turismo (@pindobacu360)** — pronto para
aprovação e publicação no Instagram.

Implementa os itens 1 a 4 da ordem de implementação da especificação
(`ESPEC-pindobacu-shorts.md`): projeto base, coletor RSS com deduplicação,
curadoria com a API da Anthropic e o template de vídeo em Remotion com fila
de render.

## Como rodar

```bash
npm install
cp .env.example .env   # coloque sua ANTHROPIC_API_KEY
npm run dev            # sobe o painel em http://localhost:3000 + agendador
```

O agendador coleta a cada 15 minutos (configurável) e cura automaticamente
as notícias novas, desde que `ANTHROPIC_API_KEY` esteja definida. Sem a
chave, as notícias ficam paradas na aba "Novas" até você configurá-la.

### Comandos manuais

```bash
npm run coletar          # roda a coleta uma vez e imprime o resumo
npm run curar [limite]    # cura as noticias pendentes
npm run render <id>       # renderiza uma noticia aprovada manualmente
npm run exemplo           # cria uma noticia de exemplo ja curada (sem gastar API)
npm run typecheck         # checagem de tipos
```

### Renderizando sem baixar o Chrome do Remotion

Este ambiente já vem com Chromium pré-instalado. Se o `remotion render`
tentar baixar o navegador dele mesmo (erro de rede/allowlist), aponte para
um Chrome já instalado:

```bash
CHROME_EXECUTAVEL=/caminho/para/chrome npm run render <id>
```

No computador do Ricardo isso normalmente não é necessário — o Remotion
baixa o Chrome sozinho na primeira execução.

## Estrutura

Segue a seção 4 da especificação: `assets/` (logo, fundos por categoria,
músicas — fase 2), `dados/shorts.db` (SQLite, criado automaticamente),
`saida/` (vídeos e legendas prontos), `src/` (coletor, curadoria, vídeo,
painel).

## O que falta (fases seguintes)

- Item 5: caixa de entrada para colar link/texto de posts do Instagram
  (a aba já existe no config; o formulário do painel ainda não).
- Item 6: sites sem RSS (cheerio) e Instagram Business Discovery.
- Item 7 (fase 2): upload para AWS e publicação pela API do Instagram.

## Antes de usar de verdade

- Coloque o logo do @pindobacu360 (PNG transparente) em `assets/logo/`.
  Sem logo, entra uma barra na cor da notícia no lugar dele.
- Coloque fotos/vídeos da cidade em `assets/fundos/<categoria>/`. É a
  mudança que mais melhora o resultado: sem foto, o topo do vídeo é cor
  chapada.
- Ajuste as cores da marca em "Configurações" no painel (ou direto em
  `src/config.ts`). As atuais são provisórias.
- Revise a lista de portais/sites em "Configurações" — os que vêm no
  código são só exemplos.

## Sobre o desenho do vídeo

O template não é um fundo com texto por cima. A estrutura é uma divisão
editorial: foto em cima, campo de tinta embaixo, e o bloco da categoria
pousado exatamente na emenda entre os dois — é o elemento que faz o frame
ser reconhecível como deste perfil.

Decisões que valem saber antes de mexer:

- **Tipografia**: Archivo (Omnibus-Type, licença SIL OFL, incluída em
  `assets/fontes/`). É uma grotesca latino-americana feita para manchete e
  texto, com eixo de largura variável — a manchete usa a versão expandida
  preta, as frases a normal. O arquivo vai junto no repositório de
  propósito: sem ele o vídeo cai na fonte do sistema e perde a identidade.
- **Três cores, não dez**: cada categoria herda um tom que diz o tipo de
  notícia — ocre para o dia a dia, verde para serviço (saúde, educação,
  clima), vermelho para o que pede atenção (segurança, política).
- **Duotone nas fotos**: toda foto passa pelo mesmo tratamento na cor da
  notícia. Isso resolve um problema prático — as fotos vão ter luz e
  câmera muito diferentes entre si, e o tratamento faz o perfil ter uma
  cara só, além de garantir contraste com o texto.
- **O texto sobe de trás de uma máscara**, linha por linha, em vez de
  aparecer com opacidade. É o que separa uma peça animada de um template
  com fade.
- **A quebra de linha é decidida no código**, não pelo navegador, porque
  cada linha precisa ser um elemento próprio para a cascata funcionar. O
  corpo da letra diminui sozinho até caber na largura e na altura úteis.
