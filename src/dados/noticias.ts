import { db } from "./db";
import type { Categoria, TipoFonte } from "../config";
import { agoraISO, hashUrl, normalizarTitulo, semelhanca } from "../util/texto";

export type Status =
  | "novo"
  | "relevante"
  | "descartado"
  | "aprovado"
  | "renderizando"
  | "pronto"
  | "publicado"
  | "erro";

export const STATUS_VALIDOS: Status[] = [
  "novo",
  "relevante",
  "descartado",
  "aprovado",
  "renderizando",
  "pronto",
  "publicado",
  "erro",
];

/** Linha crua do banco (colunas em snake_case) */
type LinhaNoticia = {
  id: number;
  status: Status;
  fonte: string;
  fonte_tipo: TipoFonte | "caixa";
  titulo: string;
  titulo_norm: string;
  resumo: string;
  link: string;
  link_hash: string;
  imagem_url: string | null;
  publicado_em: string | null;
  coletado_em: string;
  curado_em: string | null;
  relevante: number | null;
  motivo_descarte: string | null;
  categoria: Categoria | null;
  urgencia: string | null;
  manchete: string | null;
  frases: string | null;
  legenda: string | null;
  fundo: string | null;
  verificar: number;
  verificar_motivo: string | null;
  curadoria_entrada: string | null;
  curadoria_saida: string | null;
  fundo_arquivo: string | null;
  video_arquivo: string | null;
  legenda_arquivo: string | null;
  render_iniciado_em: string | null;
  render_terminado_em: string | null;
  render_erro: string | null;
  publicado_instagram_em: string | null;
  editado_manualmente: number;
  atualizado_em: string;
};

/** Formato usado pela aplicacao e pela API (camelCase, tipos ja convertidos) */
export type Noticia = {
  id: number;
  status: Status;
  fonte: string;
  fonteTipo: TipoFonte | "caixa";
  titulo: string;
  resumo: string;
  link: string;
  imagemUrl: string | null;
  publicadoEm: string | null;
  coletadoEm: string;
  curadoEm: string | null;
  relevante: boolean | null;
  motivoDescarte: string | null;
  categoria: Categoria | null;
  urgencia: string | null;
  manchete: string | null;
  frases: string[];
  legenda: string | null;
  fundo: string | null;
  verificar: boolean;
  verificarMotivo: string | null;
  fundoArquivo: string | null;
  videoArquivo: string | null;
  legendaArquivo: string | null;
  renderErro: string | null;
  publicadoInstagramEm: string | null;
  editadoManualmente: boolean;
  atualizadoEm: string;
};

function paraNoticia(linha: LinhaNoticia): Noticia {
  let frases: string[] = [];
  if (linha.frases) {
    try {
      const lido = JSON.parse(linha.frases);
      if (Array.isArray(lido)) frases = lido.map((f) => String(f));
    } catch {
      frases = [];
    }
  }
  return {
    id: linha.id,
    status: linha.status,
    fonte: linha.fonte,
    fonteTipo: linha.fonte_tipo,
    titulo: linha.titulo,
    resumo: linha.resumo,
    link: linha.link,
    imagemUrl: linha.imagem_url,
    publicadoEm: linha.publicado_em,
    coletadoEm: linha.coletado_em,
    curadoEm: linha.curado_em,
    relevante:
      linha.relevante === null ? null : linha.relevante === 1 ? true : false,
    motivoDescarte: linha.motivo_descarte,
    categoria: linha.categoria,
    urgencia: linha.urgencia,
    manchete: linha.manchete,
    frases,
    legenda: linha.legenda,
    fundo: linha.fundo,
    verificar: linha.verificar === 1,
    verificarMotivo: linha.verificar_motivo,
    fundoArquivo: linha.fundo_arquivo,
    videoArquivo: linha.video_arquivo,
    legendaArquivo: linha.legenda_arquivo,
    renderErro: linha.render_erro,
    publicadoInstagramEm: linha.publicado_instagram_em,
    editadoManualmente: linha.editado_manualmente === 1,
    atualizadoEm: linha.atualizado_em,
  };
}

export type NoticiaNova = {
  fonte: string;
  fonteTipo: TipoFonte | "caixa";
  titulo: string;
  resumo: string;
  link: string;
  imagemUrl?: string | null;
  publicadoEm?: string | null;
};

export type ResultadoInsercao =
  | { inserida: true; id: number }
  | { inserida: false; motivo: "url-repetida" | "titulo-parecido" };

/**
 * Insere uma noticia nova, deduplicando por URL normalizada e por titulo
 * parecido dentro da janela configurada.
 */
export function inserirNoticia(
  nova: NoticiaNova,
  janelaDuplicadasHoras: number,
): ResultadoInsercao {
  const linkHash = hashUrl(nova.link);
  const existente = db
    .prepare(`SELECT id FROM noticias WHERE link_hash = ?`)
    .get(linkHash) as { id: number } | undefined;
  if (existente) return { inserida: false, motivo: "url-repetida" };

  const tituloNorm = normalizarTitulo(nova.titulo);
  const limite = new Date(
    Date.now() - janelaDuplicadasHoras * 3600 * 1000,
  ).toISOString();
  const recentes = db
    .prepare(
      `SELECT titulo_norm FROM noticias WHERE coletado_em >= ? AND titulo_norm <> ''`,
    )
    .all(limite) as { titulo_norm: string }[];
  for (const r of recentes) {
    if (semelhanca(tituloNorm, r.titulo_norm) >= 0.72) {
      return { inserida: false, motivo: "titulo-parecido" };
    }
  }

  const agora = agoraISO();
  const info = db
    .prepare(
      `INSERT INTO noticias
        (status, fonte, fonte_tipo, titulo, titulo_norm, resumo, link, link_hash,
         imagem_url, publicado_em, coletado_em, atualizado_em)
       VALUES ('novo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      nova.fonte,
      nova.fonteTipo,
      nova.titulo,
      tituloNorm,
      nova.resumo,
      nova.link,
      linkHash,
      nova.imagemUrl ?? null,
      nova.publicadoEm ?? null,
      agora,
      agora,
    );
  return { inserida: true, id: Number(info.lastInsertRowid) };
}

export function buscarPorId(id: number): Noticia | null {
  const linha = db.prepare(`SELECT * FROM noticias WHERE id = ?`).get(id) as
    | LinhaNoticia
    | undefined;
  return linha ? paraNoticia(linha) : null;
}

export function listarPorStatus(status: Status | Status[], limite = 200) {
  const lista = Array.isArray(status) ? status : [status];
  const marcadores = lista.map(() => "?").join(", ");
  const linhas = db
    .prepare(
      `SELECT * FROM noticias WHERE status IN (${marcadores})
       ORDER BY COALESCE(publicado_em, coletado_em) DESC LIMIT ?`,
    )
    .all(...lista, limite) as LinhaNoticia[];
  return linhas.map(paraNoticia);
}

export function contarPorStatus(): Record<string, number> {
  const linhas = db
    .prepare(`SELECT status, COUNT(*) AS total FROM noticias GROUP BY status`)
    .all() as { status: string; total: number }[];
  const contagem: Record<string, number> = {};
  for (const l of linhas) contagem[l.status] = l.total;
  return contagem;
}

export function proximaNaoCurada(limite: number): Noticia[] {
  const linhas = db
    .prepare(
      `SELECT * FROM noticias WHERE status = 'novo'
       ORDER BY COALESCE(publicado_em, coletado_em) ASC LIMIT ?`,
    )
    .all(limite) as LinhaNoticia[];
  return linhas.map(paraNoticia);
}

export function proximaNaFilaDeRender(): Noticia | null {
  const linha = db
    .prepare(
      `SELECT * FROM noticias WHERE status = 'aprovado'
       ORDER BY atualizado_em ASC LIMIT 1`,
    )
    .get() as LinhaNoticia | undefined;
  return linha ? paraNoticia(linha) : null;
}

/** Atualizacao generica; recebe colunas do banco ja no formato certo. */
function atualizar(id: number, campos: Record<string, unknown>): void {
  const chaves = Object.keys(campos);
  if (chaves.length === 0) return;
  const sets = chaves.map((c) => `${c} = ?`).join(", ");
  db.prepare(
    `UPDATE noticias SET ${sets}, atualizado_em = ? WHERE id = ?`,
  ).run(...chaves.map((c) => campos[c]), agoraISO(), id);
}

export type ResultadoCuradoria = {
  relevante: boolean;
  motivo: string;
  categoria: Categoria;
  urgencia: string;
  manchete: string;
  frases: string[];
  legenda: string;
  fundo: string;
  verificar: boolean;
  verificarMotivo: string;
};

export function salvarCuradoria(
  id: number,
  resultado: ResultadoCuradoria,
  entrada: string,
  saida: string,
): void {
  atualizar(id, {
    status: resultado.relevante ? "relevante" : "descartado",
    curado_em: agoraISO(),
    relevante: resultado.relevante ? 1 : 0,
    motivo_descarte: resultado.relevante ? null : resultado.motivo,
    categoria: resultado.categoria,
    urgencia: resultado.urgencia,
    manchete: resultado.manchete,
    frases: JSON.stringify(resultado.frases),
    legenda: resultado.legenda,
    fundo: resultado.fundo,
    verificar: resultado.verificar ? 1 : 0,
    verificar_motivo: resultado.verificarMotivo || null,
    curadoria_entrada: entrada,
    curadoria_saida: saida,
  });
}

export function marcarErroCuradoria(id: number, erro: string): void {
  atualizar(id, { status: "erro", render_erro: null, curadoria_saida: erro });
}

export type EdicaoManual = {
  manchete?: string;
  frases?: string[];
  legenda?: string;
  fundo?: string;
  categoria?: Categoria;
  verificar?: boolean;
};

export function editarNoticia(id: number, edicao: EdicaoManual): void {
  const campos: Record<string, unknown> = { editado_manualmente: 1 };
  if (edicao.manchete !== undefined) campos.manchete = edicao.manchete;
  if (edicao.frases !== undefined) campos.frases = JSON.stringify(edicao.frases);
  if (edicao.legenda !== undefined) campos.legenda = edicao.legenda;
  if (edicao.fundo !== undefined) campos.fundo = edicao.fundo;
  if (edicao.categoria !== undefined) campos.categoria = edicao.categoria;
  if (edicao.verificar !== undefined)
    campos.verificar = edicao.verificar ? 1 : 0;
  atualizar(id, campos);
}

export function mudarStatus(id: number, status: Status): void {
  atualizar(id, { status });
}

export function marcarRenderizando(id: number): void {
  atualizar(id, {
    status: "renderizando",
    render_iniciado_em: agoraISO(),
    render_erro: null,
  });
}

export function marcarPronto(
  id: number,
  videoArquivo: string,
  legendaArquivo: string,
  fundoArquivo: string | null,
): void {
  atualizar(id, {
    status: "pronto",
    video_arquivo: videoArquivo,
    legenda_arquivo: legendaArquivo,
    fundo_arquivo: fundoArquivo,
    render_terminado_em: agoraISO(),
    render_erro: null,
  });
}

export function marcarErroRender(id: number, erro: string): void {
  atualizar(id, { status: "erro", render_erro: erro });
}

export function marcarPublicado(id: number): void {
  atualizar(id, {
    status: "publicado",
    publicado_instagram_em: agoraISO(),
  });
}

/** Devolve renders interrompidos (ex.: o app caiu no meio) para a fila. */
export function destravarRendersPendentes(): number {
  const info = db
    .prepare(
      `UPDATE noticias SET status = 'aprovado', atualizado_em = ?
       WHERE status = 'renderizando'`,
    )
    .run(agoraISO());
  return info.changes;
}

export function curadoriaBruta(id: number) {
  return db
    .prepare(
      `SELECT curadoria_entrada AS entrada, curadoria_saida AS saida
       FROM noticias WHERE id = ?`,
    )
    .get(id) as { entrada: string | null; saida: string | null } | undefined;
}
