import { carregarConfig } from "../dados/configuracao";
import { registrarEvento } from "../dados/db";
import { inserirNoticia } from "../dados/noticias";
import { lerFeed } from "./rss";

export type ResumoColeta = {
  inicio: string;
  fim: string;
  lidas: number;
  novas: number;
  repetidas: number;
  erros: { fonte: string; erro: string }[];
};

/**
 * Passa por todas as fontes ativas, guarda o que e novidade e devolve um resumo.
 * Fontes "site" e "instagram" entram no item 6 da ordem de implementacao —
 * por enquanto sao ignoradas com aviso no log.
 */
export async function coletar(): Promise<ResumoColeta> {
  const config = carregarConfig(true);
  const inicio = new Date().toISOString();
  const resumo: ResumoColeta = {
    inicio,
    fim: inicio,
    lidas: 0,
    novas: 0,
    repetidas: 0,
    erros: [],
  };

  const ativas = config.fontes.filter((f) => f.ativo);
  const rss = ativas.filter((f) => f.tipo === "rss");
  const aindaNao = ativas.filter((f) => f.tipo !== "rss");
  for (const f of aindaNao) {
    console.warn(
      `[coleta] fonte "${f.nome}" (${f.tipo}) ainda nao e coletada automaticamente — use a Caixa de entrada.`,
    );
  }

  const leituras = await Promise.all(
    rss.map((fonte) =>
      lerFeed(fonte, {
        maxPorFonte: config.coleta.maxPorFonte,
        idadeMaximaHoras: config.coleta.idadeMaximaHoras,
      }),
    ),
  );

  for (const leitura of leituras) {
    if (leitura.erro) {
      resumo.erros.push({ fonte: leitura.fonte, erro: leitura.erro });
      registrarEvento(
        "coleta-erro",
        `Falha ao ler ${leitura.fonte}: ${leitura.erro}`,
      );
      continue;
    }
    for (const item of leitura.itens) {
      resumo.lidas++;
      const r = inserirNoticia(item, config.coleta.janelaDuplicadasHoras);
      if (r.inserida) resumo.novas++;
      else resumo.repetidas++;
    }
  }

  resumo.fim = new Date().toISOString();
  registrarEvento(
    "coleta",
    `Coleta concluida: ${resumo.novas} nova(s), ${resumo.repetidas} repetida(s), ${resumo.erros.length} fonte(s) com erro.`,
  );
  return resumo;
}
