import Database from "better-sqlite3";
import { ARQUIVO_BANCO, PASTA_DADOS, garantirPasta } from "../util/caminhos";

garantirPasta(PASTA_DADOS);

export const db = new Database(ARQUIVO_BANCO);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS noticias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- ciclo de vida: novo | relevante | descartado | aprovado | renderizando | pronto | publicado | erro
  status TEXT NOT NULL DEFAULT 'novo',

  -- coleta
  fonte TEXT NOT NULL,
  fonte_tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  titulo_norm TEXT NOT NULL DEFAULT '',
  resumo TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL,
  link_hash TEXT NOT NULL UNIQUE,
  imagem_url TEXT,                  -- só referencia para o revisor; nunca vai para o video
  publicado_em TEXT,
  coletado_em TEXT NOT NULL,

  -- curadoria
  curado_em TEXT,
  relevante INTEGER,
  motivo_descarte TEXT,
  categoria TEXT,
  urgencia TEXT,
  manchete TEXT,
  frases TEXT,                      -- JSON: string[]
  legenda TEXT,
  fundo TEXT,
  verificar INTEGER NOT NULL DEFAULT 0,
  verificar_motivo TEXT,
  curadoria_entrada TEXT,
  curadoria_saida TEXT,

  -- video
  fundo_arquivo TEXT,
  video_arquivo TEXT,
  legenda_arquivo TEXT,
  render_iniciado_em TEXT,
  render_terminado_em TEXT,
  render_erro TEXT,

  -- publicacao
  publicado_instagram_em TEXT,

  editado_manualmente INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_noticias_status ON noticias(status);
CREATE INDEX IF NOT EXISTS idx_noticias_coletado ON noticias(coletado_em);
CREATE INDEX IF NOT EXISTS idx_noticias_titulo_norm ON noticias(titulo_norm);

CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  noticia_id INTEGER,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  criado_em TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_eventos_criado ON eventos(criado_em);
`);

export function registrarEvento(
  tipo: string,
  mensagem: string,
  noticiaId?: number,
): void {
  db.prepare(
    `INSERT INTO eventos (noticia_id, tipo, mensagem, criado_em)
     VALUES (?, ?, ?, ?)`,
  ).run(noticiaId ?? null, tipo, mensagem, new Date().toISOString());
}

export function ultimosEventos(limite = 50) {
  return db
    .prepare(
      `SELECT id, noticia_id AS noticiaId, tipo, mensagem, criado_em AS criadoEm
       FROM eventos ORDER BY id DESC LIMIT ?`,
    )
    .all(limite) as {
    id: number;
    noticiaId: number | null;
    tipo: string;
    mensagem: string;
    criadoEm: string;
  }[];
}
