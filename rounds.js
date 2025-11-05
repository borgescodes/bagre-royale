
(function(){
  // Small DOM helper
  function el(tag, attrs = {}, children = []){
    const n = document.createElement(tag);
    if (attrs && typeof attrs === "object"){
      for (const [k,v] of Object.entries(attrs)){
        if (v == null) continue;
        if (k === "class") n.className = v;
        else if (k === "html") n.innerHTML = v;
        else n.setAttribute(k, v);
      }
    }
    if (Array.isArray(children)){
      for (const c of children){
        if (c == null) continue;
        n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    }
    return n;
  }

  function splitIdToSerie(seasonId){
    if (!seasonId) return null;
    const m = String(seasonId).match(/bagreleirao-([ab])-/i);
    return m ? m[1].toLowerCase() : null; // "a" | "b"
  }

  async function fetchJSON(url){
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  // "2x1", "2×1", "2-1", "2:1" -> {a:2,b:1}
  function parseScore(val){
    if (!val || typeof val !== "string") return null;
    const s = val.replace(/\s+/g, "");
    const m = s.match(/^(\d+)[x×:-](\d+)$/i);
    if (!m) return null;
    return { a: Number(m[1]), b: Number(m[2]) };
  }

  // One-line row: time ; A ; aScore ; vs ; bScore ; B
  function gameLine(g, rodadaTitulo, serieClass, nameById){
    const aName = nameById.get(g.homeId) || g.homeId;
    const bName = nameById.get(g.awayId) || g.awayId;
    const sc = parseScore(g.placar);
    const aScore = sc ? String(sc.a) : "";
    const bScore = sc ? String(sc.b) : "";

    const row = el("div", { class: "game-row" }, [
      el("span", { class: "team team-a" }, [ aName ]),
      el("span", { class: "score score-a" }, [ aScore ]),
      el("span", { class: "vs" }, [ "vs" ]),
      el("span", { class: "score score-b" }, [ bScore ]),
      el("span", { class: "team team-b" }, [ bName ]),
    ]);

    const line = el("div", { class: "game-line" }, [
      el("span", { class: "game-time" }, [ g.hora || "" ]),
      row
    ]);
    return line;
  }

  function dayBlock(label){
    return el("div", { class: "day-block" }, [
      el("div", { class: "day-title" }, [ label || "" ])
    ]);
  }

  function renderInto(panel, schedule, players){
    const serieClass = schedule.serie === "A" ? "series-a" : "series-b";
    const nameById = new Map((players || []).map(p => [p.id, p.nome]));

    const body = panel.querySelector(".panel-body") || panel;
    body.innerHTML = "";

    const container = el("div", { id: "roundsZone" });
    const grid = el("div", { class: `rodadas-grid ${serieClass}` });

    const rounds = Array.isArray(schedule.rodadas) ? schedule.rodadas : [];
    if (!rounds.length){
      body.innerHTML = `<div class="rounds-empty">Cronograma em breve.</div>`;
      return;
    }

    for (const r of rounds){
      const card = el("article", { class: `rodada-card ${serieClass}` }, [
        el("div", { class: "rodada-top" }, [
          el("h3", { class: "rodada-name" }, [ r.titulo || `Rodada ${r.id}` ]),
          el("div", { class: "rodada-tag" }, [ `R${String(r.id).padStart(2,"0")}` ]),
        ])
      ]);

      for (const d of (r.dias || [])){
        const day = dayBlock(d.label || "");
        const list = el("div", { class: "games-list" });
        for (const g of (d.jogos || [])){
          list.appendChild(gameLine(g, r.titulo || `Rodada ${r.id}`, serieClass, nameById));
        }
        day.appendChild(list);
        card.appendChild(day);
      }

      grid.appendChild(card);
    }

    container.appendChild(grid);
    body.appendChild(container);
  }

  async function render(panel, seasonData, opts = {}){
    const serieKey = splitIdToSerie(seasonData && seasonData.season); // "a" | "b"
    if (!serieKey) { console.warn("Rounds: série não identificada a partir do seasonId:", seasonData && seasonData.season); return; }

    // Ajusta título do painel
    const title = panel.querySelector(".panel-title");
    if (title){
      const labelSerie = (seasonData && seasonData.serie) ? String(seasonData.serie).toUpperCase() : serieKey.toUpperCase();
      title.textContent = `Tabela de Jogos Série ${labelSerie}`;
    }

    // Detect edition
    const ed = (seasonData && seasonData.edicao) || ((String(seasonData && seasonData.season || "").match(/-(\d+)(?:\.json)?$/)||[])[1]) || 2;
    const serie = String(serieKey).toLowerCase();

    // Try multiple paths
    const candidates = []
      .concat(opts.scheduleUrl ? [opts.scheduleUrl] : [])
      .concat([
        `./bagreleirao-${serie}-${ed}-schedule.json`,
        `data/bagreleirao-${serie}-${ed}-schedule.json`,
        `../bagreleirao-${serie}-${ed}-schedule.json`
      ]);

    let schedule = null, lastErr = null;
    for (const url of candidates){
      try { schedule = await fetchJSON(url); break; }
      catch(e){ lastErr = e; }
    }

    const body = panel.querySelector(".panel-body") || panel;
    if (!schedule){
      console.warn("Rounds: nenhum cronograma encontrado. Tentativas:", candidates, "ultimo erro:", lastErr && String(lastErr));
      body.innerHTML = `<div class="rounds-empty">Cronograma não encontrado.</div>`;
      return;
    }

    renderInto(panel, schedule, seasonData && seasonData.jogadores);
  }

  window.Rounds = { render };
})();
