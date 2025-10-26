// copa-bagre.js: habilita scroll horizontal no mobile dentro do chaveamento com bloqueio de eixo; mantém nomes padrão completos e fios
(function () {
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => [...el.querySelectorAll(s)];
  const $bracket = qs('#bracket');
  const $wires = qs('#wires');
  const $scroller = qs('.copa-scroll');

  const ROUND_KEYS = ['quartas', 'semis', 'final'];
  const ROUND_TITLES = { quartas: 'Quartas', semis: 'Semifinais', final: 'Final' };
  const state = { data: null, slotsByRound: new Map(), matchMap: new Map(), resizeRaf: 0 };

  init();

  async function init() {
    const data = await loadJSON('copa-bagre.json');
    state.data = normalizeData(data);
    buildBracket(state.data);
    drawWires();
    bindGlobal();
    enableAxisLock($scroller); // <— garante arraste horizontal no mobile
  }

  async function loadJSON(path) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao carregar JSON');
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
    if (!t) return { name: 'A definir', photo: null, score: null, winner: false };
    return {
      name: t.name ?? 'A definir',
      photo: t.photo ?? null,
      score: isFiniteNumber(t.score) ? Number(t.score) : null,
      winner: Boolean(t.winner ?? false),
    };
  }

  function isFiniteNumber(n) {
    return typeof n === 'number' && Number.isFinite(n);
  }

  function buildBracket(data) {
    for (const key of ROUND_KEYS) {
      const $round = qs(`.round[data-round="${key}"]`, $bracket);
      if (!$round) continue;
      clearRound($round);
      const list = data.rounds[key];
      const $col = document.createElement('div');
      $col.className = 'round-col';
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
    qsa('.round-col', $round).forEach(n => n.remove());
  }

  function renderMatch(match, roundKey, idx) {
    const $m = document.createElement('div');
    $m.className = 'match';
    $m.dataset.id = match.id;
    $m.dataset.state = isFinished(match) ? 'finished' : 'scheduled';

    const $head = document.createElement('div');
    $head.className = 'match-head';

    const $stage = document.createElement('div');
    $stage.className = 'match-stage';
    $stage.textContent = match.stage;

    const $meta = document.createElement('div');
    $meta.className = 'match-meta';

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
    const $row = document.createElement('div');
    $row.className = 'team';
    if (team.winner) $row.classList.add('is-winner');

    const $name = document.createElement('div');
    $name.className = 'team-name';

    const $flag = document.createElement('span');
    $flag.className = 'team-flag';
    if (team.photo) {
      $flag.style.backgroundImage = `url(${team.photo})`;
      $flag.style.backgroundSize = 'cover';
      $flag.style.backgroundPosition = 'center';
    }
    $name.appendChild($flag);

    const $label = document.createElement('span');
    $label.textContent = team.name;
    $label.title = team.name;
    $label.className = isPlaceholder(team.name) ? 'label is-placeholder' : 'label';
    $name.appendChild($label);

    const $score = document.createElement('div');
    $score.className = 'team-score';
    $score.textContent = isFiniteNumber(team.score) ? String(team.score) : '-';

    $row.appendChild($name);
    $row.appendChild($score);
    return $row;
  }

  function bindGlobal() {
    window.addEventListener('resize', () => {
      cancelAnimationFrame(state.resizeRaf);
      state.resizeRaf = requestAnimationFrame(drawWires);
    }, { passive: true });

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(state.resizeRaf);
      state.resizeRaf = requestAnimationFrame(drawWires);
    });
    ro.observe($bracket);
  }

  function drawWires() {
    $wires.innerHTML = '';
    const svgRect = $bracket.getBoundingClientRect();
    const makePoint = (el, xSide) => {
      const r = el.getBoundingClientRect();
      const x = xSide === 'right' ? r.right - svgRect.left : r.left - svgRect.left;
      const y = r.top - svgRect.top + r.height / 2;
      return { x, y };
    };

    const path = (p1, p2) => {
      const dx = Math.max(28, (p2.x - p1.x) * 0.5);
      const c1x = p1.x + dx;
      const c2x = p2.x - dx;
      return `M ${p1.x} ${p1.y} C ${c1x} ${p1.y}, ${c2x} ${p2.y}, ${p2.x} ${p2.y}`;
    };

    const draw = (fromEl, toEl) => {
      if (!fromEl || !toEl) return;
      const p1 = makePoint(fromEl, 'right');
      const p2 = makePoint(toEl, 'left');
      const d = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const wire = getComputedStyle(document.documentElement).getPropertyValue('--wire').trim() || '#2a3145';
      const width = getComputedStyle(document.documentElement).getPropertyValue('--wire-w').trim().replace('px','') || '3';
      d.setAttribute('d', path(p1, p2));
      d.setAttribute('fill', 'none');
      d.setAttribute('stroke', wire);
      d.setAttribute('stroke-width', width);
      d.setAttribute('opacity', '0.85');
      d.setAttribute('vector-effect', 'non-scaling-stroke');
      $wires.appendChild(d);
    };

    const q = state.slotsByRound.get('quartas') || [];
    const s = state.slotsByRound.get('semis') || [];
    const f = state.slotsByRound.get('final') || [];

    for (let i = 0; i < s.length; i++) {
      const fromA = q[i * 2];
      const fromB = q[i * 2 + 1];
      const to = s[i];
      if (fromA) draw(nodeRight(fromA), nodeLeft(to));
      if (fromB) draw(nodeRight(fromB), nodeLeft(to));
    }
    if (f[0] && s[0]) draw(nodeRight(s[0]), nodeLeft(f[0]));
    if (f[0] && s[1]) draw(nodeRight(s[1]), nodeLeft(f[0]));

    function nodeRight(matchEl) {
      return qsa('.team', matchEl).at(-1) || matchEl;
    }
    function nodeLeft(matchEl) {
      return qsa('.team', matchEl)[0] || matchEl;
    }
  }

  // Bloqueio de eixo: se o gesto for horizontal, consumimos o touch e rolamos o scroller.
  function enableAxisLock(el) {
    if (!el) return;
    let startX = 0, startY = 0, startScrollLeft = 0, locked = null;
    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startScrollLeft = el.scrollLeft;
      locked = null;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (locked === null) {
        // defina intenção após pequeno limiar
        if (ax > 6 || ay > 6) locked = ax > ay ? 'x' : 'y';
      }
      if (locked === 'x') {
        // impede o body de capturar o gesto vertical e aplica scroll manual
        e.preventDefault();
        el.scrollLeft = startScrollLeft - dx;
      }
    }, { passive: false });
  }
})();
