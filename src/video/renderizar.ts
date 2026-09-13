import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Config } from "../config";
import { carregarConfig } from "../dados/configuracao";
import { registrarEvento } from "../dados/db";
import {
  buscarPorId,
  marcarErroRender,
  marcarPronto,
  marcarRenderizando,
  proximaNaFilaDeRender,
  type Noticia,
} from "../dados/noticias";
import {
  ENTRADA_REMOTION,
  PASTA_SAIDA,
  RAIZ,
  garantirPasta,
} from "../util/caminhos";
import { dataArquivo, slug } from "../util/texto";
import { escolherFundo, encontrarLogo, fonteDaMarca } from "./fundos";
import type { PropsShort } from "./remotion/tipos";

const BIN_REMOTION = path.join(
  RAIZ,
  "node_modules",
  "@remotion",
  "cli",
  "remotion-cli.js",
);

export function montarProps(noticia: Noticia, config: Config): PropsShort {
  const categoria = noticia.categoria ?? "geral";
  const pastaFundo = noticia.fundo ?? categoria;
  // O tom sai da categoria: sol para o dia a dia, serra para servico,
  // terra para o que pede atencao.
  const tom = config.tomPorCategoria[categoria] ?? "sol";
  return {
    manchete: noticia.manchete ?? noticia.titulo,
    frases: noticia.frases,
    categoria: config.rotulosCategoria[categoria] ?? categoria,
    fonte: noticia.fonte,
    fundoArquivo: escolherFundo(pastaFundo),
    logoArquivo: encontrarLogo(),
    fonteArquivo: fonteDaMarca(config),
    perfilNome: config.perfil.nome,
    perfilArroba: config.perfil.arroba,
    cores: config.cores,
    destaque: config.cores[tom],
    pilhaFonte: config.fonteTipografica.pilha,
    margemTopo: config.video.margemTopo,
    margemRodape: config.video.margemRodape,
    emenda: config.video.emenda,
    tempos: {
      abertura: config.video.segundosAbertura,
      manchete: config.video.segundosManchete,
      porFrase: config.video.segundosPorFrase,
      fechamento: config.video.segundosFechamento,
    },
  };
}

/** AAAA-MM-DD_slug — o mesmo nome serve para o .mp4 e para o .txt da legenda. */
export function nomeBase(noticia: Noticia): string {
  const data = noticia.publicadoEm ? new Date(noticia.publicadoEm) : new Date();
  const quando = Number.isNaN(data.getTime()) ? new Date() : data;
  return `${dataArquivo(quando)}_${slug(noticia.manchete ?? noticia.titulo)}`;
}

function rodarRemotion(
  arquivoProps: string,
  destino: string,
  config: Config,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const argumentos = [
      BIN_REMOTION,
      "render",
      ENTRADA_REMOTION,
      "Short",
      destino,
      `--props=${arquivoProps}`,
      "--public-dir=assets",
      "--log=info",
      `--height=${config.video.altura}`,
      `--width=${config.video.largura}`,
    ];
    // Por padrao o Remotion baixa o proprio Chrome na primeira vez.
    // CHROME_EXECUTAVEL permite apontar para um Chrome ja instalado.
    if (process.env.CHROME_EXECUTAVEL) {
      argumentos.push(`--browser-executable=${process.env.CHROME_EXECUTAVEL}`);
    }
    const processo = spawn(process.execPath, argumentos, {
      cwd: RAIZ,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let saidaErro = "";
    processo.stdout.on("data", (d) => process.stdout.write(d));
    processo.stderr.on("data", (d) => {
      saidaErro += d.toString();
      process.stderr.write(d);
    });
    processo.on("error", reject);
    processo.on("close", (codigo) => {
      if (codigo === 0) resolve();
      else
        reject(
          new Error(
            `remotion render terminou com codigo ${codigo}.\n${saidaErro.slice(-2000)}`,
          ),
        );
    });
  });
}

export type ResultadoRender = {
  id: number;
  video: string;
  legenda: string;
};

/** Renderiza uma noticia aprovada e grava video + legenda em saida/. */
export async function renderizarNoticia(id: number): Promise<ResultadoRender> {
  const noticia = buscarPorId(id);
  if (!noticia) throw new Error(`Noticia ${id} nao encontrada.`);
  if (!noticia.manchete || noticia.frases.length === 0) {
    throw new Error(
      `Noticia ${id} ainda nao tem manchete/frases — passe pela curadoria antes.`,
    );
  }

  const config = carregarConfig();
  garantirPasta(PASTA_SAIDA);

  const base = nomeBase(noticia);
  const destinoVideo = path.join(PASTA_SAIDA, `${base}.mp4`);
  const destinoLegenda = path.join(PASTA_SAIDA, `${base}.txt`);
  const props = montarProps(noticia, config);

  const arquivoProps = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "pindobacu-")),
    "props.json",
  );
  fs.writeFileSync(arquivoProps, JSON.stringify(props), "utf8");

  marcarRenderizando(id);
  try {
    await rodarRemotion(arquivoProps, destinoVideo, config);
    fs.writeFileSync(
      destinoLegenda,
      `${noticia.legenda ?? ""}\n\nLink original: ${noticia.link}\n`,
      "utf8",
    );
    marcarPronto(id, destinoVideo, destinoLegenda, props.fundoArquivo);
    registrarEvento("render", `Video pronto: ${base}.mp4`, id);
    return { id, video: destinoVideo, legenda: destinoLegenda };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    marcarErroRender(id, mensagem);
    registrarEvento("render-erro", mensagem, id);
    throw erro;
  } finally {
    fs.rmSync(path.dirname(arquivoProps), { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ */
/* Fila: uma noticia aprovada por vez, em serie                        */
/* ------------------------------------------------------------------ */

let processando = false;
let temporizador: NodeJS.Timeout | null = null;

export function filaOcupada(): boolean {
  return processando;
}

/** Processa a fila ate nao sobrar noticia aprovada. */
export async function processarFila(): Promise<void> {
  if (processando) return;
  processando = true;
  try {
    for (;;) {
      const proxima = proximaNaFilaDeRender();
      if (!proxima) break;
      try {
        await renderizarNoticia(proxima.id);
      } catch (erro) {
        console.error(
          `[render] falhou na noticia ${proxima.id}: ${
            erro instanceof Error ? erro.message : String(erro)
          }`,
        );
      }
    }
  } finally {
    processando = false;
  }
}

/** Liga o vigia da fila; verifica a cada `segundos` se ha algo aprovado. */
export function iniciarFila(segundos = 10): void {
  if (temporizador) return;
  temporizador = setInterval(() => {
    void processarFila();
  }, segundos * 1000);
  void processarFila();
}

export function pararFila(): void {
  if (temporizador) {
    clearInterval(temporizador);
    temporizador = null;
  }
}
