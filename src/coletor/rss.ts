import Parser from "rss-parser";
import type { Fonte } from "../config";
import { limparHtml } from "../util/texto";
import type { NoticiaNova } from "../dados/noticias";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "PindobacuShorts/0.1 (+https://instagram.com/pindobacu360) rss-parser",
  },
  customFields: {
    item: [
      ["media:content", "midiaConteudo", { keepArray: false }],
      ["media:thumbnail", "midiaThumb", { keepArray: false }],
      ["content:encoded", "conteudoCompleto"],
    ],
  },
});

type ItemBruto = Parser.Item & {
  midiaConteudo?: { $?: { url?: string } };
  midiaThumb?: { $?: { url?: string } };
  conteudoCompleto?: string;
};

/** A imagem do feed só serve de referencia no painel — nunca vai para o video. */
function imagemDoItem(item: ItemBruto): string | null {
  if (item.enclosure?.url && /^https?:/.test(item.enclosure.url)) {
    return item.enclosure.url;
  }
  if (item.midiaConteudo?.$?.url) return item.midiaConteudo.$.url;
  if (item.midiaThumb?.$?.url) return item.midiaThumb.$.url;
  return null;
}

function dataDoItem(item: ItemBruto): string | null {
  const bruta = item.isoDate ?? item.pubDate;
  if (!bruta) return null;
  const data = new Date(bruta);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

export type LeituraFeed = {
  fonte: string;
  itens: NoticiaNova[];
  erro?: string;
};

/**
 * Le um feed RSS/Atom e devolve os itens ja no formato do banco.
 * Falha de rede vira `erro` na leitura — nunca derruba a coleta inteira.
 */
export async function lerFeed(
  fonte: Fonte,
  opcoes: { maxPorFonte: number; idadeMaximaHoras: number },
): Promise<LeituraFeed> {
  try {
    const feed = await parser.parseURL(fonte.url);
    const limiteIdade =
      Date.now() - opcoes.idadeMaximaHoras * 3600 * 1000;

    const itens: NoticiaNova[] = [];
    for (const bruto of (feed.items ?? []) as ItemBruto[]) {
      const titulo = limparHtml(bruto.title);
      const link = (bruto.link ?? "").trim();
      if (!titulo || !link) continue;

      const publicadoEm = dataDoItem(bruto);
      if (publicadoEm && new Date(publicadoEm).getTime() < limiteIdade) continue;

      const resumo = limparHtml(
        bruto.contentSnippet ?? bruto.summary ?? bruto.content ?? bruto.conteudoCompleto,
      ).slice(0, 2000);

      itens.push({
        fonte: fonte.nome,
        fonteTipo: "rss",
        titulo,
        resumo,
        link,
        imagemUrl: imagemDoItem(bruto),
        publicadoEm,
      });
      if (itens.length >= opcoes.maxPorFonte) break;
    }
    return { fonte: fonte.nome, itens };
  } catch (erro) {
    return {
      fonte: fonte.nome,
      itens: [],
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  }
}
