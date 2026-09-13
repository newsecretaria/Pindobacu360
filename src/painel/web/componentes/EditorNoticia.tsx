import React, { useState } from "react";
import type { Noticia } from "../api";

const CATEGORIAS = [
  "cidade",
  "saude",
  "educacao",
  "clima",
  "seguranca",
  "esporte",
  "cultura",
  "politica",
  "economia",
  "geral",
];

/** Edicao manual antes de renderizar: manchete, frases, legenda, fundo e categoria. */
export const EditorNoticia: React.FC<{
  noticia: Noticia;
  onFechar: () => void;
  onSalvar: (dados: Partial<Noticia>) => Promise<void>;
}> = ({ noticia, onFechar, onSalvar }) => {
  const [manchete, setManchete] = useState(noticia.manchete ?? noticia.titulo);
  const [frases, setFrases] = useState<string[]>(
    noticia.frases.length > 0 ? noticia.frases : ["", "", ""],
  );
  const [legenda, setLegenda] = useState(noticia.legenda ?? "");
  const [categoria, setCategoria] = useState(noticia.categoria ?? "geral");
  const [fundo, setFundo] = useState(noticia.fundo ?? noticia.categoria ?? "geral");
  const [verificar, setVerificar] = useState(noticia.verificar);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar({
        manchete,
        frases: frases.map((f) => f.trim()).filter(Boolean),
        legenda,
        categoria,
        fundo,
        verificar,
      });
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="sobreposicao" onClick={onFechar}>
      <div className="painel-editor" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0 }}>Editar notícia #{noticia.id}</h2>
        <div className="meta">
          {noticia.fonte} ·{" "}
          <a href={noticia.link} target="_blank" rel="noreferrer">
            original
          </a>
        </div>

        <label>
          Manchete (vai em caixa alta no vídeo)
          <input value={manchete} onChange={(e) => setManchete(e.target.value)} />
          <span
            className={`contagem ${manchete.length > 70 ? "estourou" : ""}`}
          >
            {manchete.length}/70 caracteres
          </span>
        </label>

        <div>
          <span style={{ fontSize: 13, color: "var(--texto-fraco)" }}>
            Frases (uma tela cada, 3 a 4 frases, até 90 caracteres)
          </span>
          {frases.map((frase, i) => (
            <label key={i} style={{ marginTop: 8 }}>
              <textarea
                rows={2}
                value={frase}
                onChange={(e) => {
                  const novas = [...frases];
                  novas[i] = e.target.value;
                  setFrases(novas);
                }}
              />
              <span
                className={`contagem ${frase.length > 90 ? "estourou" : ""}`}
              >
                {frase.length}/90
                {frases.length > 1 && (
                  <button
                    style={{ marginLeft: 10, padding: "2px 8px" }}
                    onClick={() => setFrases(frases.filter((_, j) => j !== i))}
                  >
                    remover
                  </button>
                )}
              </span>
            </label>
          ))}
          {frases.length < 4 && (
            <button
              style={{ marginTop: 8 }}
              onClick={() => setFrases([...frases, ""])}
            >
              + frase
            </button>
          )}
        </div>

        <label>
          Legenda do Instagram
          <textarea
            rows={7}
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
          />
        </label>

        <div className="linha">
          <label>
            Categoria
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Pasta de fundo
            <select value={fundo} onChange={(e) => setFundo(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label style={{ justifyContent: "flex-end" }}>
            <span>
              <input
                type="checkbox"
                style={{ width: "auto", marginRight: 8 }}
                checked={verificar}
                onChange={(e) => setVerificar(e.target.checked)}
              />
              marcar como "verificar"
            </span>
          </label>
        </div>

        {erro && <div className="aviso">{erro}</div>}

        <div className="acoes">
          <button className="primario" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <button onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};
