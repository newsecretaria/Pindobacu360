export type Noticia = {
  id: number;
  status: string;
  fonte: string;
  fonteTipo: string;
  titulo: string;
  resumo: string;
  link: string;
  imagemUrl: string | null;
  publicadoEm: string | null;
  coletadoEm: string;
  relevante: boolean | null;
  motivoDescarte: string | null;
  categoria: string | null;
  urgencia: string | null;
  manchete: string | null;
  frases: string[];
  legenda: string | null;
  fundo: string | null;
  verificar: boolean;
  verificarMotivo: string | null;
  videoArquivo: string | null;
  legendaArquivo: string | null;
  renderErro: string | null;
  editadoManualmente: boolean;
  atualizadoEm: string;
};

export type Estado = {
  contagens: Record<string, number>;
  filaOcupada: boolean;
  temChaveAnthropic: boolean;
  perfil: { nome: string; arroba: string; url: string };
  cores: Record<string, string>;
  fundos: { categoria: string; arquivos: number }[];
};

async function pedir<T>(url: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opcoes,
  });
  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : {};
  if (!resposta.ok) {
    throw new Error(dados?.erro ?? `Erro ${resposta.status}`);
  }
  return dados as T;
}

export const api = {
  estado: () => pedir<Estado>("/api/estado"),
  noticias: (aba: string) =>
    pedir<{ noticias: Noticia[] }>(`/api/noticias?aba=${aba}`),
  salvar: (id: number, dados: Partial<Noticia>) =>
    pedir<{ noticia: Noticia }>(`/api/noticias/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dados),
    }),
  aprovar: (id: number) =>
    pedir<{ noticia: Noticia }>(`/api/noticias/${id}/aprovar`, {
      method: "POST",
    }),
  descartar: (id: number) =>
    pedir<{ noticia: Noticia }>(`/api/noticias/${id}/descartar`, {
      method: "POST",
    }),
  marcarPublicado: (id: number) =>
    pedir<{ noticia: Noticia }>(`/api/noticias/${id}/publicado`, {
      method: "POST",
    }),
  renderizarDeNovo: (id: number) =>
    pedir<{ noticia: Noticia }>(`/api/noticias/${id}/renderizar`, {
      method: "POST",
    }),
  abrirPasta: (id: number) =>
    pedir<{ ok: boolean; pasta: string }>(`/api/noticias/${id}/abrir-pasta`, {
      method: "POST",
    }),
  coletar: () => pedir<{ resumo: ResumoColeta }>("/api/coletar", { method: "POST" }),
  curar: () => pedir<{ resumo: ResumoCuradoria }>("/api/curar", { method: "POST" }),
  config: () => pedir<{ config: any; categorias: string[] }>("/api/config"),
  salvarConfig: (config: unknown) =>
    pedir<{ config: any }>("/api/config", {
      method: "PUT",
      body: JSON.stringify(config),
    }),
  eventos: () =>
    pedir<{ eventos: { id: number; tipo: string; mensagem: string; criadoEm: string }[] }>(
      "/api/eventos",
    ),
};

export type ResumoColeta = {
  lidas: number;
  novas: number;
  repetidas: number;
  erros: { fonte: string; erro: string }[];
};

export type ResumoCuradoria = {
  analisadas: number;
  relevantes: number;
  descartadas: number;
  erros: { id: number; erro: string }[];
};
