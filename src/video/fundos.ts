import fs from "node:fs";
import path from "node:path";
import type { Categoria, Config } from "../config";
import { PASTA_ASSETS, PASTA_FUNDOS, PASTA_LOGO } from "../util/caminhos";

const EXTENSOES = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
];

function arquivosDe(pasta: string): string[] {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta)
    .filter((nome) => EXTENSOES.includes(path.extname(nome).toLowerCase()))
    .sort();
}

/** Caminho relativo a assets/, que e o public dir do Remotion. */
function relativoAssets(absoluto: string): string {
  return path.relative(PASTA_ASSETS, absoluto).split(path.sep).join("/");
}

export function listarFundos(categoria: string): string[] {
  return arquivosDe(path.join(PASTA_FUNDOS, categoria));
}

/**
 * Escolhe um fundo aleatorio da categoria. Pasta vazia cai em "geral";
 * "geral" vazia devolve null e o video usa o degrade da marca.
 * Nunca baixa imagem do portal da noticia.
 */
export function escolherFundo(categoria: string): string | null {
  for (const pasta of [categoria, "geral"]) {
    const arquivos = listarFundos(pasta);
    if (arquivos.length > 0) {
      const escolhido = arquivos[Math.floor(Math.random() * arquivos.length)]!;
      return relativoAssets(path.join(PASTA_FUNDOS, pasta, escolhido));
    }
  }
  return null;
}

export function encontrarLogo(): string | null {
  const arquivos = arquivosDe(PASTA_LOGO).filter((nome) =>
    [".png", ".webp", ".jpg", ".jpeg"].includes(
      path.extname(nome).toLowerCase(),
    ),
  );
  if (arquivos.length === 0) return null;
  return relativoAssets(path.join(PASTA_LOGO, arquivos[0]!));
}

export function fonteDaMarca(config: Config): string | null {
  const arquivo = config.fonteTipografica.arquivo;
  if (!arquivo) return null;
  const absoluto = path.join(PASTA_ASSETS, "fontes", arquivo);
  return fs.existsSync(absoluto) ? `fontes/${arquivo}` : null;
}

/** Quantas imagens/videos existem em cada pasta de fundo (para o painel). */
export function resumoFundos(categorias: Categoria[]) {
  return categorias.map((c) => ({ categoria: c, arquivos: listarFundos(c).length }));
}
