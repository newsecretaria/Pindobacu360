import "dotenv/config";
import cron from "node-cron";
import { coletar } from "./coletor";
import { curarPendentes } from "./curadoria";
import { carregarConfig } from "./dados/configuracao";
import { destravarRendersPendentes } from "./dados/noticias";
import { iniciarServidor } from "./painel/api/servidor";
import { iniciarFila, pararFila } from "./video/renderizar";

const PORTA = Number(process.env.PORTA ?? 3000);
const COLETA_AUTOMATICA = process.env.COLETA_AUTOMATICA !== "false";
const DEV = process.env.NODE_ENV !== "production";

async function rodada() {
  try {
    const resumo = await coletar();
    console.log(
      `[coleta] ${resumo.novas} nova(s), ${resumo.repetidas} repetida(s), ${resumo.erros.length} erro(s).`,
    );
    if (resumo.novas > 0) {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn(
          "[curadoria] ANTHROPIC_API_KEY nao definida — as noticias ficam em 'Novas' ate a chave existir.",
        );
        return;
      }
      const curadoria = await curarPendentes();
      console.log(
        `[curadoria] ${curadoria.analisadas} analisada(s), ${curadoria.relevantes} relevante(s), ${curadoria.descartadas} descartada(s).`,
      );
    }
  } catch (erro) {
    console.error("[rodada] falhou:", erro);
  }
}

async function principal() {
  const config = carregarConfig(true);

  const destravadas = destravarRendersPendentes();
  if (destravadas > 0) {
    console.log(`[render] ${destravadas} render(s) interrompido(s) voltaram para a fila.`);
  }

  await iniciarServidor({ porta: PORTA, dev: DEV });
  iniciarFila();

  if (COLETA_AUTOMATICA) {
    const minutos = Math.max(1, Math.min(59, config.coleta.intervaloMinutos));
    cron.schedule(`*/${minutos} * * * *`, () => void rodada());
    console.log(`[agendador] coleta a cada ${minutos} min.`);
    void rodada();
  } else {
    console.log("[agendador] desligado (COLETA_AUTOMATICA=false).");
  }

  const encerrar = () => {
    pararFila();
    process.exit(0);
  };
  process.on("SIGINT", encerrar);
  process.on("SIGTERM", encerrar);
}

void principal();
