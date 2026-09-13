import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do projeto (a pasta que contem package.json) */
export const RAIZ = path.resolve(aqui, "..", "..");

export const PASTA_DADOS = path.join(RAIZ, "dados");
export const PASTA_SAIDA = path.join(RAIZ, "saida");
export const PASTA_ASSETS = path.join(RAIZ, "assets");
export const PASTA_FUNDOS = path.join(PASTA_ASSETS, "fundos");
export const PASTA_LOGO = path.join(PASTA_ASSETS, "logo");
export const PASTA_FONTES = path.join(PASTA_ASSETS, "fontes");
export const PASTA_WEB = path.join(RAIZ, "src", "painel", "web");
export const ARQUIVO_BANCO = path.join(PASTA_DADOS, "shorts.db");
export const ARQUIVO_CONFIG = path.join(PASTA_DADOS, "config.json");
export const ENTRADA_REMOTION = path.join(
  RAIZ,
  "src",
  "video",
  "remotion",
  "index.ts",
);

export function garantirPasta(caminho: string): string {
  fs.mkdirSync(caminho, { recursive: true });
  return caminho;
}
