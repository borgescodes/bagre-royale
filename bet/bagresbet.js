/* bagresbet.js refinado */
(function(){

  /* ---------- DEADLINE / COUNTDOWN ---------- */
  function parseISO(iso){
    try { return new Date(iso); } catch(_){ return null; }
  }
  function setupCountdown(deadlineIso, elCountdown, onExpire){
    const dl = parseISO(deadlineIso);
    if(!dl || !elCountdown) return;
    function tick(){
      const now = new Date();
      const diff = dl - now;
      if(diff <= 0){
        elCountdown.textContent = "Apostas encerradas";
        onExpire && onExpire();
        clearInterval(timer);
        return;
      }
      const h = Math.floor(diff/36e5);
      const m = Math.floor((diff%36e5)/6e4);
      const s = Math.floor((diff%6e4)/1e3);
      elCountdown.textContent = `Apostas Encerram em ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    }
    tick();
    const timer = setInterval(tick, 1000);
  }

  const WHATSAPP_DEFAULT = "5591987338595";
  const DATA_PATH = "./data/copa-1/";
  const $ = (s)=>document.querySelector(s);
  const el = (tag, props={}, children=[]) => {
    const n = document.createElement(tag);
    for(const [k,v] of Object.entries(props||{})){
      if(v==null) continue;
      if(k==="className") n.setAttribute("class", v);
      else if(k==="dataset") Object.assign(n.dataset, v);
      else if(k==="style" && typeof v==="object") Object.assign(n.style, v);
      else if(k in n) { try { n[k]=v; } catch(_) { n.setAttribute(k,v); } }
      else n.setAttribute(k, v);
    }
    for(const c of children) n.appendChild(typeof c==="string" ? document.createTextNode(c) : c);
    return n;
  };

  const state = {
    tournament:null,
    metrics:null,
    view:"home",
    selections: {},
    scores: {}, // "2x0" | "2x1"
    token:null
  };

  async function getJSON(url){ try{ const r=await fetch(url,{cache:"no-store"}); if(!r.ok) return null; return await r.json(); }catch(_){return null;} }
  function token8(){ const s="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let t=""; for(let i=0;i<8;i++) t+=s[Math.floor(Math.random()*s.length)]; return t; }
  function go(view){ state.view=view; $("#homeView").classList.toggle("hidden",view!=="home"); $("#betView").classList.toggle("hidden",view!=="bet"); const nav=$("#siteNav"); nav.classList.toggle("nav--home",view==="home"); nav.classList.toggle("nav--bet",view==="bet"); }
  function fmtDate(d){ const dt=new Date(d); if(isNaN(dt)) return ""; const dd=String(dt.getDate()).padStart(2,"0"); const mm=String(dt.getMonth()+1).padStart(2,"0"); const yy=dt.getFullYear(); return `${dd}/${mm}/${yy}`; }

  
  function buildCarousel(t){
    const root=$("#bet-carousel"); if(!root) return; root.innerHTML="";
    const title=t.meta?.title||"Torneio";
    const cover=t.meta?.cardCover || "../assets/cards/copa-card.webp";
    const startText = t.meta?.startText || t.rounds?.quartas?.[0]?.meta?.when;
    const dl = t.betting?.deadline;

    const card=el("article",{className:"card"},[
      el("img",{className:"card-cover",src:cover,alt:"Capa do torneio"}),
      el("div",{className:"card-body"},[
        el("h3",{className:"card-title"},[title]),
        el("ul",{className:"card-info"},[ el("li",{},[`Início das Disputas: ${startText || ""}`]) ]),
        el("p",{className:"countdown",id:"countdownHome"},[""]),
        el("div",{className:"card-actions"},[ el("button",{className:"btn btn-primary",id:"openBetBtn",type:"button"},["Apostar Agora!"]) ])
      ])
    ]);
    root.appendChild(card);

    // Countdown + lock
    const openBtn = card.querySelector("#openBetBtn");
    setupCountdown(dl || "2025-11-01T14:00:00-03:00", card.querySelector("#countdownHome"), ()=>{
      openBtn.setAttribute("disabled","disabled");
      openBtn.textContent = "Apostas encerradas";
    });

    openBtn.addEventListener("click",()=>openBetCard(t, cover, title));
  }

  
  function openBetCard(t, cover, title){
    const betCover = t.meta?.betCover || cover || "../assets/cards/2.webp";
    $("#betCover").src=betCover; $("#betTitle").textContent=title;
    buildSelectors(t); refreshPreview(); go("bet");

    // Disable form if after deadline
    const dl = t.betting?.deadline || "2025-11-01T14:00:00-03:00";
    const lockForm = ()=>{
      document.querySelectorAll("#betForm select, #bettorName, #finishBtn, #clearBtn").forEach(el=>{
        el.setAttribute("disabled","disabled");
      });
    };
    setupCountdown(dl, document.querySelector("#betView .countdown-bet"), lockForm);
    if(new Date() >= new Date(dl)) lockForm();
  }

  /* ---------- MÉTRICAS: Campeão, 2º Lugar, 3º Lugar + Quartas ---------- */
  function computeMetricsFromTickets(data){
    const tickets = (data?.tickets) || [];
    const totals = {
      champion: {},
      runnerUp: {},
      third: {},
      stages: { Q1:{}, Q2:{}, Q3:{}, Q4:{} } // somente quartas
    };

    for(const tk of tickets){
      const p = tk.picks || {};

      // Campeão
      const champ = p.F1?.champion;
      if(champ) totals.champion[champ] = (totals.champion[champ]||0) + 1;

      // 2º lugar: outro finalista entre vencedores das semis
      const s1 = p.S1?.winner;
      const s2 = p.S2?.winner;
      if(champ && s1 && s2){
        const vice = (s1 === champ) ? s2 : (s2 === champ ? s1 : null);
        if(vice) totals.runnerUp[vice] = (totals.runnerUp[vice]||0) + 1;
      }

      // 3º lugar
      const t3 = p.T3?.third;
      if(t3) totals.third[t3] = (totals.third[t3]||0) + 1;

      // Quartas
      for(const k of Object.keys(totals.stages)){
        const w = p[k]?.winner;
        if(w) totals.stages[k][w] = (totals.stages[k][w]||0) + 1;
      }
    }

    const norm = (obj) => {
      const sum = Object.values(obj).reduce((a,b)=>a+b,0) || 1;
      const out = {};
      for(const [k,v] of Object.entries(obj)) out[k] = Math.round((v*100)/sum);
      return out;
    };

    const pct = {
      championPct: norm(totals.champion),
      runnerUpPct: norm(totals.runnerUp),
      thirdPct: norm(totals.third),
      stagePct: { Q1:{}, Q2:{}, Q3:{}, Q4:{} }
    };
    for(const k of Object.keys(totals.stages)) pct.stagePct[k] = norm(totals.stages[k]);

    return { pct, winners: data?.winners || [], ticketsCount: tickets.length };
  }

  function renderMetrics(data){
    const box=$("#metricsBox"); if(!box) return; box.innerHTML="";
    const { pct, winners, ticketsCount }=computeMetricsFromTickets(data||{});

    // Campeão
    const champPanel=el("div",{className:"kpi-card"},[
      el("h4",{className:"kpi-title"},["Favorito a Campeão"]),
      el("div",{className:"kpi-list"}, Object.entries(pct.championPct).map(([name,p])=> el("div",{className:"kpi-row"},[el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`])]))),
      el("div",{className:"kpi-foot"},[`Amostra: ${ticketsCount} aposta(s)`])
    ]);
    box.appendChild(champPanel);

    // 2º Lugar
    const vicePanel=el("div",{className:"kpi-card"},[
      el("h4",{className:"kpi-title"},["Favorito pro 2° Lugar"]),
      el("div",{className:"kpi-list"}, Object.entries(pct.runnerUpPct).map(([name,p])=> el("div",{className:"kpi-row"},[el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`])])))
    ]);
    box.appendChild(vicePanel);

    // 3º Lugar
    const thirdPanel=el("div",{className:"kpi-card"},[
      el("h4",{className:"kpi-title"},["Favorito pro 3° Lugar"]),
      el("div",{className:"kpi-list"}, Object.entries(pct.thirdPct).map(([name,p])=> el("div",{className:"kpi-row"},[el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`])])))
    ]);
    box.appendChild(thirdPanel);

    // Quartas Q1..Q4
    const grid=el("div",{className:"kpi-grid-steps"});
    ["Q1","Q2","Q3","Q4"].forEach(k => {
      grid.appendChild(el("div",{className:"kpi-card"},[
        el("h4",{className:"kpi-title"},[`Vencedores ${k}`]),
        el("div",{className:"kpi-list"}, Object.entries(pct.stagePct[k]||{}).map(([name,p])=> el("div",{className:"kpi-row"},[el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`])])))
      ]));
    });
    box.appendChild(grid);

    renderWinners({winners});
  }

  function renderWinners(m){
    const box=$("#winnersBox"); if(!box) return; box.innerHTML="";
    const list=(m&&Array.isArray(m.winners)&&m.winners.length)?m.winners:null;
    if(!list){ box.appendChild(el("p",{},["Após o torneio será definido."])); return; }
    for(const w of list) box.appendChild(el("p",{},[`${w.name} • Token ${w.token} • ${w.prize||""}`]));
  }

  function quarterPairs(t){ return (t.rounds?.quartas||[]).map(m=>({ id:m.id, a:m.a.name, b:m.b.name, when:m.meta?.when })); }
  function semisFrom(sel){ return { S1:[sel.Q1||"—", sel.Q2||"—"], S2:[sel.Q3||"—", sel.Q4||"—"] }; }
  function finalFrom(sel){ return { F1:[sel.S1||"—", sel.S2||"—"] }; }
  function losersOfSemis(sel){
    const out=[];
    const s1pair=semisFrom(sel).S1; if(sel.S1){ out.push(s1pair.find(x=>x!==sel.S1)||"—"); }
    const s2pair=semisFrom(sel).S2; if(sel.S2){ out.push(s2pair.find(x=>x!==sel.S2)||"—"); }
    return out.length? out : ["—","—"];
  }

  function buildSelectors(t){
    const host=$("#stageSelectors"); if(!host) return; host.innerHTML="";
    state.selections={}; state.scores={};

    const makeMatchBlock=(id, title, options)=>{
      const blk=el("div",{className:"match-block"});
      blk.appendChild(el("div",{className:"match-title"},[title]));
      const row=el("div",{className:"match-row"});
      const sel=el("select",{id, required:true}); sel.appendChild(el("option",{value:""},["— Selecione o vencedor —"])); for(const o of options) sel.appendChild(el("option",{value:o},[o]));
      sel.addEventListener("change",()=>{ state.selections[id]=sel.value||null; refreshDerived(); refreshPreview(); });
      row.appendChild(sel);
      const score=el("select",{id:`${id}_score`, required:true}); score.appendChild(el("option",{value:""},["Placar"])); ["2x0","2x1"].forEach(p=> score.appendChild(el("option",{value:p},[p])));
      score.addEventListener("change",()=>{ state.scores[id]=score.value||null; refreshPreview(); });
      row.appendChild(score);
      blk.appendChild(row);
      return blk;
    };

    for(const m of quarterPairs(t)){ const title=`${m.a} vs ${m.b}${m.when? " • "+m.when : ""}`; host.appendChild(makeMatchBlock(m.id,title,[m.a,m.b])); }
    const s1=makeMatchBlock("S1","Semifinal 1",semisFrom(state.selections).S1);
    const s2=makeMatchBlock("S2","Semifinal 2",semisFrom(state.selections).S2);
    host.appendChild(s1); host.appendChild(s2);
    const f1=makeMatchBlock("F1","Final",finalFrom(state.selections).F1);
    host.appendChild(f1);
    const t3=makeMatchBlock("T3","Disputa 3º lugar",losersOfSemis(state.selections));
    host.appendChild(t3);

    $("#finishBtn")?.addEventListener("click",onFinish);
    $("#clearBtn")?.addEventListener("click",clearBet);
    $("#bettorName")?.addEventListener("input",refreshPreview);
  }

  function refreshDerived(){
    for(const k of ["S1","S2"]){
      const sel=$("#"+k); if(!sel) continue;
      const opts=(k==="S1"? semisFrom(state.selections).S1 : semisFrom(state.selections).S2);
      const cur=sel.value; sel.innerHTML=""; sel.appendChild(el("option",{value:""},["— Selecione o vencedor —"]));
      for(const o of opts) sel.appendChild(el("option",{value:o, selected:o===cur},[o]));
    }
    const fSel=$("#F1"); if(fSel){ const opts=finalFrom(state.selections).F1; const cur=fSel.value; fSel.innerHTML=""; fSel.appendChild(el("option",{value:""},["— Selecione o vencedor —"])); for(const o of opts) fSel.appendChild(el("option",{value:o, selected:o===cur},[o])); }
    const t3=$("#T3"); if(t3){ const opts=losersOfSemis(state.selections); const cur=t3.value; t3.innerHTML=""; t3.appendChild(el("option",{value:""},["— Selecione o vencedor —"])); for(const o of opts) t3.appendChild(el("option",{value:o, selected:o===cur},[o])); }
  }

  function computeRunnerUp(){ const champ=state.selections.F1; const finals=finalFrom(state.selections).F1||[]; if(!champ) return null; return finals.find(x=>x!==champ)||null; }

  function buildTicket(){
    const title=state.tournament?.meta?.title||"Torneio"; const name=$("#bettorName")?.value?.trim()||"—"; if(!state.token) state.token=token8(); const ru=computeRunnerUp();
    const line=(k)=>`${state.selections[k]||"?"}${state.scores[k]? " "+state.scores[k]:""}`;
    return [
      `Ticket de Aposta - ${title}`,
      `Apostador: ${name}`,
      `Token: ${state.token}`,
      "",
      `- 🏅 Vencedores das Quartas: (${line("Q1")}, ${line("Q2")}, ${line("Q3")}, ${line("Q4")})`,
      "",
      `- ⚔️ Vencedores da Semi: (${line("S1")}, ${line("S2")})`,
      "",
      `- 🏆 Campeão: (${line("F1")})`,
      `- 2° Lugar: (${ru||"?"})`,
      `- 3° Lugar: (${line("T3")})`
    ].join("\n");
  }

  function refreshPreview(){ const pre=$("#ticketPreview"); if(pre) pre.textContent=buildTicket(); }

  function showNotice(msg, ok=false){
    const box = document.querySelector("#formNotice");
    if(!box) return;
    box.textContent = msg;
    box.classList.remove("hidden","success");
    if(ok) box.classList.add("success");
  }
  function hideNotice(){
    const box = document.querySelector("#formNotice");
    if(!box) return;
    box.textContent = "";
    box.classList.add("hidden");
    box.classList.remove("success");
  }

  function clearBet(){ state.selections={}; state.scores={}; state.token=null; document.querySelectorAll("#betForm select").forEach(s=> s.value=""); $("#bettorName").value=""; hideNotice(); refreshDerived(); refreshPreview(); }

  function validate(){
    const name = $("#bettorName")?.value?.trim();
    if(!name) return { ok:false, msg:"Preencha o nome do apostador." };
    const req = ["Q1","Q2","Q3","Q4","S1","S2","F1","T3"];
    for(const k of req){
      if(!state.selections[k]) return { ok:false, msg:`Selecione o vencedor de ${k}.` };
      if(!state.scores[k]) return { ok:false, msg:`Selecione o placar de ${k}.` };
    }
    return { ok:true };
  }

  function onFinish(){
    const v = validate();
    if(!v.ok){ showNotice(v.msg, false); return; } hideNotice(); showNotice("Aposta pronta para envio.", true);
    sendWhatsApp();
  }

  function sendWhatsApp(){ const phone=(state.tournament?.betting?.whatsappPhone||WHATSAPP_DEFAULT).replace(/[^\d]/g,""); const msg=buildTicket(); const url=`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`; window.open(url,"_blank"); }

  async function wire(){
    const t=await getJSON(`${DATA_PATH}copa-1.json`);
    const m=await getJSON(`${DATA_PATH}copa-1-metrics.json`);
    state.tournament=t; state.metrics=m;
    buildCarousel(t); renderMetrics(m);

    // Back button behavior: if in bet view, go back to home instead of navigating
    const back = document.querySelector('#siteNav .btn-back');
    if(back){
      back.addEventListener('click', function(ev){
        if(state.view==='bet'){
          ev.preventDefault();
          go('home');
        }
      });
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();