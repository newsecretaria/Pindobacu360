import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./estilos.css";

const elemento = document.getElementById("raiz");
if (!elemento) throw new Error("Elemento #raiz nao encontrado");
createRoot(elemento).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
