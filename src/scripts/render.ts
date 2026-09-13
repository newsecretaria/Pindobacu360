import "dotenv/config";
import { renderizarNoticia } from "../video/renderizar";

const id = Number(process.argv[2]);
if (!Number.isInteger(id)) {
  console.error("Uso: npm run render <id-da-noticia>");
  process.exit(1);
}

const resultado = await renderizarNoticia(id);
console.log(`\nVideo:   ${resultado.video}\nLegenda: ${resultado.legenda}\n`);
