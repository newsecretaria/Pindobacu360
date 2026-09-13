import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { CATEGORIAS, type Categoria, type Config } from "../config";
import type { Noticia, ResultadoCuradoria } from "../dados/noticias";
import { promptNoticia, promptSistema } from "./prompts";
import { ajustarAosLimites, montarLegenda } from "./reescrever";

const EsquemaCuradoria = z.object({
  relevante: z.boolean(),
  motivo: z.string(),
  categoria: z.enum([
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
  ]),
  urgencia: z.enum(["baixa", "media", "alta"]),
  manchete: z.string(),
  frases: z.array(z.string()),
  legendaCorpo: z.string(),
  fundo: z.enum([
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
  ]),
  verificar: z.boolean(),
  verificarMotivo: z.string(),
});

export type SaidaModelo = z.infer<typeof EsquemaCuradoria>;

let clienteCache: Anthropic | null = null;

function cliente(): Anthropic {
  if (!clienteCache) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY nao definida. Copie .env.example para .env e coloque a chave da Anthropic.",
      );
    }
    clienteCache = new Anthropic();
  }
  return clienteCache;
}

export type RetornoCuradoria = {
  resultado: ResultadoCuradoria;
  entrada: string;
  saida: string;
  avisos: string[];
};

/** Uma chamada a API da Anthropic por noticia, com resposta em JSON. */
export async function curarNoticia(
  noticia: Noticia,
  config: Config,
): Promise<RetornoCuradoria> {
  const sistema = promptSistema(config);
  const usuario = promptNoticia(noticia);

  const resposta = await cliente().messages.parse({
    model: config.curadoria.modelo,
    max_tokens: 4000,
    // O prompt de sistema e igual para todas as noticias — vale cachear.
    system: [
      { type: "text", text: sistema, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: usuario }],
    output_config: { format: zodOutputFormat(EsquemaCuradoria) },
  });

  if (resposta.stop_reason === "refusal") {
    throw new Error(
      `O modelo recusou a noticia (${resposta.stop_details?.category ?? "sem categoria"}).`,
    );
  }

  const saida = resposta.parsed_output;
  if (!saida) {
    throw new Error("O modelo nao devolveu JSON valido para esta noticia.");
  }

  const { frases, avisos } = ajustarAosLimites(saida);
  const categoria = (
    CATEGORIAS.includes(saida.categoria as Categoria) ? saida.categoria : "geral"
  ) as Categoria;

  const resultado: ResultadoCuradoria = {
    relevante: saida.relevante,
    motivo: saida.motivo,
    categoria,
    urgencia: saida.urgencia,
    manchete: saida.manchete.trim(),
    frases,
    legenda: montarLegenda(saida.legendaCorpo, noticia.fonte, categoria, config),
    fundo: CATEGORIAS.includes(saida.fundo as Categoria) ? saida.fundo : categoria,
    verificar: saida.verificar || avisos.length > 0,
    verificarMotivo: [saida.verificarMotivo.trim(), ...avisos]
      .filter(Boolean)
      .join(" | "),
  };

  return {
    resultado,
    entrada: `${sistema}\n\n---\n\n${usuario}`,
    saida: JSON.stringify(saida, null, 2),
    avisos,
  };
}
