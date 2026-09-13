/**
 * Props do componente <Short />. Tudo que o video precisa saber vem daqui —
 * o render nao le banco nem disco por conta propria.
 */
export type Paleta = {
  tinta: string;
  osso: string;
  pedra: string;
  sol: string;
  serra: string;
  terra: string;
};

export type PropsShort = {
  manchete: string;
  frases: string[];
  categoria: string;
  fonte: string;
  /** Caminho do fundo relativo a pasta assets/ (ex.: "fundos/cidade/praca.jpg"). */
  fundoArquivo: string | null;
  /** Caminho do logo relativo a pasta assets/ (ex.: "logo/logo.png"). */
  logoArquivo: string | null;
  /** Caminho da fonte relativo a pasta assets/ (ex.: "fontes/Archivo.woff2"). */
  fonteArquivo: string | null;
  perfilNome: string;
  perfilArroba: string;
  cores: Paleta;
  /** Cor de destaque desta noticia, ja resolvida a partir da categoria. */
  destaque: string;
  pilhaFonte: string;
  margemTopo: number;
  margemRodape: number;
  /** Altura da foto, de 0 a 1 */
  emenda: number;
  tempos: {
    abertura: number;
    manchete: number;
    porFrase: number;
    fechamento: number;
  };
};

export const propsExemplo: PropsShort = {
  manchete: "Mutirão de limpeza recolhe entulho em Pindobaçu",
  frases: [
    "O mutirão passou por cinco ruas do centro da cidade.",
    "As equipes recolheram entulho e lixo acumulado nas calçadas.",
    "O trabalho continua na próxima semana, agora nos bairros.",
  ],
  categoria: "cidade",
  fonte: "Portal de exemplo",
  fundoArquivo: null,
  logoArquivo: null,
  fonteArquivo: null,
  perfilNome: "Pindobaçu Turismo",
  perfilArroba: "@pindobacu360",
  cores: {
    tinta: "#16130F",
    osso: "#F4EFE6",
    pedra: "#8A8378",
    sol: "#E9A227",
    serra: "#2F5D45",
    terra: "#A8371D",
  },
  destaque: "#E9A227",
  pilhaFonte: '"Archivo", "Helvetica Neue", Arial, sans-serif',
  margemTopo: 180,
  margemRodape: 350,
  emenda: 0.54,
  tempos: { abertura: 1.6, manchete: 3.4, porFrase: 3.5, fechamento: 2.5 },
};

/** Duracao total em frames: abertura + manchete + uma tela por frase + fechamento. */
export function duracaoEmFrames(props: PropsShort, fps: number): number {
  const { tempos } = props;
  const segundos =
    tempos.abertura +
    tempos.manchete +
    Math.max(props.frases.length, 1) * tempos.porFrase +
    tempos.fechamento;
  return Math.round(segundos * fps);
}

/** Frame em que cada bloco comeca. */
export function marcacoes(props: PropsShort, fps: number) {
  const { tempos } = props;
  const abertura = 0;
  const manchete = Math.round(tempos.abertura * fps);
  const primeiraFrase = manchete + Math.round(tempos.manchete * fps);
  const duracaoFrase = Math.round(tempos.porFrase * fps);
  const fechamento =
    primeiraFrase + Math.max(props.frases.length, 1) * duracaoFrase;
  return {
    abertura,
    manchete,
    duracaoManchete: Math.round(tempos.manchete * fps),
    primeiraFrase,
    duracaoFrase,
    fechamento,
    duracaoFechamento: Math.round(tempos.fechamento * fps),
  };
}

/**
 * Quebra o texto em linhas. A quebra é decidida aqui, e não pelo navegador,
 * porque cada linha precisa ser um elemento próprio para a revelação em
 * cascata funcionar.
 */
export function quebrarEmLinhas(texto: string, maxCaracteres: number): string[] {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [];

  // Enche cada linha até o limite. Tentei distribuir o texto por igual entre
  // as linhas, mas isso gera uma linha a mais e obriga a diminuir o corpo da
  // manchete — num vídeo de celular, tamanho de letra vale mais do que
  // simetria de parágrafo.
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (atual && candidata.length > maxCaracteres) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = candidata;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/**
 * Largura média de um caractere, como fração do corpo da fonte. Serve para
 * escolher o tamanho sem medir no navegador — medir dentro do Remotion
 * exigiria segurar o render. Os valores foram medidos nos frames
 * renderizados, não chutados: a Archivo expandida preta em caixa alta é bem
 * mais larga do que uma grotesca normal.
 */
const LARGURA_CAIXA_ALTA = 0.84;
const LARGURA_CORRENTE = 0.52;

type Ajuste = { tamanho: number; linhas: string[]; alturaLinha: number };

function ajustar(
  texto: string,
  tamanhos: number[],
  fatorLargura: number,
  entrelinha: number,
  larguraUtil: number,
  alturaUtil: number,
  maxLinhas: number,
): Ajuste {
  let ultimo: Ajuste | null = null;
  let melhorQueCoube: Ajuste | null = null;

  for (const tamanho of tamanhos) {
    const maxCaracteres = Math.max(
      6,
      Math.floor(larguraUtil / (tamanho * fatorLargura)),
    );
    const linhas = quebrarEmLinhas(texto, maxCaracteres);
    const alturaLinha = tamanho * entrelinha;
    ultimo = { tamanho, linhas, alturaLinha };

    const cabeNaLargura = linhas.every((l) => l.length <= maxCaracteres);
    const cabeNaAltura = linhas.length * alturaLinha <= alturaUtil;
    // Muitas linhas de caixa alta viram um paredão: melhor diminuir o corpo.
    const temRitmo = linhas.length <= maxLinhas;

    if (cabeNaLargura && cabeNaAltura) {
      if (temRitmo) return ultimo;
      // Guarda o maior corpo que ao menos cabe: para um texto muito longo,
      // vale mais a letra grande com uma linha a mais do que despencar para
      // o menor corpo da lista.
      melhorQueCoube = melhorQueCoube ?? ultimo;
    }
  }
  return melhorQueCoube ?? ultimo!;
}

/**
 * Manchete: começa grande e vai diminuindo até caber na largura e na altura
 * disponíveis. Manchete curta ganha a tela inteira; manchete longa continua
 * dentro da margem segura em vez de vazar.
 */
export function ajustarManchete(
  texto: string,
  larguraUtil: number,
  alturaUtil: number,
): Ajuste {
  return ajustar(
    texto,
    [124, 112, 100, 90, 80, 72, 64, 56, 48],
    LARGURA_CAIXA_ALTA,
    0.94,
    larguraUtil,
    alturaUtil,
    4,
  );
}

/** Frases do resumo, mesma lógica com a fonte em caixa mista. */
export function ajustarFrase(
  texto: string,
  larguraUtil: number,
  alturaUtil: number,
): Ajuste {
  return ajustar(
    texto,
    [68, 62, 56, 50, 44, 40],
    LARGURA_CORRENTE,
    1.3,
    larguraUtil,
    alturaUtil,
    3,
  );
}

/**
 * Luminância relativa de um hex, para decidir se o texto por cima vai claro
 * ou escuro. Sem foto na pasta, o topo do frame vira a cor de destaque —
 * e sobre ocre a assinatura tem que virar tinta, não osso.
 */
export function ehClaro(hex: string): boolean {
  const limpo = hex.replace("#", "");
  if (limpo.length !== 6) return false;
  const r = parseInt(limpo.slice(0, 2), 16) / 255;
  const g = parseInt(limpo.slice(2, 4), 16) / 255;
  const b = parseInt(limpo.slice(4, 6), 16) / 255;
  const canal = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminancia =
    0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  return luminancia > 0.4;
}
