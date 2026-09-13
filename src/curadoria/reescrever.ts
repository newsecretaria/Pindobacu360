import type { Categoria, Config } from "../config";
import type { SaidaModelo } from "./classificar";

/** Monta a legenda final: corpo do modelo + fonte + hashtags fixas e da categoria. */
export function montarLegenda(
  corpo: string,
  fonte: string,
  categoria: Categoria,
  config: Config,
): string {
  const daCategoria = (config.hashtagsPorCategoria[categoria] ?? []).slice(0, 3);
  const hashtags = [...config.hashtagsFixas, ...daCategoria]
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .filter((h, i, todas) => todas.indexOf(h) === i)
    .join(" ");
  return `${corpo.trim()}\n\nFonte: ${fonte}\n\n${hashtags}`;
}

/** Ajusta a saida do modelo aos limites do template de video. */
export function ajustarAosLimites(saida: SaidaModelo): {
  frases: string[];
  avisos: string[];
} {
  const avisos: string[] = [];
  let frases = saida.frases.map((f) => f.trim()).filter(Boolean);
  if (frases.length > 4) {
    frases = frases.slice(0, 4);
    avisos.push("o modelo mandou mais de 4 frases; as extras foram cortadas");
  }
  if (frases.length < 3) avisos.push("menos de 3 frases");
  if (saida.manchete.length > 70)
    avisos.push(`manchete com ${saida.manchete.length} caracteres (limite 70)`);
  const longas = frases.filter((f) => f.length > 90).length;
  if (longas > 0) avisos.push(`${longas} frase(s) acima de 90 caracteres`);
  return { frases, avisos };
}
