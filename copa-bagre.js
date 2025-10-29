// copa-bagre.js: alinhamento vertical de S1/S2/Final aos meios das fases anteriores + redesenho dos fios
(function () {
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];
  const $bracket = qs("#bracket");
  const $wires = qs("#wires");
  const $scroller = qs(".copa-scroll");

  const ROUND_KEYS = ["quartas", "semis", "final"];
  const ROUND_TITLES = { quartas: "Quartas", semis: "Semifinais", final: "Final" };
  const state = { data: null, slotsByRound: new Map(), matchMap: new Map(), resizeRaf: 0, uiMeta: { title: "Copa Bagre do Brasil", logoSrc: "assets/cards/copa.webp" } };

  
function getEditionId(){
  try { return new URL(location.href).searchParams.get("id"); } catch { return null; }
}
async function loadFirst(paths){
  for (const path of paths){
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch(_) {}
  }
  return { rounds: {}, meta: {} };
}
let _catalogCache = null;
async function fetchCatalog(){
  if (_catalogCache) return _catalogCache;
  try { const r = await fetch("data/copas.json", { cache: "no-store" }); if (r.ok) _catalogCache = await r.json(); } catch(_){}
  return _catalogCache || { temporadas: [] };
}
async function applyEditionMeta(meta, id){
  const catalog = await fetchCatalog();
  const item = (catalog?.temporadas||[]).find(x => String(x.id).toLowerCase()===String(id||"").toLowerCase());
  const displayName = item?.name || meta?.title || "Copa Bagre do Brasil";
  const logoSrc = meta?.logo || meta?.logoSrc || item?.logo || "assets/cards/copa.webp";
  state.uiMeta = { title: displayName, logoSrc };
  const h1 = qs(".panel-title"); if (h1) h1.textContent = "Chaveamento Eliminatórias";
  const podTitle = qs("#podium-title"); if (podTitle) podTitle.textContent = `Pódio - ${displayName}`;
  const $logo = document.getElementById("copaLogo"); if ($logo){ $logo.src = logoSrc; $logo.alt = displayName; }
}

init();

async function init() {
  const id = getEditionId();
  const data = await loadFirst(id ? [
    `data/copas/${id}.json`,
    `${id}.json`,
    `copa-${id}.json`,
    `data/${id}.json`
  ] : []);
  state.data = normalizeData(data);
  await applyEditionMeta(state.data.meta, id);
  buildBracket(state.data);
  requestAnimationFrame(() => {
    alignRounds();
    drawWires();
    positionCopaLogo();
    renderPodium();
  });
  bindGlobal();
  enableAxisLock($scroller);
}


  async function loadJSON(path) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar JSON");
      return await res.json();
    } catch (e) {
      return { rounds: {}, meta: { error: e.message } };
    }
  }

  function normalizeData(data) {
    const rounds = data && data.rounds ? data.rounds : {};
    const norm = {};
    for (const key of ROUND_KEYS) {
      const items = Array.isArray(rounds[key]) ? rounds[key] : [];
      norm[key] = items.map((m, i) => ({
        id: String(m.id ?? `${key}-${i + 1}`),
        stage: m.stage ?? ROUND_TITLES[key],
        meta: m.meta ?? {},
        a: normTeam(m.a),
        b: normTeam(m.b),
      }));
    }
    return { rounds: norm, meta: data.meta ?? {} };
  }

  function normTeam(t) {
    if (!t) return { name: "A definir", photo: null, score: null, winner: false };
    return {
      name: t.name ?? "A definir",
      photo: t.photo ?? null,
      score: isFiniteNumber(t.score) ? Number(t.score) : null,
      winner: Boolean(t.winner ?? false),
    };
  }

  function isFiniteNumber(n) {
    return typeof n === "number" && Number.isFinite(n);
  }

  function buildBracket(data) {
    for (const key of ROUND_KEYS) {
      const $round = qs(`.round[data-round="${key}"]`, $bracket);
      if (!$round) continue;
      clearRound($round);
      const list = data.rounds[key];
      const $col = document.createElement("div");
      $col.className = "round-col";
      const frag = document.createDocumentFragment();
      state.slotsByRound.set(key, []);
      list.forEach((match, idx) => {
        const $m = renderMatch(match, key, idx);
        state.slotsByRound.get(key).push($m);
        frag.appendChild($m);
      });
      $col.appendChild(frag);
      $round.appendChild($col);
    }
  }

  function clearRound($round) {
    qsa(".round-col", $round).forEach((n) => n.remove());
  }

  function renderMatch(match, roundKey, idx) {
    const $m = document.createElement("div");
    $m.className = "match";
    $m.dataset.id = match.id;
    $m.dataset.state = isFinished(match) ? "finished" : "scheduled";

    const $head = document.createElement("div");
    $head.className = "match-head";

    const $stage = document.createElement("div");
    $stage.className = "match-stage";
    $stage.textContent = match.stage;

    const $meta = document.createElement("div");
    $meta.className = "match-meta";

    $head.appendChild($stage);
    $head.appendChild($meta);

    const $teamA = teamRow(match.a);
    const $teamB = teamRow(match.b);

    $m.appendChild($head);
    $m.appendChild($teamA);
    $m.appendChild($teamB);

    state.matchMap.set(match.id, { el: $m, round: roundKey, index: idx });
    return $m;
  }

  function isFinished(m) {
    return isFiniteNumber(m?.a?.score) && isFiniteNumber(m?.b?.score);
  }

  function isPlaceholder(name) {
    return /^Vencedor\s+(Q[1-4]|S[1-2])$/i.test(String(name).trim());
  }

  function teamRow(team) {
    const $row = document.createElement("div");
    $row.className = "team";
    if (team.winner) $row.classList.add("is-winner");

    const $name = document.createElement("div");
    $name.className = "team-name";

    const $flag = document.createElement("span");
    $flag.className = "team-flag";
    if (team.photo) {
      $flag.style.backgroundImage = `url(${team.photo})`;
      $flag.style.backgroundSize = "cover";
      $flag.style.backgroundPosition = "center";
    }
    $name.appendChild($flag);

    const $label = document.createElement("span");
    $label.textContent = team.name;
    $label.title = team.name;
    $label.className = isPlaceholder(team.name) ? "label is-placeholder" : "label";
    $name.appendChild($label);

    const $score = document.createElement("div");
    $score.className = "team-score";
    $score.textContent = isFiniteNumber(team.score) ? String(team.score) : "-";

    $row.appendChild($name);
    $row.appendChild($score);
    return $row;
  }

  function bindGlobal() {
    window.addEventListener(
      "resize",
      () => {
        cancelAnimationFrame(state.resizeRaf);
        state.resizeRaf = requestAnimationFrame(() => {
          resetOffsets();
          alignRounds();
          drawWires();
          positionCopaLogo();
          renderPodium();
        });
      },
      { passive: true }
    );

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(state.resizeRaf);
      state.resizeRaf = requestAnimationFrame(() => {
        resetOffsets();
        alignRounds();
        drawWires();
        positionCopaLogo();
        renderPodium();
      });
    });
    ro.observe($bracket);
  }

  function centerY(el, within) {
    const base = (within || $bracket).getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return r.top - base.top + r.height / 2;
  }

  function setOffset(el, dy) {
    el.style.transform = `translateY(${Math.round(dy)}px)`;
  }

  function resetOffsets() {
    qsa(".match", $bracket).forEach((m) => (m.style.transform = "translateY(0)"));
  }

  function ensureCopaLogo() {
    let $logo = document.getElementById("copaLogo");
    if (!$logo) {
      $logo = document.createElement("img");
      $logo.id = "copaLogo";
      $logo.className = "copa-logo";
      $bracket.appendChild($logo);
    }
    $logo.src = state.uiMeta?.logoSrc || "assets/cards/copa.webp";
    $logo.alt = state.uiMeta?.title || "Copa Bagre do Brasil";
    return $logo;
  }

  function positionCopaLogo() {
    const $logo = ensureCopaLogo();
    const semis = state.slotsByRound.get("semis") || [];
    if (!semis[0] || !semis[1]) return;
    const base = $bracket.getBoundingClientRect();
    const r1 = semis[0].getBoundingClientRect();
    const r2 = semis[1].getBoundingClientRect();
    const midY = (r1.top + r1.height / 2 + (r2.top + r2.height / 2)) / 2 - base.top;
    $logo.style.left = "50%";
    $logo.style.top = `${midY}px`;
    $logo.style.transform = "translate(-50%, -50%)";
  }

  function alignRounds() {
    const q = state.slotsByRound.get("quartas") || [];
    const s = state.slotsByRound.get("semis") || [];
    const f = state.slotsByRound.get("final") || [];

    if (q.length >= 2 && s[0]) {
      const midQ12 = (centerY(q[0]) + centerY(q[1])) / 2;
      const curS1 = centerY(s[0]);
      setOffset(s[0], midQ12 - curS1);
    }
    if (q.length >= 4 && s[1]) {
      const midQ34 = (centerY(q[2]) + centerY(q[3])) / 2;
      const curS2 = centerY(s[1]);
      setOffset(s[1], midQ34 - curS2);
    }
    if (q[1] && f[0]) {
      const curF = centerY(f[0]);
      setOffset(f[0], centerY(q[1]) - curF);
    }
    if (q[2] && f[1]) {
      const cur3 = centerY(f[1]);
      setOffset(f[1], centerY(q[2]) - cur3);
    }
  }

  function drawWires() {
    $wires.innerHTML = "";
    const svgRect = $bracket.getBoundingClientRect();
    const makePoint = (el, xSide) => {
      const r = el.getBoundingClientRect();
      const x = xSide === "right" ? r.right - svgRect.left : r.left - svgRect.left;
      const y = r.top - svgRect.top + r.height / 2;
      return { x, y };
    };
    const path = (p1, p2) => {
      const dx = Math.max(28, (p2.x - p1.x) * 0.5);
      const c1x = p1.x + dx, c2x = p2.x - dx;
      return `M ${p1.x} ${p1.y} C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${p2.x} ${p2.y}`;
    };
    const draw = (fromEl, toEl) => {
      if (!fromEl || !toEl) return;
      const p1 = makePoint(fromEl, "right");
      const p2 = makePoint(toEl, "left");
      const $p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      $p.setAttribute("d", path(p1, p2));
      $p.setAttribute("style", "vector-effect:non-scaling-stroke;stroke:var(--wire);stroke-width:var(--wire-w,3);fill:none;stroke-linecap:round;stroke-linejoin:round;");
      $wires.appendChild($p);
    };

    const q = state.slotsByRound.get("quartas") || [];
    const s = state.slotsByRound.get("semis") || [];
    const f = state.slotsByRound.get("final") || [];

    function nodeRight(matchEl) { return qsa(".team", matchEl).at(-1) || matchEl; }
    function nodeLeft(matchEl) { return qsa(".team", matchEl)[0] || matchEl; }
    function leftRow(matchEl, idx) { const rows = qsa(".team", matchEl); return rows[idx] || nodeLeft(matchEl); }
    function teamRowByText(matchEl, re) {
      const rows = qsa(".team", matchEl);
      for (const r of rows) {
        const lab = r.querySelector(".label");
        if (lab && re.test(String(lab.textContent).trim())) return r;
      }
      return nodeLeft(matchEl);
    }

    if (q[0] && s[0]) draw(nodeRight(q[0]), leftRow(s[0], 0));
    if (q[1] && s[0]) draw(nodeRight(q[1]), leftRow(s[0], 1));
    if (q[2] && s[1]) draw(nodeRight(q[2]), leftRow(s[1], 0));
    if (q[3] && s[1]) draw(nodeRight(q[3]), leftRow(s[1], 1));

    if (f[0]) {
      if (s[0]) draw(nodeRight(s[0]), teamRowByText(f[0], /^Vencedor\s+S1$/i));
      if (s[1]) draw(nodeRight(s[1]), teamRowByText(f[0], /^Vencedor\s+S2$/i));
    }

    if (f[1]) {
      if (s[0]) draw(nodeRight(s[0]), teamRowByText(f[1], /^Perdedor\s+S1$/i));
      if (s[1]) draw(nodeRight(s[1]), teamRowByText(f[1], /^Perdedor\s+S2$/i));
    }
  }

  function enableAxisLock(el) {
    if (!el) return;
    let startX = 0, startY = 0, startScrollLeft = 0, locked = null;
    el.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startScrollLeft = el.scrollLeft;
      locked = null;
    }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (locked === null) {
        if (ax > 6 || ay > 6) locked = ax > ay ? "x" : "y";
      }
      if (locked === "x") {
        e.preventDefault();
        el.scrollLeft = startScrollLeft - dx;
      }
    }, { passive: false });
  }

  function podium_getMatchByIdOrStage(idHint, stageWord){
    for (const k of ["quartas","semis","final"]){
      const arr = (state.data?.rounds?.[k]) || [];
      const m = arr.find(x => x.id === idHint);
      if (m) return m;
    }
    if (stageWord){
      const rx = new RegExp(stageWord, "i");
      for (const k of ["quartas","semis","final"]){
        const arr = (state.data?.rounds?.[k]) || [];
        const m = arr.find(x => rx.test(String(x.stage||"")));
        if (m) return m;
      }
    }
    return null;
  }
  function podium_teamWinner(m){
    if (!m) return null;
    const a=m.a||{}, b=m.b||{};
    if (a.winner===true) return a;
    if (b.winner===true) return b;
    if (Number.isFinite(a.score) && Number.isFinite(b.score) && a.score!==b.score) return a.score>b.score?a:b;
    return null;
  }
  function podium_teamLoser(m){
    if (!m) return null;
    const a=m.a||{}, b=m.b||{};
    if (a.winner===true) return b;
    if (b.winner===true) return a;
    if (Number.isFinite(a.score) && Number.isFinite(b.score) && a.score!==b.score) return a.score>b.score?b:a;
    return null;
  }
  function computeTop3(){
    const finals = (state.data?.rounds?.final)||[];
    const F = finals.find(x=>x.id==="F1") || finals.find(x=>/final/i.test(String(x.stage||"")) && !/(3|terceir)/i.test(String(x.stage||"")));
    const T = finals.find(x=>x.id==="3P") || finals.find(x=>/(3|terceir)/i.test(String(x.stage||"")));
    const S1 = podium_getMatchByIdOrStage("S1","S1");
    const S2 = podium_getMatchByIdOrStage("S2","S2");
    const first  = podium_teamWinner(F);
    const second = podium_teamLoser(F);
    let third = podium_teamWinner(T);
    if (!third){
      const l1 = podium_teamLoser(S1), l2 = podium_teamLoser(S2);
      if (l1 && l2 && Number.isFinite(l1.score) && Number.isFinite(l2.score)){
        third = l1.score > l2.score ? l1 : l2;
      }
    }
    return { first, second, third };
  }
  function renderPodium(){
    const host = document.getElementById("podium");
    if (!host) return;
    host.setAttribute("aria-busy","true");
    host.innerHTML = "";
    const { first, second, third } = computeTop3();
    const card = (placeLabel, rankClass, team, fallback) => {
      const el = document.createElement("div");
      el.className = `podium-item ${rankClass}`;
      el.innerHTML = `
        <div class="place">${placeLabel}</div>
        <div class="avatar"></div>
        <div class="name">${team?.name || fallback}</div>
      `;
      const avatar = el.querySelector(".avatar");
      if (team?.photo) avatar.style.backgroundImage = `url(${team.photo})`;
      return el;
    };
    host.appendChild(card("Campeão","rank1", first, "Aguardando"));
    host.appendChild(card("2º Lugar","rank2", second, "Aguardando"));
    host.appendChild(card("3º Lugar","rank3", third, "Aguardando"));
    host.setAttribute("aria-busy","false");
  }
})();
