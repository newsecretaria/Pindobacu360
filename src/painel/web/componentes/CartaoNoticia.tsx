import React from "react";
import type { Noticia } from "../api";

function dataCurta(iso: string | null): string {
  if (!iso) return "sem data";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const CartaoNoticia: React.FC<{
  noticia: Noticia;
  onEditar: (n: Noticia) => void;
  onAprovar: (n: Noticia) => void;
  onDescartar: (n: Noticia) => void;
  onPublicado: (n: Noticia) => void;
  onRenderizarDeNovo: (n: Noticia) => void;
  onAbrirPasta: (n: Noticia) => void;
  onCopiarLegenda: (n: Noticia) => void;
  onVerVideo: (n: Noticia) => void;
}> = ({
  noticia,
  onEditar,
  onAprovar,
  onDescartar,
  onPublicado,
  onRenderizarDeNovo,
  onAbrirPasta,
  onCopiarLegenda,
  onVerVideo,
}) => {
  const curada = noticia.manchete !== null;
  return (
    <article className="cartao">
      <div className="meta">
        {noticia.categoria && (
          <span className="etiqueta categoria">{noticia.categoria}</span>
        )}
        {noticia.urgencia && (
          <span className={`etiqueta urgencia-${noticia.urgencia}`}>
            {noticia.urgencia}
          </span>
        )}
        <span className="etiqueta">{noticia.status}</span>
        {noticia.editadoManualmente && <span className="etiqueta">editada</span>}
      </div>

      <h3>{noticia.manchete ?? noticia.titulo}</h3>

      <div className="meta">
        <span>{noticia.fonte}</span>
        <span>·</span>
        <span>{dataCurta(noticia.publicadoEm ?? noticia.coletadoEm)}</span>
        <span>·</span>
        <a href={noticia.link} target="_blank" rel="noreferrer">
          ver original
        </a>
      </div>

      {noticia.verificar && (
        <div className="aviso">
          <strong>Verificar antes de publicar.</strong>{" "}
          {noticia.verificarMotivo ?? ""}
        </div>
      )}

      {noticia.renderErro && (
        <div className="aviso">
          <strong>Erro no render:</strong> {noticia.renderErro.slice(0, 240)}
        </div>
      )}

      {noticia.motivoDescarte && (
        <div className="meta">Motivo: {noticia.motivoDescarte}</div>
      )}

      {noticia.frases.length > 0 ? (
        <ul className="frases">
          {noticia.frases.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      ) : (
        <p className="frases">{noticia.resumo.slice(0, 200)}</p>
      )}

      <div className="acoes">
        <button onClick={() => onEditar(noticia)}>Editar</button>

        {(noticia.status === "novo" || noticia.status === "relevante") && (
          <>
            <button
              className="primario"
              disabled={!curada}
              title={curada ? "" : "Passe pela curadoria ou edite antes"}
              onClick={() => onAprovar(noticia)}
            >
              Aprovar
            </button>
            <button className="perigo" onClick={() => onDescartar(noticia)}>
              Descartar
            </button>
          </>
        )}

        {noticia.status === "pronto" && (
          <>
            <button onClick={() => onVerVideo(noticia)}>Ver vídeo</button>
            <button onClick={() => onCopiarLegenda(noticia)}>
              Copiar legenda
            </button>
            <button onClick={() => onAbrirPasta(noticia)}>Abrir pasta</button>
            <button className="primario" onClick={() => onPublicado(noticia)}>
              Marcar como publicado
            </button>
          </>
        )}

        {(noticia.status === "erro" || noticia.status === "pronto") && (
          <button onClick={() => onRenderizarDeNovo(noticia)}>
            Renderizar de novo
          </button>
        )}

        {(noticia.status === "descartado" || noticia.status === "publicado") && (
          <button onClick={() => onRenderizarDeNovo(noticia)}>
            Mandar para a fila
          </button>
        )}
      </div>
    </article>
  );
};
