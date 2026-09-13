import crypto from "node:crypto";

const PARAMETROS_LIXO = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "igshid",
  "ref",
  "cmpid",
  "xtor",
];

/** Tira acentos e deixa minusculo — base de todas as comparacoes. */
export function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * URL normalizada para deduplicacao: sem parametros de rastreio,
 * sem barra final, sem "www.", sempre minuscula no host.
 */
export function normalizarUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.protocol = "https:";
    for (const p of PARAMETROS_LIXO) u.searchParams.delete(p);
    u.search = u.searchParams.toString() ? `?${u.searchParams.toString()}` : "";
    let saida = u.toString();
    if (saida.endsWith("/") && u.pathname !== "/") saida = saida.slice(0, -1);
    return saida;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function hashUrl(url: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizarUrl(url))
    .digest("hex")
    .slice(0, 32);
}

/** Titulo reduzido a palavras significativas, para comparar semelhanca. */
export function normalizarTitulo(titulo: string): string {
  return semAcento(titulo)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !PALAVRAS_VAZIAS.has(p))
    .join(" ")
    .trim();
}

const PALAVRAS_VAZIAS = new Set([
  "que",
  "com",
  "para",
  "por",
  "dos",
  "das",
  "nos",
  "nas",
  "uma",
  "uns",
  "umas",
  "sobre",
  "apos",
  "pelo",
  "pela",
  "sao",
  "ate",
  "mais",
  "seu",
  "sua",
  "este",
  "essa",
  "esse",
  "esta",
  "the",
]);

/** Semelhanca de Jaccard entre dois titulos ja normalizados (0 a 1). */
export function semelhanca(a: string, b: string): number {
  const ca = new Set(a.split(" ").filter(Boolean));
  const cb = new Set(b.split(" ").filter(Boolean));
  if (ca.size === 0 || cb.size === 0) return 0;
  let iguais = 0;
  for (const palavra of ca) if (cb.has(palavra)) iguais++;
  return iguais / (ca.size + cb.size - iguais);
}

export function slug(texto: string, limite = 60): string {
  const base = semAcento(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (base || "noticia").slice(0, limite).replace(/-+$/g, "");
}

/** AAAA-MM-DD no fuso local */
export function dataArquivo(data = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}

export function agoraISO(): string {
  return new Date().toISOString();
}

/** Tira tags HTML e espacos repetidos de resumos vindos de feeds. */
export function limparHtml(texto: string | undefined | null): string {
  if (!texto) return "";
  return texto
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
