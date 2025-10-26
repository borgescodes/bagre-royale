// main.js: reexibe títulos no dropdown e posiciona badge de série à direita do nome
(function () {
  const REG = (window.BAGRE_DATA && window.BAGRE_DATA.players) || {};
  const D = (window.BAGRE_DATA && typeof window.BAGRE_DATA === "object") ? window.BAGRE_DATA : { players: {}, tournaments: [] };
  let IDX = null;

  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    if (props && typeof props === "object") {
      for (const [k, v] of Object.entries(props)) {
        if (v == null) continue;
        if (k === "className") { n.setAttribute("class", v); continue; }
        if (k === "style" && typeof v === "object") { Object.assign(n.style, v); continue; }
        if (k.includes("-") || k.startsWith("aria") || k.startsWith("data")) { n.setAttribute(k, v); continue; }
        try { if (k in n) n[k] = v; else n.setAttribute(k, v); } catch (_) { n.setAttribute(k, v); }
      }
    }
    for (const c of children || []) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return n;
  }
  const text = (v) => String(v == null ? "" : v);

  async function fetchJSON(url) {
    try { const res = await fetch(url); if (!res.ok) return null; return await res.json(); } catch (_) { return null; }
  }

  function fmtDate(d) {
    const dt = d ? new Date(d) : null;
    if (!dt || isNaN(dt)) return "";
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  function normStatus(s) {
    const v = String(s || "").toLowerCase();
    if (v === "finished" || v === "done" || v === "finalizado" || v === "concluido" || v === "concluído") return "done";
    if (v === "upcoming" || v === "em breve") return "upcoming";
    return "current";
  }
  function statusText(s) {
    if (s === "upcoming") return "Em breve";
    if (s === "done") return "Finalizado";
    return "Atual";
  }

  function mapTemporadas(t) {
    return (Array.isArray(t) ? t : []).map((s) => ({
      id: s.id || s.season || s.codigo || "",
      name: s.name || s.nome || s.titulo || "Campeonato",
      cover: s.cover || s.capa || "",
      date: s.date || s.inicio || "",
      status: normStatus(s.status),
    }));
  }

  function tournamentsFromSource() {
    if (IDX && Array.isArray(IDX.temporadas)) return mapTemporadas(IDX.temporadas);
    return Array.isArray(D.tournaments) ? D.tournaments.slice() : [];
  }

  function buildTournamentCard(t) {
    const cover = el("img", { className: "card-cover", src: text(t.cover || ""), alt: text(t.name || "Capa") });
    const body = el("div", { className: "card-body" });
    const title = el("h3", { className: "card-title" }, [text(t.name || "Campeonato")]);
    const when = fmtDate(t.date);
    const metaText = when ? `${statusText(t.status)} • ${when}` : statusText(t.status);
    const meta = el("p", { className: "card-meta" }, [metaText]);
    const link = el("a", { className: "card-link", href: `season.html?id=${encodeURIComponent(t.id || "")}`, "aria-label": `Abrir ${text(t.name || "campeonato")}` });
    body.appendChild(title);
    body.appendChild(meta);
    return el("article", { className: "card" }, [cover, body, link]);
  }

  function sortTournaments(list) {
    const arr = list.slice();
    arr.sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      if (db !== da) return db - da;
      const ra = a.status === "upcoming" ? 0 : 1;
      const rb = b.status === "upcoming" ? 0 : 1;
      return ra - rb;
    });
    return arr;
  }

  function playersFromIndex() {
    if (!IDX) return null;
    const agg = IDX.playersAgg;
    const list = Array.isArray(agg) ? agg : (agg && typeof agg === "object" ? Object.entries(agg).map(([k, v]) => ({ id: k, ...(v || {}) })) : null);
    if (!list) return null;
    return list.map((e) => {
      const byId = e.id && (REG[e.id] || REG[e.name]);
      const name = e.name || (byId && byId.name) || e.id || "";
      const reg = REG[name] || byId || {};
      return {
        name,
        avatar: reg.avatar || "",
        achievements: Array.isArray(reg.achievements) ? reg.achievements : [],
        wins: Number(e.wins) || 0,
        losses: Number(e.losses) || 0,
        saldo: Number(e.saldo) || 0,
        series: Number(e.series) || 0,
        titles: Number(e.titles) || 0,
        serie: typeof e.serie === "string" ? e.serie.toLowerCase() : ""
      };
    });
  }

  function aggregatePlayersFromData() {
    const out = {};
    const players = D.players || {};
    for (const key of Object.keys(players)) {
      const p = players[key] || {};
      out[key] = { name: p.name || key, avatar: p.avatar || "", achievements: Array.isArray(p.achievements) ? p.achievements : [], wins: 0, losses: 0, saldo: 0, series: 0, titles: 0, serie: "" };
    }
    const tours = Array.isArray(D.tournaments) ? D.tournaments : [];
    for (const t of tours) {
      const s = t && t.status ? String(t.status).toLowerCase() : "";
      if (s && s !== "done" && s !== "finalizado" && s !== "concluído" && s !== "concluido") continue;
      const matches = Array.isArray(t.matches) ? t.matches : [];
      for (const m of matches) {
        if (!m || !m.a || !m.b) continue;
        const a = m.a, b = m.b;
        const as = Number(m.as) || 0, bs = Number(m.bs) || 0;
        if (!out[a]) out[a] = { name: a, avatar: "", achievements: [], wins: 0, losses: 0, saldo: 0, series: 0, titles: 0, serie: "" };
        if (!out[b]) out[b] = { name: b, avatar: "", achievements: [], wins: 0, losses: 0, saldo: 0, series: 0, titles: 0, serie: "" };
        out[a].series++; out[b].series++;
        if (as > bs) { out[a].wins++; out[b].losses++; out[a].saldo += as - bs; out[b].saldo -= as - bs; }
        else if (bs > as) { out[b].wins++; out[a].losses++; out[b].saldo += bs - as; out[a].saldo -= bs - as; }
      }
      if (Array.isArray(t.ranking) && t.ranking[0] && t.ranking[0].name) {
        const champ = t.ranking[0].name;
        if (!out[champ]) out[champ] = { name: champ, avatar: "", achievements: [], wins: 0, losses: 0, saldo: 0, series: 0, titles: 0, serie: "" };
        out[champ].titles++;
      }
    }
    return Object.values(out);
  }

  function buildPlayerCard(p) {
    const root = el("div", { className: "player", role: "button", tabIndex: 0, "aria-expanded": "false" });
    if (p.name === "Person") root.classList.add("player--person");

    const ava = el("img", { className: "player-avatar", src: text(p.avatar || ""), alt: text(p.name) });

    const info = el("div");

    const name = el("h4", { className: "player-name" }, [text(p.name)]);
    const nameRow = el("div", { className: "player-name-row", style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" } });
    nameRow.appendChild(name);

    const serie = String(p.serie || "").toLowerCase();
    if (serie === "a") nameRow.appendChild(el("span", { className: "badge badge-serie badge-serie-a" }, ["Série A"]));
    else if (serie === "b") nameRow.appendChild(el("span", { className: "badge badge-serie badge-serie-b" }, ["Série B"]));

    const sub = el("p", { className: "player-sub" }, [`${p.titles || 0} título(s)`]);
    const toggle = el("button", { className: "player-toggle", "aria-label": "Expandir detalhes" }, ["^"]);
    const details = el("div", { className: "player-details" });

    const ach = Array.isArray(p.achievements) ? p.achievements.filter(Boolean) : [];
    if (ach.length > 0) {
      const list = el("ul", { className: "player-achievements" });
      for (const t of ach) list.appendChild(el("li", {}, [text(t)]));
      details.appendChild(list);
    }

    info.appendChild(nameRow);
    info.appendChild(sub);
    info.appendChild(details);

    root.appendChild(ava);
    root.appendChild(info);
    root.appendChild(toggle);

    function toggleOpen() {
      const isOpen = root.classList.toggle("is-open");
      root.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    root.addEventListener("click", (e) => { if (e.target === toggle) toggleOpen(); });
    root.addEventListener("keypress", (e) => { if (e.key === "Enter" || e.key === " ") toggleOpen(); });

    return root;
  }

  function sortPlayers(arr, mode) {
    const a = arr.slice();
    if (mode === "wins") {
      a.sort((x, y) => y.wins - x.wins || y.saldo - x.saldo || y.titles - x.titles || x.name.localeCompare(y.name));
    } else if (mode === "name") {
      a.sort((x, y) => x.name.localeCompare(y.name));
    } else {
      a.sort((x, y) => y.titles - x.titles || y.wins - x.wins || y.saldo - x.saldo || x.name.localeCompare(y.name));
    }
    return a;
  }

  function renderCarousel() {
    const root = document.getElementById("carousel");
    if (!root) return;
    root.innerHTML = "";
    const items = sortTournaments(tournamentsFromSource());
    for (const t of items) root.appendChild(buildTournamentCard(t));
  }

  function renderExternalCarousel(containerId, catalog) {
    const root = document.getElementById(containerId);
    if (!root || !catalog) return;
    root.innerHTML = "";
    const items = sortTournaments(mapTemporadas(catalog.temporadas));
    for (const t of items) root.appendChild(buildTournamentCard(t));
  }

  function renderPlayers() {
    const box = document.getElementById("playersGrid");
    if (!box) return;
    const select = document.getElementById("playerSort");
    const mode = select ? select.value : "titles";
    const fromIndex = playersFromIndex();
    const list = sortPlayers(fromIndex || aggregatePlayersFromData(), mode);
    box.innerHTML = "";
    if (list.length === 0) {
      box.appendChild(el("div", { className: "card-body" }, ["Nenhum jogador encontrado"]));
      return;
    }
    for (const p of list) box.appendChild(buildPlayerCard(p));
  }

  async function wire() {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
    IDX = await fetchJSON("data/index.json");
    const bagreA = await fetchJSON("data/bagreleirao-a.json");
    const bagreB = await fetchJSON("data/bagreleirao-b.json");
    renderCarousel();
    renderExternalCarousel("carousel-bagreleirao-a", bagreA);
    renderExternalCarousel("carousel-bagreleirao-b", bagreB);
    const sort = document.getElementById("playerSort");
    if (sort) sort.addEventListener("change", renderPlayers);
    renderPlayers();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
