/**
 * Props do componente <Short />. Tudo que o video precisa saber vem daqui —
 * o render nao le banco nem disco por conta propria.
 */
export type PropsShort = {
  manchete: string;
  frases: string[];
  categoria: string;
  fonte: string;
  /** Caminho do fundo relativo a pasta assets/ (ex.: "fundos/cidade/praca.jpg"). */
  fundoArquivo: string | null;
  /** Caminho do logo relativo a pasta assets/ (ex.: "logo/logo.png"). */
  logoArquivo: string | null;
  /** Caminho da fonte relativo a pasta assets/ (ex.: "fontes/Montserrat-Black.ttf"). */
  fonteArquivo: string | null;
  perfilNome: string;
  perfilArroba: string;
  cores: {
    primaria: string;
    secundaria: string;
    texto: string;
    fundoFaixa: string;
    destaque: string;
  };
  pilhaFonte: string;
  margemTopo: number;
  margemRodape: number;
  tempos: {
    abertura: number;
    manchete: number;
    porFrase: number;
    fechamento: number;
  };
};

export const propsExemplo: PropsShort = {
  manchete: "Chuva forte deixa ruas alagadas em Pindobaçu",
  frases: [
    "A chuva começou no fim da tarde e durou cerca de duas horas.",
    "A Defesa Civil pediu atenção de quem mora perto de encostas.",
    "Moradores relatam alagamento em ruas do centro da cidade.",
  ],
  categoria: "clima",
  fonte: "Portal de exemplo",
  fundoArquivo: null,
  logoArquivo: null,
  fonteArquivo: null,
  perfilNome: "Pindobaçu Turismo",
  perfilArroba: "@pindobacu360",
  cores: {
    primaria: "#0B6E4F",
    secundaria: "#0A2342",
    texto: "#FFFFFF",
    fundoFaixa: "#0B6E4F",
    destaque: "#F2C14E",
  },
  pilhaFonte:
    '"Montserrat", "Inter", "Arial Black", "Helvetica Neue", Arial, sans-serif',
  margemTopo: 180,
  margemRodape: 350,
  tempos: { abertura: 2, manchete: 3, porFrase: 3.5, fechamento: 2.5 },
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
