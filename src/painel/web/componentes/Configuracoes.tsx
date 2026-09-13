import React, { useEffect, useState } from "react";
import { api } from "../api";

type Fonte = {
  nome: string;
  tipo: "rss" | "site" | "instagram";
  url: string;
  seletor?: string;
  ativo: boolean;
};

/** Aba de configuracoes: portais, regiao, cores, hashtags e intervalo da coleta. */
export const Configuracoes: React.FC = () => {
  const [config, setConfig] = useState<any | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .config()
      .then((r) => setConfig(r.config))
      .catch((e) => setErro(String(e)));
  }, []);

  if (erro) return <div className="tarja erro">{erro}</div>;
  if (!config) return <p className="vazio">Carregando configurações...</p>;

  function mudar(caminho: string[], valor: unknown) {
    setConfig((atual: any) => {
      const copia = structuredClone(atual);
      let alvo = copia;
      for (const parte of caminho.slice(0, -1)) alvo = alvo[parte];
      alvo[caminho[caminho.length - 1]!] = valor;
      return copia;
    });
  }

  async function salvar() {
    setMensagem(null);
    setErro(null);
    try {
      const r = await api.salvarConfig(config);
      setConfig(r.config);
      setMensagem("Configurações salvas em dados/config.json.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  const fontes: Fonte[] = config.fontes ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {mensagem && <div className="tarja ok">{mensagem}</div>}

      <section className="cartao">
        <h3>Perfil</h3>
        <div className="linha">
          <label>
            Nome
            <input
              value={config.perfil.nome}
              onChange={(e) => mudar(["perfil", "nome"], e.target.value)}
            />
          </label>
          <label>
            @
            <input
              value={config.perfil.arroba}
              onChange={(e) => mudar(["perfil", "arroba"], e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="cartao">
        <h3>Cores da marca</h3>
        <div className="linha">
          {Object.keys(config.cores).map((chave) => (
            <label key={chave}>
              {chave}
              <input
                value={config.cores[chave]}
                onChange={(e) => mudar(["cores", chave], e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="cartao">
        <h3>Fontes (portais e perfis)</h3>
        <p className="meta">
          Fontes do tipo "site" e "instagram" ainda não são coletadas
          automaticamente (item 6 da ordem de implementação).
        </p>
        {fontes.map((fonte, i) => (
          <div className="linha" key={i}>
            <label>
              Nome
              <input
                value={fonte.nome}
                onChange={(e) => mudar(["fontes", String(i), "nome"], e.target.value)}
              />
            </label>
            <label>
              Tipo
              <select
                value={fonte.tipo}
                onChange={(e) => mudar(["fontes", String(i), "tipo"], e.target.value)}
              >
                <option value="rss">rss</option>
                <option value="site">site</option>
                <option value="instagram">instagram</option>
              </select>
            </label>
            <label style={{ flex: "2 1 320px" }}>
              URL
              <input
                value={fonte.url}
                onChange={(e) => mudar(["fontes", String(i), "url"], e.target.value)}
              />
            </label>
            <label>
              <span>
                <input
                  type="checkbox"
                  style={{ width: "auto", marginRight: 8 }}
                  checked={fonte.ativo}
                  onChange={(e) =>
                    mudar(["fontes", String(i), "ativo"], e.target.checked)
                  }
                />
                ativa
              </span>
              <button
                className="perigo"
                onClick={() =>
                  setConfig({
                    ...config,
                    fontes: fontes.filter((_, j) => j !== i),
                  })
                }
              >
                remover
              </button>
            </label>
          </div>
        ))}
        <button
          onClick={() =>
            setConfig({
              ...config,
              fontes: [
                ...fontes,
                { nome: "Nova fonte", tipo: "rss", url: "", ativo: false },
              ],
            })
          }
        >
          + fonte
        </button>
      </section>

      <section className="cartao">
        <h3>Região e coleta</h3>
        <label>
          Cidades da região (separadas por vírgula)
          <textarea
            rows={2}
            value={config.regiao.cidades.join(", ")}
            onChange={(e) =>
              mudar(
                ["regiao", "cidades"],
                e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
              )
            }
          />
        </label>
        <label>
          Hashtags fixas (separadas por espaço)
          <input
            value={config.hashtagsFixas.join(" ")}
            onChange={(e) =>
              mudar(
                ["hashtagsFixas"],
                e.target.value.split(/\s+/).filter(Boolean),
              )
            }
          />
        </label>
        <div className="linha">
          <label>
            Intervalo da coleta (minutos)
            <input
              type="number"
              value={config.coleta.intervaloMinutos}
              onChange={(e) =>
                mudar(["coleta", "intervaloMinutos"], Number(e.target.value))
              }
            />
          </label>
          <label>
            Modelo da curadoria
            <input
              value={config.curadoria.modelo}
              onChange={(e) => mudar(["curadoria", "modelo"], e.target.value)}
            />
          </label>
          <label>
            Notícias curadas por rodada
            <input
              type="number"
              value={config.curadoria.maxPorRodada}
              onChange={(e) =>
                mudar(["curadoria", "maxPorRodada"], Number(e.target.value))
              }
            />
          </label>
        </div>
      </section>

      <div className="acoes">
        <button className="primario" onClick={salvar}>
          Salvar configurações
        </button>
      </div>
    </div>
  );
};
