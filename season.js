(function(){ 
  const D = window.BAGRE_DATA || {};
  const E = window.BAGRE_ENGINE || {};

  function el(tag, props, children){
    const n = document.createElement(tag);
    if (props && typeof props === "object") {
      for (const [k, v] of Object.entries(props)) {
        if (v == null) continue;
        if (k === "className") n.setAttribute("class", v);
        else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
        else if (k in n) { try { n[k] = v; } catch(_) { n.setAttribute(k, v); } }
        else n.setAttribute(k, v);
      }
    }
    if (Array.isArray(children)) for (const c of children) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return n;
  }
  function qs(s){ return document.querySelector(s); }
  function text(v){ return String(v == null ? "" : v); }
  function param(name){ try { return new URL(window.location.href).searchParams.get(name); } catch(_) { return null; } }
  function setYear(){ const y = qs("#year"); if (y) y.textContent = String(new Date().getFullYear()); }
  function normStatus(s){
    const v = String(s || "").toLowerCase();
    if (v === "finished" || v === "finalizado" || v === "concluido" || v === "concluído" || v === "done") return "finished";
    if (v === "upcoming" || v === "em breve" || v === "breve") return "upcoming";
    return "ongoing";
  }
  function fmtDateISO(d){
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    const dd = String(dt.getDate()).padStart(2,"0");
    const mm = String(dt.getMonth()+1).padStart(2,"0");
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  async function fetchJSON(url){
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch(_) { return null; }
  }
  function derivePlayers(data){
    const out = new Map();
    const reg = (D && D.players) || {};
    const add = (id, name) => {
      const key = id || name || "";
      if (!key) return;
      if (!out.has(key)) {
        const regBy = reg[key] || reg[name || ""] || {};
        out.set(key, { id: key, nome: regBy.name || name || key, avatar: regBy.avatar || "" });
      }
    };
    if (Array.isArray(data.jogadores)) for (const j of data.jogadores) add(j.id, j.nome || j.name || j.id);
    if (Array.isArray(data.ranking)) for (const r of data.ranking) add(r.playerId || r.id || r.name, r.name || r.playerId || r.id);
    if (Array.isArray(data.jogos)) for (const m of data.jogos) { add(m.homeId, m.homeName); add(m.awayId, m.awayName); }
    return Array.from(out.values());
  }
  function normalizeFromLegacy(t){
    const status = normStatus(t.status);
    const jogos = Array.isArray(t.matches) ? t.matches.map(m => ({
      round: m.round || m.r || null,
      date: m.date || m.d || null,
      homeId: m.a,
      awayId: m.b,
      homeScore: m.as != null ? Number(m.as) : null,
      awayScore: m.bs != null ? Number(m.bs) : null,
      status: (m.as != null || m.bs != null) ? "final" : "agendado"
    })) : [];
    const ids = Array.from(new Set(jogos.flatMap(m => [m.homeId, m.awayId]).filter(Boolean)));
    const jogadores = ids.map(id => ({ id, nome: id }));
    const ranking = Array.isArray(t.ranking) ? t.ranking.map((r, i) => ({
      pos: i + 1,
      playerId: r.name || r.playerId || r.id,
      name: r.name || r.playerId || r.id,
      wins: Number(r.wins || 0),
      losses: Number(r.losses || 0),
      draws: Number(r.draws || 0),
      saldo: Number(r.saldo || 0),
      series: Number(r.series || 0)
    })) : null;
    return {
      season: t.id || t.season || "",
      nome: t.name || t.nome || "Campeonato",
      inicio: t.date || t.inicio || null,
      fim: t.fim || null,
      status,
      cover: t.cover || "",
      jogos,
      jogadores,
      ranking,
      resumo: t.summary || t.resumo || null,
      destaques: t.highlights || t.destaques || null,
      config: { pontos: { vitoria: 3, empate: 1, derrota: 0 }, criterios: ["points","wins","gd","goalsFor","nameAsc"] }
    };
  }

  function computeRanking(data){
    const PV = Number((((data||{}).config||{}).pontos||{}).vitoria ?? 3);
    const map = new Map();
    const h2h = new Map();
    const ensure = (id, name) => {
      if (!map.has(id)) map.set(id, { id, name: name || id, wins: 0, losses: 0, draws: 0, dv: 0, ga: 0, saldo: 0, series: 0, points: 0 });
      return map.get(id);
    };
    const ensureH2H = (a, b) => {
      if (!h2h.has(a)) h2h.set(a, new Map());
      const row = h2h.get(a);
      if (!row.has(b)) row.set(b, { pts: 0, dv: 0, diff: 0 });
      return row.get(b);
    };
    const roster = Array.isArray(data.jogadores) ? data.jogadores : [];
    for (const j of roster) ensure(j.id, j.nome || j.name || j.id);
    for (const m of (data.jogos || [])) {
      const done = (m.homeScore != null) && (m.awayScore != null);
      if (!done) continue;
      const A = ensure(m.homeId, m.homeName);
      const B = ensure(m.awayId, m.awayName);
      const as = Number(m.homeScore || 0), bs = Number(m.awayScore || 0);
      A.series++; B.series++;
      A.dv += as; B.dv += bs;
      A.ga += bs; B.ga += as;
      A.saldo += as - bs; B.saldo += bs - as;
      if (as > bs) { A.wins++; B.losses++; A.points += PV; }
      else if (bs > as) { B.wins++; A.losses++; B.points += PV; }
      else { A.draws++; B.draws++; }
      A.points += as;
      B.points += bs;
      const hAB = ensureH2H(A.id, B.id);
      const hBA = ensureH2H(B.id, A.id);
      if (as > bs) { hAB.pts += PV; }
      else if (bs > as) { hBA.pts += PV; }
      hAB.dv += as; hBA.dv += bs;
      hAB.diff += (as - bs); hBA.diff += (bs - as);
    }
    const list = Array.from(map.values());
    list.sort((x, y) => (y.points - x.points) || 0);
    let i = 0;
    while (i < list.length) {
      let j = i + 1;
      while (j < list.length && list[j].points === list[i].points) j++;
      if (j - i > 1) {
        const group = list.slice(i, j);
        const ids = new Set(group.map(p => p.id));
        group.sort((a, b) => {
          const ha = h2h.get(a.id) || new Map();
          const hb = h2h.get(b.id) || new Map();
          let pa = 0, pb = 0, dva = 0, dvb = 0, da = 0, db = 0;
          for (const opp of ids) {
            if (opp === a.id || opp === b.id) continue;
            const ra = ha.get(opp); if (ra) { pa += ra.pts; dva += ra.dv; da += ra.diff; }
            const rb = hb.get(opp); if (rb) { pb += rb.pts; dvb += rb.dv; db += rb.diff; }
          }
          const rab = ha.get(b.id); if (rab) { pa += rab.pts; dva += rab.dv; da += rab.diff; }
          const rba = hb.get(a.id); if (rba) { pb += rba.pts; dvb += rba.dv; db += rba.diff; }
          return (pb - pa) || (dvb - dva) || (db - da) || (b.dv - a.dv) || (b.saldo - a.saldo) || a.name.localeCompare(b.name);
        });
        for (let k = 0; k < group.length; k++) list[i + k] = group[k];
      }
      i = j;
    }
    return list.map((p, idx) => ({
      pos: idx + 1,
      playerId: p.id,
      name: p.name,
      points: p.points,
      wins: p.wins,
      losses: p.losses,
      dv: p.dv,
      saldo: p.saldo,
      series: p.series
    }));
  }

  function enrichRanking(ranking, data){
    const PV = Number((((data||{}).config||{}).pontos||{}).vitoria ?? 3);
    return (ranking || []).map((r, i) => {
      const wins = Number(r.wins || 0);
      const losses = Number(r.losses || 0);
      const dv = Number(r.dv || r.goalsFor || 0);
      const points = r.points != null ? Number(r.points) : (wins*PV + dv);
      return { pos: r.pos || (i+1), playerId: r.playerId || r.id, name: r.name || r.playerId || r.id, points, wins, losses, dv, saldo: Number(r.saldo || 0), series: Number(r.series || 0) };
    });
  }

  function toDisplayMatch(m, nameById){
    const a = nameById.get(m.homeId) || m.homeName || m.homeId;
    const b = nameById.get(m.awayId) || m.awayName || m.awayId;
    const hasScore = (m.homeScore != null) && (m.awayScore != null);
    const score = hasScore ? `${m.homeScore} × ${m.awayScore}` : "vs";
    return { a, b, score };
  }

  async function loadSeason(){
    const id = param("id");
    if (!id) {
      if (D && Array.isArray(D.tournaments) && D.tournaments[0]) return normalizeFromLegacy(D.tournaments[0]);
      return null;
    }
    const json = await fetchJSON(`data/${encodeURIComponent(id)}.json`);
    if (json) {
      const s = {
        season: json.season || id,
        nome: json.nome || json.name || id,
        inicio: json.inicio || json.start || json.date || null,
        fim: json.fim || json.end || null,
        status: normStatus(json.status || json.state),
        cover: json.cover || "",
        jogos: Array.isArray(json.jogos) ? json.jogos.map(m => ({
          round: m.round || m.r || null,
          date: m.date || null,
          homeId: m.homeId || m.a,
          awayId: m.awayId || m.b,
          homeScore: (m.homeScore != null) ? Number(m.homeScore) : (m.as != null ? Number(m.as) : null),
          awayScore: (m.awayScore != null) ? Number(m.awayScore) : (m.bs != null ? Number(m.bs) : null),
          status: m.status || ((m.as != null || m.bs != null || m.homeScore != null || m.awayScore != null) ? "final" : "agendado")
        })) : [],
        jogadores: Array.isArray(json.jogadores) ? json.jogadores.map(j => ({ id: j.id, nome: j.nome || j.name || j.id, avatar: j.avatar || "" })) : [],
        ranking: Array.isArray(json.ranking) ? json.ranking.slice() : null,
        resumo: json.resumo || null,
        destaques: json.destaques || null,
        config: json.config || { pontos: { vitoria: 3, empate: 1, derrota: 0 }, criterios: ["points","wins","gd","goalsFor","nameAsc"] }
      };
      if (!s.jogadores.length) s.jogadores = derivePlayers(s);
      if (!s.ranking || !s.ranking.length) s.ranking = computeRanking(s);
      else s.ranking = enrichRanking(s.ranking, s);
      return s;
    }
    if (D && Array.isArray(D.tournaments)) {
      const t = D.tournaments.find(x => (x.id || x.season) === id);
      if (t) return normalizeFromLegacy(t);
    }
    return null;
  }

  function renderHeader(s){
    const cover = qs("#seasonCover");
    if (cover) cover.src = s.cover || "assets/cards/2.webp";
    const name = qs("#seasonName");
    if (name) name.textContent = s.nome || s.season || "Campeonato";
    const meta = qs("#seasonMeta");
    if (meta) {
      const when = fmtDateISO(s.inicio);
      const label = s.status === "upcoming" ? "Em breve" : (s.status === "finished" ? "Concluído" : "Em andamento");
      meta.textContent = when ? `${label} • ${when}` : label;
    }
  }

  function renderRanking(s){
    const panel = qs("#panelRanking");
    const table = qs("#rankingTable");
    const tbody = qs("#rankingTable tbody");
    if (!panel || !tbody || !table) return;
    tbody.innerHTML = "";
    const rows = Array.isArray(s.ranking) ? s.ranking : [];
    if (!rows.length) { panel.style.display = "none"; return; }

    table.classList.remove("serie-a","serie-b");
    const sid = String(s.season || "").toLowerCase();
    const isA = sid.startsWith("bagreleirao-a");
    const isB = sid.startsWith("bagreleirao-b");
    if (isA) table.classList.add("serie-a");
    if (isB) table.classList.add("serie-b");

    const total = rows.length;

    for (const r of rows) {
      const cls = [];
      if (isA || isB) {
        if (r.pos <= 4) cls.push("g4");
        if (isA && total >= 6 && r.pos >= total - 1) cls.push("relegation");
      }
      const tr = el("tr", { className: cls.join(" ") }, [
        el("td", null, [String(r.pos || "-")]),
        el("td", null, [text(r.name || r.playerId)]),
        el("td", null, [String(r.points != null ? r.points : (Number(r.wins||0)*3 + Number(r.dv||0)))]),
        el("td", null, [String(r.wins || 0)]),
        el("td", null, [String(r.losses || 0)]),
        el("td", null, [String(r.dv || 0)]),
        el("td", null, [String((r.saldo > 0 ? "+" : "") + (r.saldo || 0))])
      ]);
      tbody.appendChild(tr);
    }
  }

  function renderMatches(s){
    const panel = qs("#panelMatches");
    const tbody = qs("#matchesTable tbody");
    if (!panel || !tbody) return;
    tbody.innerHTML = "";
    const list = Array.isArray(s.jogos) ? s.jogos : [];
    if (!list.length) { panel.style.display = "none"; return; }
    const nameById = new Map((s.jogadores || []).map(j => [j.id, j.nome]));
    for (const m of list) {
      const x = toDisplayMatch(m, nameById);
      const tr = el("tr", null, [
        el("td", null, [text(x.a)]),
        el("td", null, [text(x.score)]),
        el("td", null, [text(x.b)])
      ]);
      tbody.appendChild(tr);
    }
  }

  function renderSummary(s){
    const panel = qs("#panelResumo");
    const box = qs("#seasonSummary");
    if (!panel || !box) return;
    box.innerHTML = "";
    const isText = typeof s.resumo === "string" && s.resumo.trim().length > 0;
    if (s.status === "upcoming" && !isText) { box.appendChild(el("p", null, ["Calendário em breve."])); return; }
    if (isText) { box.appendChild(el("div", { className: "summary-text", style: { whiteSpace: "pre-line" } }, [s.resumo])); return; }
    const r = s.resumo || {};
    const items = [];
    if (r.campeao || r.champion) items.push(["Campeão", r.campeao || r.champion]);
    if (r.vice) items.push(["Vice", r.vice]);
    if (r.partidas || r.jogos) items.push(["Partidas", String(r.partidas || r.jogos)]);
    if (r.gols) items.push(["Gols", String(r.gols)]);
    if (!items.length && Array.isArray(s.ranking) && s.ranking[0]) items.push(["Campeão", s.ranking[0].name || s.ranking[0].playerId]);
    if (!items.length) { panel.style.display = "none"; return; }
    for (const [k, v] of items) box.appendChild(el("p", null, [`${k}: ${text(v)}`]));
  }

  function renderHighlights(s){
    const panel = qs("#panelDestaques");
    const box = qs("#seasonHighlights");
    if (!panel || !box) return;
    box.innerHTML = "";
    if (typeof s.destaques === "string" && s.destaques.trim().length > 0) {
      box.appendChild(el("div", { className: "highlights-text", style: { whiteSpace: "pre-line" } }, [s.destaques]));
      return;
    }
    const hs = Array.isArray(s.destaques) ? s.destaques : [];
    if (!hs.length) { panel.style.display = "none"; return; }
    for (const h of hs) {
      const t = text(h.tipo || h.type || "Destaque");
      const name = text(h.playerName || h.playerId || "");
      const parts = [t, name].filter(Boolean).join(": ");
      const val = h.valor != null ? ` • ${String(h.valor)}` : (h.obs ? ` • ${String(h.obs)}` : "");
      box.appendChild(el("p", null, [parts + val]));
    }
  }

  function renderRules(s){
    const sid = String(s.season || "").toLowerCase();
    const isA = sid.startsWith("bagreleirao-a");
    const isB = sid.startsWith("bagreleirao-b");
    if (!isA && !isB) return;
    const host = qs("#panelRanking .panel-body");
    const tableWrap = qs("#panelRanking .table-wrap");
    if (!host || !tableWrap) return;
    const old = qs("#rankingRules");
    if (old) old.remove();
    const box = el("div", { id: "rankingRules", style: { margin: "8px 0 0 0", color: "var(--muted)", fontSize: "12px" } });
    const ul = el("ul");
    ul.appendChild(el("li", null, ["Pontuação: PTS = 3 por vitória de série + DV (1 ponto por duelo vencido)."]));
    ul.appendChild(el("li", null, ["DV = soma de duelos vencidos no placar."]));
    if (isA) {
      ul.appendChild(el("li", null, ["G4: posições 1–4 classificados para a Copa Bagre do Brasil."]));
      ul.appendChild(el("li", null, ["Rebaixamento: últimos 2 caem quando houver 6 ou mais participantes."]));
    } else {
      ul.appendChild(el("li", null, ["G4: posições 1–4 classificados para a Copa Bagre do Brasil."]));
      ul.appendChild(el("li", null, ["Série B não possui rebaixamento."]));
    }
    box.appendChild(ul);
    tableWrap.insertAdjacentElement("afterend", box);
  }

  async function render(){
    if (E.setYear) E.setYear(); else setYear();
    const s = await loadSeason();
    if (!s) { window.location.href = "index.html"; return; }
    renderHeader(s);
    renderRules(s);
    renderRanking(s);
    renderMatches(s);
    renderSummary(s);
    renderHighlights(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
