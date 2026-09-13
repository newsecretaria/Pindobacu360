/* Newsroom GTA VI — front-end do painel local */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const TIER = { oficial: "Oficial", imprensa: "Imprensa", fa: "Comunidade" };
const STATUS = { pauta: "Pauta", roteiro: "Roteiro", voz: "Voz", video: "Vídeo", aprovado: "Aprovado", publicado: "Publicado" };
const ORDER = ["pauta", "roteiro", "voz", "video", "aprovado", "publicado"];

const state = { view: "radar", tier: "", q: "", items: [], pautas: [], sources: [], status: null, pauta: null, clips: [] };

// ---------- util ----------
async function api(path, opts = {}) {
  const r = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, ...opts });
  let data = null;
  try { data = await r.json(); } catch { data = {}; }
  if (!r.ok) throw new Error((data && (data.erro || data.detail)) || `Erro ${r.status}`);
  return data;
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toast(msg, kind = "") {
  const t = document.createElement("div");
  t.className = "toast " + (kind ? "is-" + kind : "");
  t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 4200);
}
function tempo(iso) {
  if (!iso) return "";
  const d = new Date(iso), diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return "agora";
  if (diff < 60) return `${Math.floor(diff)} min`;
  if (diff < 48 * 60) return `${Math.floor(diff / 60)} h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
async function busy(btn, fn) {
  btn.disabled = true; btn.classList.add("is-busy");
  try { return await fn(); }
  catch (e) { toast(e.message, "bad"); if (state.pauta) $("#d-erro").textContent = e.message; }
  finally { btn.disabled = false; btn.classList.remove("is-busy"); }
}

// ---------- navegação ----------
$("#nav").addEventListener("click", (e) => {
  const b = e.target.closest(".nav__btn"); if (!b) return;
  state.view = b.dataset.view;
  $$(".nav__btn").forEach((x) => x.classList.toggle("is-active", x === b));
  $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === "view-" + state.view));
  if (state.view === "fontes") loadSources();
  if (state.view === "ajustes") loadSettings();
  if (state.view === "pautas") loadPautas();
});

// ---------- status ----------
async function loadStatus() {
  const s = (state.status = await api("/status"));
  const yt = s.youtube || {};
  const chip = (ok, label, cls = "") => `<span class="chip ${ok ? "is-ok" : cls || "is-bad"}"><span class="led"></span>${label}</span>`;
  $("#status").innerHTML = [
    chip(s.ffmpeg, "ffmpeg"),
    chip(s.claude, "Claude"),
    chip(s.elevenlabs, "ElevenLabs"),
    chip(yt.conectado, yt.conectado ? "YouTube · " + esc(yt.canal_titulo || "conectado") : "YouTube"),
    chip(true, `Uploads hoje ${s.uploads_hoje}/${s.uploads_max_dia}`, "is-warn"),
    `<span class="chip ${s.radar.rodando ? "is-warn" : "is-ok"}"><span class="led"></span>Radar ${s.radar.rodando ? "lendo…" : "a cada " + s.radar.intervalo_min + " min"}${s.radar.ultimo ? " · " + tempo(s.radar.ultimo) : ""}</span>`,
  ].join("");
  $("#n-radar").textContent = s.contagem.itens_novos || 0;
  const emAndamento = ORDER.filter((k) => k !== "publicado").reduce((a, k) => a + (s.contagem[k] || 0), 0);
  $("#n-pautas").textContent = emAndamento;
  $("#d-quota").textContent = `cota: ${s.uploads_hoje}/${s.uploads_max_dia} uploads hoje`;
}

// ---------- radar ----------
async function loadItems() {
  const p = new URLSearchParams(); if (state.tier) p.set("tier", state.tier); if (state.q) p.set("q", state.q);
  state.items = await api("/items?" + p.toString());
  renderItems(); renderWire();
}
function renderItems() {
  const feed = $("#feed");
  if (!state.items.length) {
    feed.innerHTML = `<div class="empty"><b>Nada no radar ainda</b>Clique em "Ler fontes agora" ou espere a próxima leitura automática.</div>`;
    return;
  }
  feed.innerHTML = state.items.map((it) => `
    <article class="item ${it.pauta_id ? "has-pauta" : ""}" data-id="${it.id}">
      <div class="item__stripe t-${it.tier}"></div>
      <div class="item__body">
        <div class="item__meta"><span class="c-${it.tier}">${TIER[it.tier] || it.tier}</span><span class="src">${esc(it.source_nome)}</span><span>${tempo(it.publicado_em || it.capturado_em)}</span>${it.pauta_id ? `<span class="tag">pauta #${it.pauta_id}</span>` : ""}</div>
        <div class="item__title"><a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.titulo)}</a></div>
        ${it.resumo ? `<div class="item__sum">${esc(it.resumo)}</div>` : ""}
      </div>
      <div class="item__actions">
        ${it.pauta_id ? `<button class="btn btn--sm" data-act="abrir" data-pid="${it.pauta_id}">Ver pauta</button>`
                      : `<button class="btn btn--primary btn--sm" data-act="pauta">Virar pauta</button>`}
        <button class="btn btn--ghost btn--sm" data-act="arquivar">Arquivar</button>
      </div>
    </article>`).join("");
}
$("#feed").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const id = +b.closest(".item").dataset.id;
  if (b.dataset.act === "pauta") await busy(b, async () => { const p = await api(`/items/${id}/pauta`, { method: "POST" }); toast("Virou pauta #" + p.id, "ok"); await Promise.all([loadItems(), loadStatus()]); openPauta(p.id); });
  if (b.dataset.act === "abrir") openPauta(+b.dataset.pid);
  if (b.dataset.act === "arquivar") await busy(b, async () => { await api(`/items/${id}/arquivar`, { method: "POST" }); await Promise.all([loadItems(), loadStatus()]); });
});
$("#tiers").addEventListener("click", (e) => {
  const b = e.target.closest(".tier-chip"); if (!b) return;
  state.tier = b.dataset.tier; $$(".tier-chip").forEach((x) => x.classList.toggle("is-active", x === b)); loadItems();
});
let qT; $("#q").addEventListener("input", (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim(); loadItems(); }, 250); });
$("#btn-refresh").addEventListener("click", async (e) => {
  const b = e.currentTarget; b.disabled = true; b.querySelector("span").textContent = "Lendo fontes…";
  try { const r = await api("/radar/refresh", { method: "POST" }); toast(r.ok ? `${r.novos} item(ns) novo(s)` : r.mensagem, r.ok ? "ok" : ""); const comErro = (r.fontes || []).filter((f) => f.erro); if (comErro.length) toast(`${comErro.length} fonte(s) com erro — veja a aba Fontes`, "bad"); }
  catch (err) { toast(err.message, "bad"); }
  finally { b.disabled = false; b.querySelector("span").textContent = "Ler fontes agora"; await Promise.all([loadItems(), loadStatus()]); }
});
$("#btn-manual").addEventListener("click", async () => {
  const titulo = prompt("Título da pauta manual:"); if (!titulo) return;
  const link = prompt("Link da fonte (opcional):") || null;
  const p = await api("/pautas", { method: "POST", body: JSON.stringify({ titulo_original: titulo, link, source_nome: "Manual", tier: "imprensa" }) });
  await loadStatus(); openPauta(p.id);
});
function renderWire() {
  const el = $("#wire");
  const its = state.items.slice(0, 14);
  if (!its.length) { el.innerHTML = `<span class="wire__empty">Aguardando a primeira leitura das fontes…</span>`; return; }
  const html = its.map((it) => `<span class="wire__item"><span class="dot t-${it.tier}"></span>${esc(it.titulo)} <small>· ${esc(it.source_nome)}</small></span>`).join("");
  el.innerHTML = html + html; // duplicado para o loop contínuo
}

// ---------- pautas (kanban) ----------
async function loadPautas() { state.pautas = await api("/pautas"); renderBoard(); }
function renderBoard() {
  $("#board").innerHTML = ORDER.map((st) => {
    const list = state.pautas.filter((p) => p.status === st);
    return `<div class="col"><div class="col__head"><span>${STATUS[st]}</span><b>${list.length}</b></div><div class="col__body">
      ${list.map((p) => `<div class="card" data-pid="${p.id}" style="border-left-color:var(--${p.tier === "oficial" ? "teal" : p.tier === "fa" ? "coral" : "amber"})">
        <div class="card__title">${esc(p.titulo || p.titulo_original)}</div>
        <div class="card__src">${esc(p.source_nome || "")}${p.eh_rumor ? '<span class="tag tag--rumor">rumor</span>' : ""}${p.audio_path ? '<span class="tag tag--ok">voz</span>' : ""}${p.video_path ? '<span class="tag tag--ok">vídeo</span>' : ""}</div>
        ${p.erro ? `<div class="card__err">${esc(p.erro.slice(0, 120))}</div>` : ""}
      </div>`).join("") || `<div class="empty" style="padding:22px 10px;font-size:13px">vazio</div>`}
    </div></div>`;
  }).join("");
}
$("#board").addEventListener("click", (e) => { const c = e.target.closest(".card"); if (c) openPauta(+c.dataset.pid); });

// ---------- editor da pauta ----------
async function loadClips() {
  state.clips = await api("/clips");
  const sel = $("#d-clip"), cur = state.pauta?.clip || "";
  sel.innerHTML = `<option value="">Fundo padrão (sem clipe)</option>` + state.clips.map((c) => `<option value="${esc(c.nome)}" ${c.nome === cur ? "selected" : ""}>${esc(c.nome)} · ${c.tipo} · ${c.tamanho_mb} MB</option>`).join("");
}
async function openPauta(id) {
  state.pauta = await api(`/pautas/${id}`);
  await loadClips();
  renderPauta();
  document.body.classList.add("drawer-open");
}
function renderPauta() {
  const p = state.pauta;
  $("#d-meta").innerHTML = `<span class="c-${p.tier}">${TIER[p.tier] || ""}</span><span>${esc(p.source_nome || "")}</span><span>#${p.id}</span>`;
  $("#d-title").textContent = p.titulo_original;
  const a = $("#d-link"); a.href = p.link || "#"; a.style.display = p.link ? "" : "none";
  $("#d-roteiro").value = p.roteiro || ""; $("#d-titulo").value = p.titulo || ""; $("#d-descricao").value = p.descricao || "";
  $("#d-hashtags").value = p.hashtags || ""; $("#d-rumor").checked = !!p.eh_rumor; $("#d-fonte").value = p.fonte_citada || p.source_nome || "";
  $("#d-erro").textContent = p.erro || "";
  $("#d-status").textContent = STATUS[p.status] || p.status;
  $("#d-agenda").value = "";
  // áudio
  const au = $("#d-audio");
  if (p.audio_path) { au.style.display = ""; au.innerHTML = `<audio controls src="/media/${p.audio_path}?v=${Date.parse(p.atualizado_em)}"></audio><div class="hint" style="color:var(--muted);font-size:12.5px;margin-top:6px">${p.audio_duracao ? p.audio_duracao + " s" : ""}${p.legenda_path ? " · legendas sincronizadas prontas" : " · sem legendas (a API não devolveu os tempos)"}</div>`; }
  else { au.style.display = "none"; au.innerHTML = ""; }
  // vídeo
  const vi = $("#d-video");
  if (p.video_path) { vi.style.display = ""; vi.innerHTML = `<video controls playsinline src="/media/${p.video_path}?v=${Date.parse(p.atualizado_em)}"></video><div class="row" style="margin-top:8px"><a class="btn btn--sm" href="/media/${p.video_path}" download>Baixar mp4</a></div>`; }
  else { vi.style.display = "none"; vi.innerHTML = ""; }
  // publicação
  $("#d-pub").innerHTML = p.youtube_url ? `<div class="ok">Enviado: <a href="${esc(p.youtube_url)}" target="_blank" rel="noopener">${esc(p.youtube_url)}</a></div>` : "";
  // passos
  [["#s1", 0], ["#s2", 1], ["#s3", 2], ["#s4", 3]].forEach(([sel, i]) => {
    const el = $(sel); el.classList.remove("is-done", "is-now");
    const done = [!!p.roteiro, !!p.audio_path, !!p.video_path, p.status === "publicado"][i];
    if (done) el.classList.add("is-done");
  });
  const now = !p.roteiro ? "#s1" : !p.audio_path ? "#s2" : !p.video_path ? "#s3" : "#s4";
  if (p.status !== "publicado") $(now).classList.add("is-now");
}
function closeDrawer() { document.body.classList.remove("drawer-open"); state.pauta = null; loadPautas(); loadStatus(); loadItems(); }
$("#d-close").addEventListener("click", closeDrawer); $("#scrim").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.pauta) closeDrawer(); });

async function salvarTexto() {
  const p = state.pauta;
  const body = { roteiro: $("#d-roteiro").value, titulo: $("#d-titulo").value, descricao: $("#d-descricao").value,
    hashtags: $("#d-hashtags").value, eh_rumor: $("#d-rumor").checked ? 1 : 0, fonte_citada: $("#d-fonte").value, clip: $("#d-clip").value };
  if (p.status === "pauta" && body.roteiro.trim()) body.status = "roteiro";
  state.pauta = await api(`/pautas/${p.id}`, { method: "PATCH", body: JSON.stringify(body) });
  return state.pauta;
}
$("#btn-salvar").addEventListener("click", (e) => busy(e.currentTarget, async () => { await salvarTexto(); renderPauta(); toast("Texto salvo", "ok"); }));
$("#btn-roteiro").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  await salvarTexto();
  state.pauta = await api(`/pautas/${state.pauta.id}/roteiro`, { method: "POST" }); renderPauta(); toast("Roteiro gerado — revise antes de gerar a voz", "ok");
}));
$("#btn-voz").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  await salvarTexto();
  if (!state.pauta.roteiro?.trim()) throw new Error("Escreva ou gere o roteiro primeiro.");
  state.pauta = await api(`/pautas/${state.pauta.id}/voz`, { method: "POST" }); renderPauta(); toast("Narração pronta", "ok");
}));
$("#btn-video").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  await salvarTexto();
  if (!state.pauta.audio_path) throw new Error("Gere a narração primeiro.");
  toast("Montando o vídeo… pode levar até um minuto");
  state.pauta = await api(`/pautas/${state.pauta.id}/video`, { method: "POST" }); renderPauta(); toast("Short montado — assista antes de aprovar", "ok");
}));
$("#d-upload").addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const fd = new FormData(); fd.append("arquivo", f);
  try { const r = await fetch("/api/clips", { method: "POST", body: fd }); const d = await r.json(); if (!r.ok) throw new Error(d.detail || d.erro || "Falha no envio"); toast("Arquivo enviado", "ok"); if (state.pauta) state.pauta.clip = d.nome; await loadClips(); }
  catch (err) { toast(err.message, "bad"); }
  e.target.value = "";
});
$("#btn-aprovar").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  await salvarTexto();
  if (!state.pauta.video_path) throw new Error("Monte o vídeo antes de aprovar.");
  state.pauta = await api(`/pautas/${state.pauta.id}`, { method: "PATCH", body: JSON.stringify({ status: "aprovado" }) }); renderPauta(); toast("Aprovada", "ok");
}));
$("#btn-publicar").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  await salvarTexto();
  if (!state.pauta.video_path) throw new Error("Monte o vídeo antes de publicar.");
  if (!state.status?.youtube?.conectado) throw new Error("Conecte o canal do YouTube em Ajustes.");
  const agenda = $("#d-agenda").value;
  let publicar_em = null;
  if (agenda) { const d = new Date(agenda); const off = -d.getTimezoneOffset(); const s = off >= 0 ? "+" : "-"; const pad = (n) => String(Math.abs(n)).padStart(2, "0"); publicar_em = `${agenda}:00${s}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`; }
  if (!confirm(agenda ? `Agendar para ${new Date(agenda).toLocaleString("pt-BR")}?` : `Enviar agora como "${$("#d-priv").selectedOptions[0].textContent}"?`)) return;
  toast("Enviando ao YouTube…");
  state.pauta = await api(`/pautas/${state.pauta.id}/publicar`, { method: "POST", body: JSON.stringify({ privacidade: $("#d-priv").value, publicar_em }) });
  renderPauta(); toast("Enviado ao YouTube", "ok");
}));
$("#btn-excluir").addEventListener("click", async () => {
  if (!confirm("Excluir esta pauta? Os arquivos de áudio/vídeo continuam na pasta media.")) return;
  await api(`/pautas/${state.pauta.id}`, { method: "DELETE" }); toast("Pauta excluída"); closeDrawer();
});

// ---------- fontes ----------
async function loadSources() { state.sources = await api("/sources"); renderSources(); }
function renderSources() {
  $("#src-table tbody").innerHTML = state.sources.map((s) => `
    <tr data-id="${s.id}">
      <td><label class="switch"><input type="checkbox" data-f="ativo" ${s.ativo ? "checked" : ""}></label></td>
      <td><div><span class="dot t-${s.tier}" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px"></span><b style="font-weight:500">${esc(s.nome)}</b> <span class="tag">${s.tipo}</span></div><div class="url">${esc(s.url)}</div>${s.ultimo_erro ? `<div class="err">${esc(s.ultimo_erro)}</div>` : ""}</td>
      <td><select class="input" data-f="tier"><option value="oficial" ${s.tier === "oficial" ? "selected" : ""}>Oficial</option><option value="imprensa" ${s.tier === "imprensa" ? "selected" : ""}>Imprensa</option><option value="fa" ${s.tier === "fa" ? "selected" : ""}>Comunidade</option></select></td>
      <td><label class="switch" title="Só guardar itens que batem nas palavras-chave"><input type="checkbox" data-f="filtrar" ${s.filtrar ? "checked" : ""}></label></td>
      <td style="white-space:nowrap;color:var(--muted)">${s.ultimo_fetch ? tempo(s.ultimo_fetch) : "—"}${s.ultimo_fetch && !s.ultimo_erro ? ` · ${s.ultimo_novos || 0} novo(s)` : ""}</td>
      <td style="white-space:nowrap"><button class="btn btn--sm" data-act="testar">Testar</button> <button class="btn btn--ghost btn--sm" data-act="remover">Remover</button></td>
    </tr>`).join("");
}
$("#src-table").addEventListener("change", async (e) => {
  const inp = e.target.closest("[data-f]"); if (!inp) return;
  const id = +inp.closest("tr").dataset.id; const f = inp.dataset.f;
  const val = inp.type === "checkbox" ? (inp.checked ? 1 : 0) : inp.value;
  try { await api(`/sources/${id}`, { method: "PATCH", body: JSON.stringify({ [f]: val }) }); toast("Fonte atualizada", "ok"); } catch (err) { toast(err.message, "bad"); }
});
$("#src-table").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const id = +b.closest("tr").dataset.id;
  if (b.dataset.act === "testar") await busy(b, async () => { const r = await api(`/sources/${id}/testar`, { method: "POST" }); toast(r.ok ? `OK — ${r.novos} novo(s)` : r.erro, r.ok ? "ok" : "bad"); await loadSources(); });
  if (b.dataset.act === "remover") { if (!confirm("Remover esta fonte?")) return; await api(`/sources/${id}`, { method: "DELETE" }); await loadSources(); }
});
$("#btn-add-src").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  const nome = $("#src-nome").value.trim(), url = $("#src-url").value.trim();
  if (!nome || !url) throw new Error("Preencha nome e URL.");
  await api("/sources", { method: "POST", body: JSON.stringify({ nome, url, tipo: $("#src-tipo").value, tier: $("#src-tier").value, filtrar: $("#src-filtrar").checked ? 1 : 0 }) });
  $("#src-nome").value = ""; $("#src-url").value = ""; toast("Fonte adicionada — clique em Testar", "ok"); await loadSources();
}));

// ---------- ajustes ----------
async function loadSettings() {
  const s = await api("/settings");
  $$("[data-k]").forEach((el) => { const k = el.dataset.k; el.value = Array.isArray(s[k]) ? s[k].join(", ") : (s[k] ?? ""); });
  renderYt();
}
function renderYt() {
  const yt = state.status?.youtube || {}; const el = $("#yt-status");
  el.className = "chip " + (yt.conectado ? "is-ok" : "is-bad");
  el.innerHTML = `<span class="led"></span>${yt.conectado ? "Conectado · " + esc(yt.canal_titulo || "") + (yt.canal_handle ? " (" + esc(yt.canal_handle) + ")" : "") : "YouTube não conectado"}${yt.erro ? " · " + esc(yt.erro) : ""}`;
}
$("#btn-save").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  const body = {}; $$("[data-k]").forEach((el) => { body[el.dataset.k] = el.type === "number" ? Number(el.value) : el.value; });
  await api("/settings", { method: "PUT", body: JSON.stringify(body) }); toast("Ajustes salvos", "ok"); await loadStatus(); await loadSettings();
}));
$("#btn-yt").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  toast("Abrindo o navegador para autorizar…");
  await api("/youtube/conectar", { method: "POST" }); await loadStatus(); renderYt(); toast("Canal conectado", "ok");
}));
$("#btn-yt-off").addEventListener("click", async () => { await api("/youtube/desconectar", { method: "POST" }); await loadStatus(); renderYt(); toast("Desconectado"); });
$("#btn-vozes").addEventListener("click", (e) => busy(e.currentTarget, async () => {
  // salva a chave antes de listar
  const key = $("[data-k=elevenlabs_api_key]").value; if (key && !key.startsWith("••")) await api("/settings", { method: "PUT", body: JSON.stringify({ elevenlabs_api_key: key }) });
  const vozes = await api("/elevenlabs/vozes");
  const sel = $("#vozes-sel"); sel.style.display = ""; sel.innerHTML = `<option value="">Escolha uma voz…</option>` + vozes.map((v) => `<option value="${esc(v.voice_id)}">${esc(v.name)} ${v.labels?.language ? "· " + esc(v.labels.language) : ""}</option>`).join("");
  sel.onchange = () => { $("[data-k=elevenlabs_voice_id]").value = sel.value; };
}));

// ---------- início ----------
(async function init() {
  try { await loadStatus(); await loadItems(); } catch (e) { toast(e.message, "bad"); }
  setInterval(async () => { try { await loadStatus(); if (state.view === "radar" && !state.pauta) await loadItems(); } catch {} }, 30000);
})();
