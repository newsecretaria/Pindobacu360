/**
 * Configuracao unica do Pindobacu Shorts.
 * Tudo que o Ricardo costuma ajustar (fontes, regiao, cores, hashtags) fica aqui.
 * O painel, em "Configuracoes", le e grava este mesmo conteudo via dados/config.json.
 */

export type TipoFonte = "rss" | "site" | "instagram";

export type Fonte = {
  /** Nome curto que aparece no video ("Fonte: ...") e no painel */
  nome: string;
  tipo: TipoFonte;
  url: string;
  /** Só para tipo "site": seletor CSS da lista de materias (implementado no item 6) */
  seletor?: string;
  ativo: boolean;
};

export type Categoria =
  | "cidade"
  | "saude"
  | "educacao"
  | "clima"
  | "seguranca"
  | "esporte"
  | "cultura"
  | "politica"
  | "economia"
  | "geral";

export const CATEGORIAS: Categoria[] = [
  "cidade",
  "saude",
  "educacao",
  "clima",
  "seguranca",
  "esporte",
  "cultura",
  "politica",
  "economia",
  "geral",
];

export type Config = {
  perfil: {
    nome: string;
    arroba: string;
    url: string;
  };
  /**
   * Paleta da marca — terra e sol do Piemonte da Diamantina, não azul de
   * dark mode. Ricardo confirma os hex definitivos.
   */
  cores: {
    /** Preto quente de tinta — o campo onde o texto vive */
    tinta: string;
    /** Branco-osso do texto (mais suave que #FFF numa tela à noite) */
    osso: string;
    /** Cinza pedra, para texto secundário */
    pedra: string;
    /** Ocre de sol */
    sol: string;
    /** Verde de caatinga depois da chuva */
    serra: string;
    /** Vermelho de laterita */
    terra: string;
  };
  /**
   * Cada categoria herda um dos três tons de destaque. Não é enfeite: o tom
   * diz o tipo de notícia — sol é o dia a dia, serra é serviço, terra é
   * atenção. Três cores só, para o perfil manter uma cara reconhecível.
   */
  tomPorCategoria: Record<Categoria, "sol" | "serra" | "terra">;
  /**
   * Como a categoria aparece escrita no vídeo. As chaves são sem acento
   * (servem de identificador), mas na tela precisa sair acentuado — "SAUDE"
   * sem acento lê como erro de digitação para quem assiste.
   */
  rotulosCategoria: Record<Categoria, string>;
  fonteTipografica: {
    /** Arquivo em assets/fontes/ (opcional). Se existir, e carregado no video. */
    arquivo?: string;
    /** Pilha CSS usada no video (fallback quando nao ha arquivo local) */
    pilha: string;
  };
  regiao: {
    /** Cidade principal */
    principal: string;
    /** Cidades vizinhas consideradas "regiao" pela curadoria */
    cidades: string[];
    /** Assuntos de Bahia/Brasil que interessam mesmo sem citar a regiao */
    assuntosAmplos: string[];
  };
  hashtagsFixas: string[];
  hashtagsPorCategoria: Record<Categoria, string[]>;
  fontes: Fonte[];
  coleta: {
    /** Intervalo do agendador, em minutos */
    intervaloMinutos: number;
    /** Janela usada na deduplicacao por titulo parecido, em horas */
    janelaDuplicadasHoras: number;
    /** Quantos itens novos por fonte, no maximo, a cada coleta */
    maxPorFonte: number;
    /** Ignora materias publicadas ha mais de X horas */
    idadeMaximaHoras: number;
  };
  curadoria: {
    modelo: string;
    /** Limite de noticias curadas por rodada (controla custo de API) */
    maxPorRodada: number;
  };
  video: {
    largura: number;
    altura: number;
    fps: number;
    /** Segundos de cada tela de frase */
    segundosPorFrase: number;
    segundosAbertura: number;
    segundosManchete: number;
    segundosFechamento: number;
    /** Margens seguras do Instagram, em pixels */
    margemTopo: number;
    margemRodape: number;
    /**
     * Altura da foto, de 0 a 1. Abaixo dessa linha começa o campo de tinta
     * onde o texto vive — a emenda dura entre os dois é o eixo do layout.
     */
    emenda: number;
  };
};

export const configPadrao: Config = {
  perfil: {
    nome: "Pindobaçu Turismo",
    arroba: "@pindobacu360",
    url: "https://instagram.com/pindobacu360",
  },

  // Provisorias: terra, sol e caatinga. Ricardo troca pelos hex oficiais.
  cores: {
    tinta: "#16130F",
    osso: "#F4EFE6",
    pedra: "#8A8378",
    sol: "#E9A227",
    serra: "#2F5D45",
    terra: "#A8371D",
  },

  tomPorCategoria: {
    cidade: "sol",
    cultura: "sol",
    esporte: "sol",
    economia: "sol",
    geral: "sol",
    saude: "serra",
    educacao: "serra",
    clima: "serra",
    seguranca: "terra",
    politica: "terra",
  },

  rotulosCategoria: {
    cidade: "Cidade",
    saude: "Saúde",
    educacao: "Educação",
    clima: "Clima",
    seguranca: "Segurança",
    esporte: "Esporte",
    cultura: "Cultura",
    politica: "Política",
    economia: "Economia",
    geral: "Geral",
  },

  fonteTipografica: {
    // Archivo (Omnibus-Type, licenca SIL OFL): grotesca latino-americana
    // feita para manchete e texto, com eixo de largura variavel — a manchete
    // usa a versao expandida preta, as frases a normal.
    arquivo: "Archivo-Variable.woff2",
    pilha: '"Archivo", "Helvetica Neue", Arial, sans-serif',
  },

  regiao: {
    principal: "Pindobaçu",
    cidades: [
      "Pindobaçu",
      "Senhor do Bonfim",
      "Campo Formoso",
      "Filadélfia",
      "Antônio Gonçalves",
      "Saúde",
      "Andorinha",
      "Jaguarari",
      "Caldeirão Grande",
      "Ponto Novo",
      "Itiúba",
      "Umburanas",
    ],
    assuntosAmplos: [
      "clima e chuvas no semiárido baiano",
      "saúde pública e campanhas de vacinação",
      "concursos públicos e seleções na Bahia",
      "benefícios sociais (Bolsa Família, INSS, auxílios)",
      "estradas e rodovias que cortam a região (BA-131, BR-407, BR-324)",
      "educação, matrícula e programas estudantis",
      "energia, água e serviços públicos na Bahia",
    ],
  },

  hashtagsFixas: [
    "#pindobacu",
    "#pindobacu360",
    "#pindobacuturismo",
    "#bahia",
    "#noticias",
  ],

  hashtagsPorCategoria: {
    cidade: ["#cidade", "#pindobacuba", "#regiao"],
    saude: ["#saude", "#saudepublica", "#sus"],
    educacao: ["#educacao", "#escola", "#estudantes"],
    clima: ["#clima", "#chuva", "#previsaodotempo"],
    seguranca: ["#seguranca", "#policia", "#ocorrencia"],
    esporte: ["#esporte", "#futebol", "#atletas"],
    cultura: ["#cultura", "#tradicao", "#festa"],
    politica: ["#politica", "#prefeitura", "#camara"],
    economia: ["#economia", "#emprego", "#comercio"],
    geral: ["#noticia", "#informacao", "#regiao"],
  },

  // Ajuste/confirme as URLs antes de usar. Fonte que falha e apenas registrada no log.
  fontes: [
    {
      nome: "g1 Bahia",
      tipo: "rss",
      url: "https://g1.globo.com/rss/g1/bahia/",
      ativo: true,
    },
    {
      nome: "Agência Brasil",
      tipo: "rss",
      url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
      ativo: true,
    },
    // Exemplos desligados — troque pelos portais da regiao que o Ricardo acompanha:
    {
      nome: "Portal da região (exemplo)",
      tipo: "rss",
      url: "https://exemplo.com.br/feed/",
      ativo: false,
    },
    {
      nome: "Site sem RSS (exemplo)",
      tipo: "site",
      url: "https://exemplo.com.br/noticias",
      seletor: "article h2 a",
      ativo: false,
    },
    {
      nome: "Perfil de notícias (exemplo)",
      tipo: "instagram",
      url: "https://instagram.com/exemplo",
      ativo: false,
    },
  ],

  coleta: {
    intervaloMinutos: 15,
    janelaDuplicadasHoras: 48,
    maxPorFonte: 20,
    idadeMaximaHoras: 48,
  },

  curadoria: {
    // "Sonnet atual" da especificacao. Troque aqui se quiser outro modelo.
    modelo: process.env.MODELO_CURADORIA ?? "claude-sonnet-5",
    maxPorRodada: 12,
  },

  video: {
    largura: 1080,
    altura: 1920,
    fps: 30,
    segundosPorFrase: 3.5,
    segundosAbertura: 1.6,
    segundosManchete: 3.4,
    segundosFechamento: 2.5,
    margemTopo: 180,
    margemRodape: 350,
    emenda: 0.54,
  },
};
