# Prompt para o ChatGPT — capa e borda dos Reels

> Como usar: abra o ChatGPT, **anexe prints** dos dois perfis de referência
> (a grade do perfil e 3 ou 4 Reels abertos de cada um) e cole o texto abaixo.
> Os links do Instagram não abrem para IA nenhuma — o perfil exige login, e
> sem os prints o ChatGPT vai inventar a descrição.
>
> Quando ele responder, me traga a **especificação escrita** (o item B da
> entrega). É com ela que eu implemento a capa no sistema.

---

Você é diretor de arte de um perfil de notícias locais. Preciso que você
analise duas referências e desenhe a **capa** e a **borda** dos Reels de um
terceiro perfil.

## O perfil

**Pindobaçu Turismo (@pindobacu360)** — publica notícias curtas em vídeo
para moradores de Pindobaçu, na Bahia, e das cidades vizinhas (Senhor do
Bonfim, Campo Formoso, Filadélfia, Jaguarari, Saúde, Andorinha). Região de
serra e caatinga, no Piemonte da Diamantina. O público assiste no celular,
quase sempre passando o dedo rápido pelo feed.

## Referências a analisar (nos prints anexados)

- @bahianoticias
- @augustourgente

Para cada um, me diga **o que você observa, não o que você acha bonito**:

1. Como é a grade do perfil: as capas seguem um padrão? Dá para reconhecer o
   perfil sem ler o nome?
2. Tipografia: com ou sem serifa, peso, largura, caixa alta ou mista,
   quantas linhas de manchete, onde a manchete fica no quadro.
3. Tratamento da foto: sangra na tela inteira, fica dentro de uma moldura,
   tem escurecimento, tem recorte de pessoa, tem tarja?
4. Cor: quantas cores aparecem, qual manda, como marcam notícia urgente.
5. Moldura e borda: existe? Que espessura, que cor, contínua ou só em parte
   do quadro? Tem faixa superior ou inferior fixa?
6. O que faz a capa continuar legível quando aparece do tamanho de uma
   miniatura na grade, com uns 3 cm de altura.

Termine a análise apontando **o que os dois têm em comum** — isso é a
convenção do gênero — e **onde eles se diferenciam**.

## O que já existe e não muda

O vídeo já está pronto e tem identidade definida. A capa e a borda precisam
conviver com isto, não brigar:

- Formato 1080 × 1920, de 15 a 25 segundos, texto animado e música, sem
  narração.
- Tipografia: **Archivo** (Omnibus-Type, licença SIL OFL). Manchete na
  versão expandida preta, caixa alta; texto corrido na normal.
- Paleta:
  - tinta `#16130F` (preto quente, campo onde o texto vive)
  - osso `#F4EFE6` (texto claro)
  - pedra `#8A8378` (texto secundário)
  - sol `#E9A227` (ocre)
  - serra `#2F5D45` (verde)
  - terra `#A8371D` (vermelho)
- A cor de destaque sai da categoria da notícia: **sol** para o dia a dia
  (cidade, cultura, esporte, economia), **serra** para serviço (saúde,
  educação, clima), **terra** para o que pede atenção (segurança, política).
- Estrutura do vídeo: foto em cima tratada em duotone na cor da notícia,
  campo de tinta embaixo com o texto, e um bloco com o nome da categoria
  pousado exatamente na emenda entre os dois.
- Margens seguras do Instagram: nada essencial nos 180 px do topo nem nos
  350 px do rodapé.

## Tarefa 1 — A capa

A capa é o quadro que aparece na grade do perfil e é a primeira coisa que a
pessoa vê. Regras duras:

- Arte de 1080 × 1920, **mas** o Instagram mostra só um recorte central dela
  na grade do perfil. A capa tem que funcionar nas duas leituras: inteira e
  cortada no centro. Diga explicitamente o que fica em cada área.
- Tem que ser legível em miniatura. Se a manchete não se lê a 3 cm de
  altura, a capa falhou.
- A manchete da notícia entra na capa (ela muda a cada post, então o desenho
  precisa aguentar manchete curta e manchete longa).
- Tem que dizer "@pindobacu360" sem depender de o leitor já conhecer o
  perfil.

## Tarefa 2 — A borda

Uma moldura que envolve o vídeo e acompanha todas as telas. Ela precisa:

- Marcar o perfil sem roubar espaço do texto (lembre das margens seguras).
- Funcionar com as três cores de categoria.
- Não virar enfeite: se não estiver dizendo nada, é melhor não existir.
  Se você concluir que a borda piora o resultado, diga isso e explique.

## Entrega

**A) Proposta visual** — gere a imagem da capa em 1080 × 1920, em três
versões, uma para cada cor de categoria (sol, serra, terra), usando esta
manchete de exemplo: "Mutirão de limpeza recolhe entulho em Pindobaçu".

**B) Especificação escrita** — a parte mais importante, porque é o que vai
virar código. Para cada elemento (faixa, manchete, bloco de categoria,
assinatura do perfil, borda, tratamento da foto), me dê:

- posição e tamanho em pixels, sobre a tela de 1080 × 1920
- cor em hexadecimal
- fonte, corpo em pixels, peso, largura, entrelinha e espaçamento
- o que acontece quando a manchete é curta e quando é longa

**C) Justificativa** — três frases, no máximo, ligando cada decisão ao que
você observou nas referências.

## Regras

- **Não copie a identidade das referências.** Estude a convenção do gênero
  (o que qualquer perfil de notícia faz para ser legível), não a marca
  delas: nada de reproduzir logo, nome, assinatura ou a combinação exata de
  cores de @bahianoticias ou @augustourgente. O resultado tem que poder
  aparecer ao lado dos dois sem ser confundido com nenhum.
- Não invente informação de notícia. Texto na arte é só o que vier da
  notícia.
- Não use foto tirada do site da notícia. As fotos são do próprio perfil.
- Se algum print estiver ilegível ou faltando, diga o que faltou em vez de
  preencher com suposição.
