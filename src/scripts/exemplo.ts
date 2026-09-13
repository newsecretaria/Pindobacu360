import "dotenv/config";
import { carregarConfig } from "../dados/configuracao";
import { montarLegenda } from "../curadoria/reescrever";
import {
  buscarPorId,
  inserirNoticia,
  salvarCuradoria,
} from "../dados/noticias";

/**
 * Cria uma noticia de exemplo ja curada, para testar o template de video
 * sem gastar chamada de API. Uso: npm run exemplo
 */
const config = carregarConfig();

const resultado = inserirNoticia(
  {
    fonte: "Exemplo (teste local)",
    fonteTipo: "rss",
    titulo: "Mutirao de limpeza recolhe entulho em ruas de Pindobacu",
    resumo:
      "A prefeitura realizou um mutirao de limpeza no centro da cidade. Equipes recolheram entulho e lixo acumulado em cinco ruas. O trabalho continua na proxima semana nos bairros.",
    link: `https://exemplo.local/noticia/${Date.now()}`,
    publicadoEm: new Date().toISOString(),
  },
  config.coleta.janelaDuplicadasHoras,
);

if (!resultado.inserida) {
  console.log(`Nada inserido (${resultado.motivo}).`);
  process.exit(0);
}

const frases = [
  "O mutirão passou por cinco ruas do centro da cidade.",
  "As equipes recolheram entulho e lixo acumulado nas calçadas.",
  "O trabalho continua na próxima semana, agora nos bairros.",
];

salvarCuradoria(
  resultado.id,
  {
    relevante: true,
    motivo: "Notícia de exemplo criada pelo script de teste.",
    categoria: "cidade",
    urgencia: "media",
    manchete: "Mutirão de limpeza recolhe entulho em Pindobaçu",
    frases,
    legenda: montarLegenda(
      "Um mutirão de limpeza passou pelo centro de Pindobaçu nesta semana.\nA prefeitura informou que os bairros entram na próxima etapa.",
      "Exemplo (teste local)",
      "cidade",
      config,
    ),
    fundo: "cidade",
    verificar: false,
    verificarMotivo: "",
  },
  "(exemplo local — nao passou pela API)",
  "(exemplo local — nao passou pela API)",
);

const noticia = buscarPorId(resultado.id);
console.log(
  `Notícia de exemplo criada: #${resultado.id} — "${noticia?.manchete}"\n` +
    `Renderize com: npm run render ${resultado.id}`,
);
