import fs from "node:fs";
import { ARQUIVO_CONFIG, PASTA_DADOS, garantirPasta } from "../util/caminhos";
import { configPadrao, type Config } from "../config";

/**
 * A configuracao vive em src/config.ts (padrao) e pode ser sobrescrita por
 * dados/config.json, que e o arquivo que a aba "Configuracoes" do painel grava.
 * Assim o Ricardo edita pelo painel sem mexer em codigo, e o codigo continua
 * sendo a fonte dos valores iniciais.
 */

let cache: Config | null = null;

function mesclar(padrao: Config, salvo: Partial<Config>): Config {
  return {
    ...padrao,
    ...salvo,
    perfil: { ...padrao.perfil, ...(salvo.perfil ?? {}) },
    cores: { ...padrao.cores, ...(salvo.cores ?? {}) },
    fonteTipografica: {
      ...padrao.fonteTipografica,
      ...(salvo.fonteTipografica ?? {}),
    },
    regiao: { ...padrao.regiao, ...(salvo.regiao ?? {}) },
    hashtagsPorCategoria: {
      ...padrao.hashtagsPorCategoria,
      ...(salvo.hashtagsPorCategoria ?? {}),
    },
    coleta: { ...padrao.coleta, ...(salvo.coleta ?? {}) },
    curadoria: { ...padrao.curadoria, ...(salvo.curadoria ?? {}) },
    video: { ...padrao.video, ...(salvo.video ?? {}) },
  };
}

export function carregarConfig(recarregar = false): Config {
  if (cache && !recarregar) return cache;
  let salvo: Partial<Config> = {};
  if (fs.existsSync(ARQUIVO_CONFIG)) {
    try {
      salvo = JSON.parse(fs.readFileSync(ARQUIVO_CONFIG, "utf8"));
    } catch (erro) {
      console.warn(
        `[config] dados/config.json invalido, usando o padrao: ${String(erro)}`,
      );
      salvo = {};
    }
  }
  cache = mesclar(configPadrao, salvo);
  return cache;
}

export function salvarConfig(parcial: Partial<Config>): Config {
  garantirPasta(PASTA_DADOS);
  const atual = carregarConfig();
  const novo = mesclar(atual, parcial);
  fs.writeFileSync(ARQUIVO_CONFIG, JSON.stringify(novo, null, 2), "utf8");
  cache = novo;
  return novo;
}
