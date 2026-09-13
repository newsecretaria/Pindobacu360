import "dotenv/config";
import { curarPendentes } from "../curadoria";

const limite = process.argv[2] ? Number(process.argv[2]) : undefined;
const resumo = await curarPendentes(limite);
console.log(JSON.stringify(resumo, null, 2));
