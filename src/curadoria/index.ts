import { carregarConfig } from "../dados/configuracao";
import { registrarEvento } from "../dados/db";
import {
  marcarErroCuradoria,
  proximaNaoCurada,
  salvarCuradoria,
} from "../dados/noticias";
import { curarNoticia } from "./classificar";

export type ResumoCuradoria = {
  analisadas: number;
  relevantes: number;
  descartadas: number;
  erros: { id: number; erro: string }[];
};

let rodando = false;

/**
 * Cura as noticias com status "novo", uma chamada de API por noticia.
 * Roda em serie para nao estourar limite de taxa e para o custo ficar previsivel.
 */
export async function curarPendentes(
  limite?: number,
): Promise<ResumoCuradoria> {
  const resumo: ResumoCuradoria = {
    analisadas: 0,
    relevantes: 0,
    descartadas: 0,
    erros: [],
  };
  if (rodando) return resumo;
  rodando = true;

  try {
    const config = carregarConfig();
    const fila = proximaNaoCurada(limite ?? config.curadoria.maxPorRodada);

    for (const noticia of fila) {
      try {
        const { resultado, entrada, saida } = await curarNoticia(
          noticia,
          config,
        );
        salvarCuradoria(noticia.id, resultado, entrada, saida);
        resumo.analisadas++;
        if (resultado.relevante) resumo.relevantes++;
        else resumo.descartadas++;
        registrarEvento(
          "curadoria",
          resultado.relevante
            ? `Relevante (${resultado.categoria}): ${resultado.manchete}`
            : `Descartada: ${resultado.motivo}`,
          noticia.id,
        );
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        marcarErroCuradoria(noticia.id, mensagem);
        resumo.erros.push({ id: noticia.id, erro: mensagem });
        registrarEvento("curadoria-erro", mensagem, noticia.id);
        console.error(`[curadoria] noticia ${noticia.id}: ${mensagem}`);
      }
    }
  } finally {
    rodando = false;
  }

  return resumo;
}

export { curarNoticia } from "./classificar";
