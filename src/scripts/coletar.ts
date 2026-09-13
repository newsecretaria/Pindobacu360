import "dotenv/config";
import { coletar } from "../coletor";

const resumo = await coletar();
console.log(JSON.stringify(resumo, null, 2));
