import React, { useCallback, useEffect, useState } from "react";
import { api, type Estado, type Noticia } from "./api";
import { CartaoNoticia } from "./componentes/CartaoNoticia";
import { Configuracoes } from "./componentes/Configuracoes";
import { EditorNoticia } from "./componentes/EditorNoticia";

const ABAS = [
  { chave: "novas", rotulo: "Novas", status: ["novo", "relevante"] },
  { chave: "aprovadas", rotulo: "Aprovadas", status: ["aprovado", "renderizando"] },
  { chave: "prontas", rotulo: "Prontas", status: ["pronto"] },
  { chave: "publicadas", rotulo: "Publicadas", status: ["publicado"] },
  { chave: "descartadas", rotulo: "Descartadas", status: ["descartado"] },
  { chave: "erros", rotulo: "Erros", status: ["erro"] },
] as const;

type ChaveAba = (typeof ABAS)[number]["chave"] | "config";

export const App: React.FC = () => {
  const [aba, setAba] = useState<ChaveAba>("novas");
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [editando, setEditando] = useState<Noticia | null>(null);
  const [vendoVideo, setVendoVideo] = useState<Noticia | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const [e, n] = await Promise.all([
        api.estado(),
        aba === "config"
          ? Promise.resolve({ noticias: [] })
          : api.noticias(aba),
      ]);
      setEstado(e);
      setNoticias(n.noticias);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, [aba]);

  useEffect(() => {
    void recarregar();
    const t = setInterval(() => void recarregar(), 15000);
    return () => clearInterval(t);
  }, [recarregar]);

  async function comAviso(acao: () => Promise<string>) {
    setOcupado(true);
    setErro(null);
    setMensagem(null);
    try {
      setMensagem(await acao());
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
      void recarregar();
    }
  }

  const contagem = (status: readonly string[]) =>
    status.reduce((total, s) => total + (estado?.contagens[s] ?? 0), 0);

  return (
    <>
      <header className="topo">
        <div className="marca">
          <strong>Pindobaçu Shorts</strong>
          <span>
            {estado?.perfil.nome} {estado?.perfil.arroba}
          </span>
        </div>
        <div className="acoes-topo">
          {estado && !estado.temChaveAnthropic && (
            <span className="etiqueta urgencia-alta">sem ANTHROPIC_API_KEY</span>
          )}
          {estado?.filaOcupada && <span className="etiqueta">renderizando…</span>}
          <button
            disabled={ocupado}
            onClick={() =>
              comAviso(async () => {
                const { resumo } = await api.coletar();
                return `Coleta: ${resumo.novas} nova(s), ${resumo.repetidas} repetida(s)${
                  resumo.erros.length
                    ? `, ${resumo.erros.length} fonte(s) com erro`
                    : ""
                }.`;
              })
            }
          >
            Coletar agora
          </button>
          <button
            className="primario"
            disabled={ocupado}
            onClick={() =>
              comAviso(async () => {
                const { resumo } = await api.curar();
                return `Curadoria: ${resumo.analisadas} analisada(s), ${resumo.relevantes} relevante(s), ${resumo.descartadas} descartada(s).`;
              })
            }
          >
            Curar novas
          </button>
        </div>
      </header>

      <nav className="abas">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            className={aba === a.chave ? "ativa" : ""}
            onClick={() => setAba(a.chave)}
          >
            {a.rotulo}
            <span className="contador">{contagem(a.status)}</span>
          </button>
        ))}
        <button
          className={aba === "config" ? "ativa" : ""}
          onClick={() => setAba("config")}
        >
          Configurações
        </button>
      </nav>

      {erro && <div className="tarja erro">{erro}</div>}
      {mensagem && <div className="tarja ok">{mensagem}</div>}

      <main className="conteudo">
        {aba === "config" ? (
          <Configuracoes />
        ) : noticias.length === 0 ? (
          <p className="vazio">
            Nada por aqui. Use “Coletar agora” e depois “Curar novas”.
          </p>
        ) : (
          <div className="lista">
            {noticias.map((n) => (
              <CartaoNoticia
                key={n.id}
                noticia={n}
                onEditar={setEditando}
                onVerVideo={setVendoVideo}
                onAprovar={(x) =>
                  comAviso(async () => {
                    await api.aprovar(x.id);
                    return `Notícia ${x.id} aprovada e na fila de render.`;
                  })
                }
                onDescartar={(x) =>
                  comAviso(async () => {
                    await api.descartar(x.id);
                    return `Notícia ${x.id} descartada.`;
                  })
                }
                onPublicado={(x) =>
                  comAviso(async () => {
                    await api.marcarPublicado(x.id);
                    return `Notícia ${x.id} marcada como publicada.`;
                  })
                }
                onRenderizarDeNovo={(x) =>
                  comAviso(async () => {
                    await api.renderizarDeNovo(x.id);
                    return `Notícia ${x.id} voltou para a fila de render.`;
                  })
                }
                onAbrirPasta={(x) =>
                  comAviso(async () => {
                    const r = await api.abrirPasta(x.id);
                    return `Abrindo ${r.pasta}`;
                  })
                }
                onCopiarLegenda={(x) =>
                  comAviso(async () => {
                    await navigator.clipboard.writeText(x.legenda ?? "");
                    return "Legenda copiada.";
                  })
                }
              />
            ))}
          </div>
        )}
      </main>

      {editando && (
        <EditorNoticia
          noticia={editando}
          onFechar={() => setEditando(null)}
          onSalvar={async (dados) => {
            await api.salvar(editando.id, dados);
            await recarregar();
          }}
        />
      )}

      {vendoVideo && (
        <div className="sobreposicao" onClick={() => setVendoVideo(null)}>
          <div className="painel-editor" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0 }}>{vendoVideo.manchete}</h2>
            <video src={`/api/noticias/${vendoVideo.id}/video`} controls />
            <pre className="json">{vendoVideo.legenda}</pre>
            <div className="acoes">
              <button onClick={() => setVendoVideo(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
