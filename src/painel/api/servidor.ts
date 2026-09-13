import express from "express";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { CATEGORIAS, type Categoria } from "../../config";
import { carregarConfig, salvarConfig } from "../../dados/configuracao";
import { ultimosEventos } from "../../dados/db";
import {
  buscarPorId,
  contarPorStatus,
  curadoriaBruta,
  editarNoticia,
  listarPorStatus,
  mudarStatus,
  marcarPublicado,
  STATUS_VALIDOS,
  type Status,
} from "../../dados/noticias";
import { coletar } from "../../coletor";
import { curarPendentes } from "../../curadoria";
import { filaOcupada, processarFila } from "../../video/renderizar";
import { resumoFundos } from "../../video/fundos";
import { PASTA_SAIDA, PASTA_WEB } from "../../util/caminhos";

/** Abas do painel -> status do banco */
export const ABAS: Record<string, Status[]> = {
  novas: ["novo", "relevante"],
  aprovadas: ["aprovado", "renderizando"],
  prontas: ["pronto"],
  publicadas: ["publicado"],
  descartadas: ["descartado"],
  erros: ["erro"],
};

function abrirNoSistema(alvo: string): void {
  const comando =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "explorer"
        : "xdg-open";
  spawn(comando, [alvo], { detached: true, stdio: "ignore" }).unref();
}

export function criarApi(): express.Router {
  const api = express.Router();
  api.use(express.json({ limit: "1mb" }));

  api.get("/estado", (_req, res) => {
    const config = carregarConfig();
    res.json({
      contagens: contarPorStatus(),
      filaOcupada: filaOcupada(),
      temChaveAnthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      perfil: config.perfil,
      cores: config.cores,
      fundos: resumoFundos(CATEGORIAS),
    });
  });

  api.get("/noticias", (req, res) => {
    const aba = String(req.query.aba ?? "novas");
    const status = ABAS[aba];
    if (!status) {
      res.status(400).json({ erro: `Aba desconhecida: ${aba}` });
      return;
    }
    res.json({ noticias: listarPorStatus(status) });
  });

  api.get("/noticias/:id", (req, res) => {
    const noticia = buscarPorId(Number(req.params.id));
    if (!noticia) {
      res.status(404).json({ erro: "Noticia nao encontrada" });
      return;
    }
    res.json({ noticia, curadoria: curadoriaBruta(noticia.id) });
  });

  api.patch("/noticias/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!buscarPorId(id)) {
      res.status(404).json({ erro: "Noticia nao encontrada" });
      return;
    }
    const corpo = req.body ?? {};
    const frases = Array.isArray(corpo.frases)
      ? corpo.frases.map((f: unknown) => String(f).trim()).filter(Boolean)
      : undefined;
    if (frases && (frases.length < 1 || frases.length > 4)) {
      res.status(400).json({ erro: "Use de 1 a 4 frases (o ideal sao 3 ou 4)." });
      return;
    }
    const categoria =
      typeof corpo.categoria === "string" &&
      CATEGORIAS.includes(corpo.categoria as Categoria)
        ? (corpo.categoria as Categoria)
        : undefined;

    editarNoticia(id, {
      manchete:
        typeof corpo.manchete === "string" ? corpo.manchete.trim() : undefined,
      frases,
      legenda: typeof corpo.legenda === "string" ? corpo.legenda : undefined,
      fundo:
        typeof corpo.fundo === "string" && CATEGORIAS.includes(corpo.fundo as Categoria)
          ? corpo.fundo
          : undefined,
      categoria,
      verificar:
        typeof corpo.verificar === "boolean" ? corpo.verificar : undefined,
    });
    res.json({ noticia: buscarPorId(id) });
  });

  api.post("/noticias/:id/aprovar", (req, res) => {
    const id = Number(req.params.id);
    const noticia = buscarPorId(id);
    if (!noticia) {
      res.status(404).json({ erro: "Noticia nao encontrada" });
      return;
    }
    if (!noticia.manchete || noticia.frases.length === 0) {
      res.status(400).json({
        erro: "Sem manchete ou frases. Edite a noticia antes de aprovar.",
      });
      return;
    }
    mudarStatus(id, "aprovado");
    void processarFila();
    res.json({ noticia: buscarPorId(id) });
  });

  api.post("/noticias/:id/descartar", (req, res) => {
    const id = Number(req.params.id);
    if (!buscarPorId(id)) {
      res.status(404).json({ erro: "Noticia nao encontrada" });
      return;
    }
    mudarStatus(id, "descartado");
    res.json({ noticia: buscarPorId(id) });
  });

  api.post("/noticias/:id/status", (req, res) => {
    const id = Number(req.params.id);
    const status = String(req.body?.status ?? "");
    if (!STATUS_VALIDOS.includes(status as Status)) {
      res.status(400).json({ erro: `Status invalido: ${status}` });
      return;
    }
    if (!buscarPorId(id)) {
      res.status(404).json({ erro: "Noticia nao encontrada" });
      return;
    }
    mudarStatus(id, status as Status);
    res.json({ noticia: buscarPorId(id) });
  });

  // Fase 1: o Ricardo posta pelo celular e marca aqui.
  api.post("/noticias/:id/publicado", (req, res) => {
    const id = Number(req.params.id);
    if (!buscarPorId(id)) {
      res.status(404).json({ erro: "Noticia nao encontrada" });
      return;
    }
    marcarPublicado(id);
    res.json({ noticia: buscarPorId(id) });
  });

  api.post("/noticias/:id/renderizar", (req, res) => {
    const id = Number(req.params.id);
    const noticia = buscarPorId(id);
    if (!noticia) {
      res.status(404).json({ erro: "Noticia nao encontrada" });
      return;
    }
    mudarStatus(id, "aprovado");
    void processarFila();
    res.json({ noticia: buscarPorId(id) });
  });

  api.get("/noticias/:id/video", (req, res) => {
    const noticia = buscarPorId(Number(req.params.id));
    if (!noticia?.videoArquivo || !fs.existsSync(noticia.videoArquivo)) {
      res.status(404).json({ erro: "Video ainda nao existe" });
      return;
    }
    res.sendFile(path.resolve(noticia.videoArquivo));
  });

  api.post("/noticias/:id/abrir-pasta", (req, res) => {
    const noticia = buscarPorId(Number(req.params.id));
    const alvo =
      noticia?.videoArquivo && fs.existsSync(noticia.videoArquivo)
        ? path.dirname(path.resolve(noticia.videoArquivo))
        : PASTA_SAIDA;
    try {
      abrirNoSistema(alvo);
      res.json({ ok: true, pasta: alvo });
    } catch (erro) {
      res.status(500).json({ erro: String(erro), pasta: alvo });
    }
  });

  api.post("/coletar", async (_req, res) => {
    const resumo = await coletar();
    res.json({ resumo });
  });

  api.post("/curar", async (req, res) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(400).json({
        erro: "ANTHROPIC_API_KEY nao definida — coloque a chave no arquivo .env.",
      });
      return;
    }
    const limite = Number(req.body?.limite) || undefined;
    const resumo = await curarPendentes(limite);
    res.json({ resumo });
  });

  api.get("/config", (_req, res) => {
    res.json({ config: carregarConfig(true), categorias: CATEGORIAS });
  });

  api.put("/config", (req, res) => {
    const config = salvarConfig(req.body ?? {});
    res.json({ config });
  });

  api.get("/eventos", (_req, res) => {
    res.json({ eventos: ultimosEventos(60) });
  });

  return api;
}

export type OpcoesServidor = {
  porta: number;
  /** true = Vite em middleware, com recarga automatica do painel */
  dev: boolean;
};

export async function iniciarServidor(opcoes: OpcoesServidor) {
  const app = express();
  app.use("/api", criarApi());

  app.use(
    (
      erro: Error,
      _req: express.Request,
      res: express.Response,
      _proximo: express.NextFunction,
    ) => {
      console.error("[api]", erro);
      res.status(500).json({ erro: erro.message });
    },
  );

  if (opcoes.dev) {
    // Painel servido pelo Vite dentro do proprio Express: tudo em uma porta so.
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: PASTA_WEB,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(PASTA_WEB, "dist");
    if (fs.existsSync(dist)) {
      app.use(express.static(dist));
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(dist, "index.html"));
      });
    } else {
      app.get("/", (_req, res) => {
        res
          .status(500)
          .send("Painel nao compilado. Rode: npm run build:web (ou npm run dev)");
      });
    }
  }

  return new Promise<import("node:http").Server>((resolve) => {
    const servidor = app.listen(opcoes.porta, () => {
      console.log(
        `\n  Painel do Pindobaçu Shorts: http://localhost:${opcoes.porta}\n`,
      );
      resolve(servidor);
    });
  });
}
