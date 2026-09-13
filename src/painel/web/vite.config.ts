import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// O painel e servido pelo Express (src/painel/api/servidor.ts):
// em desenvolvimento pelo middleware do Vite, em producao pela pasta dist/.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});
