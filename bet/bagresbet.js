(function(){
  function parseISO(iso){ try { return new Date(iso); } catch(_){ return null; } }
  function setupCountdown(){}

  const WHATSAPP_DEFAULT="5591987338595";
  const DATA_PATH="./data/copa-1/";
  const $=(s)=>document.querySelector(s);
  const el=(tag,props={},children=[])=>{ const n=document.createElement(tag); for(const [k,v] of Object.entries(props||{})){ if(v==null) continue; if(k==="className") n.setAttribute("class",v); else if(k==="dataset") Object.assign(n.dataset,v); else if(k==="style"&&typeof v==="object") Object.assign(n.style,v); else if(k in n){ try{ n[k]=v; }catch(_){ n.setAttribute(k,v); } } else n.setAttribute(k,v); } for(const c of children) n.appendChild(typeof c==="string"?document.createTextNode(c):c); return n; };

  const state={ tournament:null, metrics:null, view:"home", selections:{}, scores:{}, token:null };

  async function getJSON(url){ try{ const r=await fetch(url,{cache:"no-store"}); if(!r.ok) return null; return await r.json(); }catch(_){ return null; } }
  function token8(){ const s="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let t=""; for(let i=0;i<8;i++) t+=s[Math.floor(Math.random()*s.length)]; return t; }
  function go(view){ state.view=view; $("#homeView").classList.toggle("hidden",view!=="home"); $("#betView").classList.toggle("hidden",view!=="bet"); const nav=$("#siteNav"); nav.classList.toggle("nav--home",view==="home"); nav.classList.toggle("nav--bet",view==="bet"); }
  function fmtDate(d){ const dt=new Date(d); if(isNaN(dt)) return ""; const dd=String(dt.getDate()).padStart(2,"0"); const mm=String(dt.getMonth()+1).padStart(2,"0"); const yy=dt.getFullYear(); return `${dd}/${mm}/${yy}`; }

  function buildCarousel(){
    const root=document.querySelector("#bet-carousel"); if(!root) return; root.innerHTML="";
    const title="Apostas encerradas";
    const msg="O ganhador da aposta final será definido após a conclusão do Copa Bagre do Brasil. Acompanhe o status da sua aposta inserindo o token do seu bilhete e veja os ganhadores parciais no ranking.";
    const card=el("article",{className:"card card--notice",role:"status","aria-live":"polite"},[
      el("div",{className:"card-body"},[
        el("h3",{className:"card-title"},[title]),
        el("p",{className:"card-text"},[msg])
      ])
    ]);
    root.appendChild(card);
  }

  function moveWinnersAfterCarousel(){
    const carousel=document.getElementById("bet-carousel");
    const home=document.getElementById("homeView");
    if(!carousel||!home) return;
    const heads=home.querySelectorAll(".section-head");
    let winnersHead=null;
    heads.forEach(h=>{ const h2=h.querySelector(".section-title"); if(h2&&h2.textContent.trim()==="Ganhadores") winnersHead=h; });
    const winnersBox=document.getElementById("winnersBox");
    const winnersPanel=winnersBox?(winnersBox.closest("article")||winnersBox):null;
    if(winnersHead&&winnersPanel){ carousel.insertAdjacentElement("afterend",winnersHead); winnersHead.insertAdjacentElement("afterend",winnersPanel); }
  }

  function openBetCard(t,cover,title){
    const betCover=t?.meta?.betCover||cover||"../assets/cards/2.webp";
    $("#betCover").src=betCover; $("#betTitle").textContent=title;
    buildSelectors(t); refreshPreview(); go("bet");
  }

  function computeMetricsFromTickets(data){
    const tickets=(data?.tickets)||[];
    const totals={ champion:{}, runnerUp:{}, third:{}, stages:{ Q1:{},Q2:{},Q3:{},Q4:{},S1:{},S2:{} } };
    for(const tk of tickets){
      const p=tk.picks||{};
      const champ=p.F1?.champion;
      if(champ) totals.champion[champ]=(totals.champion[champ]||0)+1;
      const s1=p.S1?.winner; const s2=p.S2?.winner;
      if(champ&&s1&&s2){ const vice=(s1===champ)?s2:(s2===champ?s1:null); if(vice) totals.runnerUp[vice]=(totals.runnerUp[vice]||0)+1; }
      const t3=p.T3?.third;
      if(t3) totals.third[t3]=(totals.third[t3]||0)+1;
      for(const k of Object.keys(totals.stages)){ const w=p[k]?.winner; if(w) totals.stages[k][w]=(totals.stages[k][w]||0)+1; }
    }
    const norm=(obj)=>{ const sum=Object.values(obj).reduce((a,b)=>a+b,0)||1; const out={}; for(const [k,v] of Object.entries(obj)) out[k]=Math.round((v*100)/sum); return out; };
    const pct={ championPct:norm(totals.champion), runnerUpPct:norm(totals.runnerUp), thirdPct:norm(totals.third), stagePct:{ Q1:{},Q2:{},Q3:{},Q4:{},S1:{},S2:{} } };
    for(const k of Object.keys(totals.stages)) pct.stagePct[k]=norm(totals.stages[k]);
    return { pct, winners:data?.winners||[], ticketsCount:tickets.length };
  }

  function renderMetrics(data){
    const box=$("#metricsBox"); if(!box) return; box.innerHTML="";
    const { pct, ticketsCount }=computeMetricsFromTickets(data||{});
    const champPanel=el("div",{className:"kpi-card"},[
      el("h4",{className:"kpi-title"},["Favorito à Campeão"]),
      el("div",{className:"kpi-list"},Object.entries(pct.championPct).map(([name,p])=> el("div",{className:"kpi-row"},[ el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`]) ]))),
      el("div",{className:"kpi-foot"},[`Amostra: ${ticketsCount} aposta(s)`])
    ]);
    box.appendChild(champPanel);
    const vicePanel=el("div",{className:"kpi-card"},[
      el("h4",{className:"kpi-title"},["Favorito à 2° Lugar"]),
      el("div",{className:"kpi-list"},Object.entries(pct.runnerUpPct).map(([name,p])=> el("div",{className:"kpi-row"},[ el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`]) ])))
    ]);
    box.appendChild(vicePanel);
    const thirdPanel=el("div",{className:"kpi-card"},[
      el("h4",{className:"kpi-title"},["Favorito à 3° Lugar"]),
      el("div",{className:"kpi-list"},Object.entries(pct.thirdPct).map(([name,p])=> el("div",{className:"kpi-row"},[ el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`]) ])))
    ]);
    box.appendChild(thirdPanel);
    const grid=el("div",{className:"kpi-grid-steps"});
    ["Q1","Q2","Q3","Q4"].forEach(k=>{
      grid.appendChild(el("div",{className:"kpi-card"},[
        el("h4",{className:"kpi-title"},[`Vencedores ${k}`]),
        el("div",{className:"kpi-list"},Object.entries(pct.stagePct[k]||{}).map(([name,p])=> el("div",{className:"kpi-row"},[ el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`]) ])))
      ]));
    });
    box.appendChild(grid);
    const gridSemis=el("div",{className:"kpi-grid-steps"});
    ["S1","S2"].forEach(k=>{
      gridSemis.appendChild(el("div",{className:"kpi-card"},[
        el("h4",{className:"kpi-title"},[`Vencedores ${k}`]),
        el("div",{className:"kpi-list"},Object.entries(pct.stagePct[k]||{}).map(([name,p])=> el("div",{className:"kpi-row"},[ el("span",{className:"kpi-name"},[name]), el("span",{className:"kpi-val"},[`${p}%`]) ])))
      ]));
    });
    box.appendChild(gridSemis);
  }

  function renderWinners(m){
    const box=$("#winnersBox"); if(!box) return; box.innerHTML="";
    const list=(m&&Array.isArray(m.winners)&&m.winners.length)?m.winners:null;
    if(!list){ box.appendChild(el("p",{},["Após o torneio será definido."])); return; }
    for(const w of list) box.appendChild(el("p",{},[`${w.name} • Token ${w.token} • ${w.prize||""}`]));
  }

  function computeFinalStageHits(tournament,ticket){
    const actual=getWinnersFromResults(tournament||{});
    const picks=ticket?.picks||{};
    let hits=0;
    if(picks.S1?.winner&&actual.S1?.winner&&picks.S1.winner===actual.S1.winner) hits++;
    if(picks.S2?.winner&&actual.S2?.winner&&picks.S2.winner===actual.S2.winner) hits++;
    if(picks.F1?.champion&&actual.F1?.champion&&picks.F1.champion===actual.F1.champion) hits++;
    if(picks.T3?.third&&actual.T3?.third&&picks.T3.third===actual.T3.third) hits++;
    const ru=getRunnerUpFromActual(actual);
    const myRu=secondPlaceFromTicket(ticket);
    if(ru&&myRu&&ru===myRu) hits++;
    return hits;
  }

  function renderRanking(){
    const box=document.getElementById("winnersBox"); if(!box) return; box.innerHTML="";
    const tickets=Array.isArray(state.tickets)?state.tickets:[];
    const eligible=tickets.filter(tk=>Number(tk?.prize)===20);
    if(!eligible.length){ box.appendChild(el("p",{},["Sem concorrentes com prêmio de R$ 20,00."])); return; }
    const evals=eligible.map(tk=>{ const ev=evaluateTicket(state.tournament,tk); const finalsHits=computeFinalStageHits(state.tournament,tk); return { token:tk.token, name:tk.name||"—", total:ev.total, finalsHits, prize:Number(tk.prize)||0 }; });
    evals.sort((a,b)=>(b.total-a.total)||(b.finalsHits-a.finalsHits));
    const top=evals[0];
    const winners=evals.filter(e=>e.total===top.total&&e.finalsHits===top.finalsHits);
    const totalPrize=20.00;
    const perWinner=totalPrize/winners.length;
    const fmt=(v)=>"R$ "+v.toFixed(2).replace(".",",");
    const head=el("div",{className:"ranking-head"},[
      el("h4",{className:"section-title"},["Ranking parcial"]),
      el("small",{className:"muted"},["Critério: Pontos > acertos em S1, S2, Final, 3° e 2° lugar"])
    ]);
    const barText=winners.length===1?"Líder atual recebe tudo":"Empate: dividido entre "+winners.length+" ("+fmt(perWinner)+" cada)";
    const bar=el("div",{className:"ranking-bar"},[
      el("span",{},["Premiação em disputa: "]),
      el("strong",{},[fmt(totalPrize)]),
      el("span",{className:"sep"},["•"]),
      el("span",{},[barText])
    ]);
    const list=el("div",{className:"ranking-list"});
    winners.forEach((it,idx)=>{ const row=el("div",{className:"ranking-row","data-pos":"1",title:it.name+" — "+it.total+" pts (desempate: "+it.finalsHits+" acertos em fases finais) • prêmio: "+fmt(perWinner)},[ el("span",{className:"rk-pos"},[String(idx+1)]), el("span",{className:"rk-name"},[it.name]), el("span",{className:"rk-pts"},[String(it.total)+" pts"]), el("span",{className:"rk-award"},[fmt(perWinner)]) ]); list.appendChild(row); });
    box.appendChild(head); box.appendChild(bar); box.appendChild(list);
  }

  function quarterPairs(t){ return (t?.rounds?.quartas||[]).map(m=>({ id:m.id, a:m.a.name, b:m.b.name, when:m.meta?.when })); }
  function semisFrom(sel){ return { S1:[sel.Q1||"—",sel.Q2||"—"], S2:[sel.Q3||"—",sel.Q4||"—"] }; }
  function finalFrom(sel){ return { F1:[sel.S1||"—",sel.S2||"—"] }; }
  function losersOfSemis(sel){ const out=[]; const s1pair=semisFrom(sel).S1; if(sel.S1){ out.push(s1pair.find(x=>x!==sel.S1)||"—"); } const s2pair=semisFrom(sel).S2; if(sel.S2){ out.push(s2pair.find(x=>x!==sel.S2)||"—"); } return out.length?out:["—","—"]; }

  function buildSelectors(t){
    const host=$("#stageSelectors"); if(!host) return; host.innerHTML="";
    state.selections={}; state.scores={};
    const makeMatchBlock=(id,title,options)=>{ const blk=el("div",{className:"match-block"}); blk.appendChild(el("div",{className:"match-title"},[title])); const row=el("div",{className:"match-row"}); const sel=el("select",{id,required:true}); sel.appendChild(el("option",{value:""},["— Selecione o vencedor —"])); for(const o of options) sel.appendChild(el("option",{value:o},[o])); sel.addEventListener("change",()=>{ state.selections[id]=sel.value||null; refreshDerived(); refreshPreview(); }); row.appendChild(sel); const score=el("select",{id:`${id}_score`,required:true}); score.appendChild(el("option",{value:""},["Placar"])); ["2x0","2x1"].forEach(p=> score.appendChild(el("option",{value:p},[p]))); score.addEventListener("change",()=>{ state.scores[id]=score.value||null; refreshPreview(); }); row.appendChild(score); blk.appendChild(row); return blk; };
    for(const m of quarterPairs(t)){ const title=`${m.a} vs ${m.b}${m.when?" • "+m.when:""}`; host.appendChild(makeMatchBlock(m.id,title,[m.a,m.b])); }
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
      const opts=(k==="S1"?semisFrom(state.selections).S1:semisFrom(state.selections).S2);
      const cur=sel.value; sel.innerHTML=""; sel.appendChild(el("option",{value:""},["— Selecione o vencedor —"])); for(const o of opts) sel.appendChild(el("option",{value:o,selected:o===cur},[o]));
    }
    const fSel=$("#F1"); if(fSel){ const opts=finalFrom(state.selections).F1; const cur=fSel.value; fSel.innerHTML=""; fSel.appendChild(el("option",{value:""},["— Selecione o vencedor —"])); for(const o of opts) fSel.appendChild(el("option",{value:o,selected:o===cur},[o])); }
    const t3=$("#T3"); if(t3){ const opts=losersOfSemis(state.selections); const cur=t3.value; t3.innerHTML=""; t3.appendChild(el("option",{value:""},["— Selecione o vencedor —"])); for(const o of opts) t3.appendChild(el("option",{value:o,selected:o===cur},[o])); }
  }

  function computeRunnerUp(){ const champ=state.selections.F1; const finals=finalFrom(state.selections).F1||[]; if(!champ) return null; return finals.find(x=>x!==champ)||null; }

  function buildTicket(){
    const title=state.tournament?.meta?.title||"Torneio";
    const name=$("#bettorName")?.value?.trim()||"—";
    if(!state.token) state.token=token8();
    const ru=computeRunnerUp();
    const line=(k)=>`${state.selections[k]||"?"}${state.scores[k]?" "+state.scores[k]:""}`;
    return [
      `Ticket de Aposta - ${title}`,
      `Apostador: ${name}`,
      `Token: ${state.token}`,
      ``,
      `- 🏅 Vencedores das Quartas: (${line("Q1")}, ${line("Q2")}, ${line("Q3")}, ${line("Q4")})`,
      ``,
      `- ⚔️ Vencedores da Semi: (${line("S1")}, ${line("S2")})`,
      ``,
      `- 🏆 Campeão: (${line("F1")})`,
      `- 2° Lugar: (${ru||"?"})`,
      `- 3° Lugar: (${line("T3")})`
    ].join("\n");
  }

  function refreshPreview(){ const pre=$("#ticketPreview"); if(pre) pre.textContent=buildTicket(); }

  function showNotice(msg,ok=false){ const box=document.querySelector("#formNotice"); if(!box) return; box.textContent=msg; box.classList.remove("hidden","success"); if(ok) box.classList.add("success"); }
  function hideNotice(){ const box=document.querySelector("#formNotice"); if(!box) return; box.textContent=""; box.classList.add("hidden"); box.classList.remove("success"); }

  function clearBet(){ state.selections={}; state.scores={}; state.token=null; document.querySelectorAll("#betForm select").forEach(s=> s.value=""); const nm=$("#bettorName"); if(nm) nm.value=""; hideNotice(); refreshDerived(); refreshPreview(); }

  function validate(){
    const name=$("#bettorName")?.value?.trim();
    if(!name) return { ok:false, msg:"Preencha o nome do apostador." };
    const req=["Q1","Q2","Q3","Q4","S1","S2","F1","T3"];
    for(const k of req){ if(!state.selections[k]) return { ok:false, msg:`Selecione o vencedor de ${k}.` }; if(!state.scores[k]) return { ok:false, msg:`Selecione o placar de ${k}.` }; }
    return { ok:true };
  }

  function onFinish(){
    const v=validate();
    if(!v.ok){ showNotice(v.msg,false); return; }
    hideNotice();
    showNotice("Aposta pronta para envio.",true);
    sendWhatsApp();
    go("home");
    const panel=document.querySelector(".panel-kpis");
    const box=document.getElementById("metricsBox");
    if(box) box.scrollIntoView({behavior:"smooth",block:"start"});
    if(panel){ panel.classList.add("flash"); setTimeout(()=>panel.classList.remove("flash"),1800); }
  }

  function sendWhatsApp(){ const phone=(state.tournament?.betting?.whatsappPhone||WHATSAPP_DEFAULT).replace(/[^\d]/g,""); const msg=buildTicket(); const url=`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`; window.open(url,"_blank"); }

  function pickScoreFromResult(aScore,bScore){
    if(aScore==null||bScore==null) return null;
    const A=Number(aScore), B=Number(bScore);
    if(A===2&&B===0) return "2x0";
    if(A===2&&B===1) return "2x1";
    if(B===2&&A===0) return "0x2";
    if(B===2&&A===1) return "1x2";
    return `${A}x${B}`;
  }

  function getWinnersFromResults(t){
    const w={};
    const toName=(n)=> n&&n.name||null;
    function add(list){
      (list||[]).forEach(m=>{
        const a=m.a||{}, b=m.b||{}; const as=a.score, bs=b.score;
        if(as!=null&&bs!=null){
          if(/^Q\d$/.test(m.id)||/^S\d$/.test(m.id)) w[m.id]={ winner:(Number(as)>Number(bs)?toName(a):toName(b)), score:pickScoreFromResult(as,bs) };
          if(m.id==="F1") w.F1={ champion:(Number(as)>Number(bs)?toName(a):toName(b)), score:pickScoreFromResult(as,bs) };
          if(m.id==="T3") w.T3={ third:(Number(as)>Number(bs)?toName(a):toName(b)), score:pickScoreFromResult(as,bs) };
        }
      });
    }
    if(t&&t.rounds){ add(t.rounds.quartas); add(t.rounds.semis); add(t.rounds.final); }
    return w;
  }

  function getRunnerUpFromActual(actual){
    if(!actual) return null;
    const champ=actual.F1&&actual.F1.champion;
    const s1=actual.S1&&actual.S1.winner;
    const s2=actual.S2&&actual.S2.winner;
    if(!champ||!s1||!s2) return null;
    return (s1===champ)?s2:(s2===champ?s1:null);
  }

  function scorePick(expected,actual,stageKey){
    if(!expected) return { pts:0, status:"sem palpite" };
    if(!actual) return { pts:0, status:"aguardando" };
    const weights={ Q:{w:1,exact:2}, S:{w:2,exact:3}, F:{w:5,exact:6}, T:{w:3,exact:4} };
    if(stageKey==="F1"){ const okWinner=expected?.champion&&actual?.champion&&expected.champion===actual.champion; const okScore=okWinner&&expected?.score&&actual?.score&&expected.score===actual.score; const w=weights.F; return okWinner?{ pts:okScore?w.exact:w.w, status:okScore?"acerto total":"acertou campeão" }:{ pts:0, status:"errou" }; }
    if(stageKey==="T3"){ const okWinner=expected?.third&&actual?.third&&expected.third===actual.third; const okScore=okWinner&&expected?.score&&actual?.score&&expected.score===actual.score; const w=weights.T; return okWinner?{ pts:okScore?w.exact:w.w, status:okScore?"acerto total":"acertou vencedor" }:{ pts:0, status:"errou" }; }
    const okWinner=expected?.winner&&actual?.winner&&expected.winner===actual.winner; const okScore=okWinner&&expected?.score&&actual?.score&&expected.score===actual.score; const w=stageKey.startsWith("Q")?weights.Q:weights.S; return okWinner?{ pts:okScore?w.exact:w.w, status:okScore?"acerto total":"acertou vencedor" }:{ pts:0, status:"errou" };
  }

  function evaluateTicket(tournament,ticket){
    const actual=tournament?getWinnersFromResults(tournament):{};
    const picks=ticket?.picks||{}; const order=["Q1","Q2","Q3","Q4","S1","S2","F1","T3"];
    const rows=[]; let total=0, exacts=0, rights=0, wrongs=0, pending=0;
    for(const k of order){
      const sc=scorePick(picks[k],actual[k],k); total+=sc.pts;
      if(sc.status==="acerto total") exacts++; else if(sc.status.startsWith("acertou")) rights++; else if(sc.status==="errou") wrongs++; else pending++;
      const human=(k==="F1"?"Final":k==="T3"?"3° Lugar":k);
      const your=(k==="F1")?(picks[k]?.champion?`${picks[k].champion} ${picks[k].score||""}`.trim():"—"):(k==="T3")?(picks[k]?.third?`${picks[k].third} ${picks[k].score||""}`.trim():"—"):(picks[k]?.winner?`${picks[k].winner} ${picks[k].score||""}`.trim():"—");
      rows.push({ k,label:human,status:sc.status,pts:sc.pts,your,done:!!actual[k] });
    }
    return { total, rows, exacts, rights, wrongs, pending, prize: ticket?.prize??0 };
  }

  function computeLevelsAll(tournament,tickets){
    const list=(tickets||[]).map(tk=>({ token:tk.token, ...evaluateTicket(tournament,tk) }));
    list.sort((a,b)=>(b.total-a.total)||(b.exacts-a.exacts)||(b.rights-a.rights));
    const N=Math.max(1,list.length); const rankByToken=new Map();
    list.forEach((it,idx)=>{ const rank=idx+1; const level=1+Math.floor((idx)*8/N); rankByToken.set(it.token,{ rank,level,total:it.total,exacts:it.exacts,rights:it.rights }); });
    return rankByToken;
  }

  function secondPlaceFromTicket(ticket){
    const s1=ticket?.picks?.S1?.winner; const s2=ticket?.picks?.S2?.winner; const champ=ticket?.picks?.F1?.champion;
    if(!s1||!s2||!champ) return null; const loser=[s1,s2].find(n=>n&&n!==champ)||null; return loser;
  }

  function renderTicketStatus(ticket,evalRes,rk){
    const host=document.getElementById("ticketStatusBox"); if(!host) return;
    host.innerHTML="";
    if(!ticket){ host.innerHTML="<p>Bilhete não encontrado, verifique o token.</p>"; return; }
    const head=el("div",{className:"status-head"},[
      el("h4",{className:"section-title",style:{margin:"0"}},[ticket.name||"—"]),
      el("span",{className:"badge-level"},["Nv ",String((rk&&rk.level)||"-")]),
      el("span",{className:"badge-level"},["Pts: ",String(evalRes.total)]),
      el("span",{className:"badge-level"},["Concorrendo: R$ ",(Number(ticket.prize||0)).toFixed(2).replace(".",",")])
    ]);
    host.appendChild(head);
    const grid=el("div",{className:"status-grid"});
    for(const r of evalRes.rows){
      const cls=!r.done?"row pend":(r.status==="acerto total"?"row ok":(r.status.startsWith("acertou")?"row warn":(r.status==="errou"?"row err":"row")));
      const row=el("div",{className:cls},[
        el("div",{className:"match"},[r.label," ",el("span",{className:"state"},[r.done?"Concluído":"Aguardando"])]),
        el("div",{className:"your"},[r.your]),
        el("div",{className:"pts"},[r.done?`${r.pts} pts`:"0 pts"])
      ]);
      grid.appendChild(row);
    }
    (function(){
      const sp=secondPlaceFromTicket(ticket);
      const actual=getWinnersFromResults(state.tournament||{});
      const ru=getRunnerUpFromActual(actual);
      const done=!!ru;
      const ok=sp&&ru&&sp===ru;
      const cls=!done?"row pend":(ok?"row ok":"row err");
      const row=el("div",{className:cls},[
        el("div",{className:"match"},["2° Lugar"," ",el("span",{className:"state"},[done?"Concluído":"Aguardando"])]),
        el("div",{className:"your"},[sp||"—"]),
        el("div",{className:"pts"},[done?(ok?"4 pts":"0 pts"):"0 pts"])
      ]);
      grid.appendChild(row);
    })();
    host.appendChild(grid);
    host.appendChild(el("div",{className:"summary"},[ document.createTextNode(`Acertos totais: ${evalRes.exacts} • Acertou vencedor: ${evalRes.rights} • Erros: ${evalRes.wrongs} • Aguardando: ${evalRes.pending}`) ]));
    const legend=el("div",{className:"legend"},[
      el("div",{className:"legend-item ok"},[el("span",{className:"dot"}),document.createTextNode(" Verde: acerto total (vencedor + placar)")]),
      el("div",{className:"legend-item warn"},[el("span",{className:"dot"}),document.createTextNode(" Amarelo: acertou vencedor")]),
      el("div",{className:"legend-item err"},[el("span",{className:"dot"}),document.createTextNode(" Vermelho: erro")]),
      el("div",{className:"legend-item pend"},[el("span",{className:"dot"}),document.createTextNode(" Cinza: aguardando (jogo não finalizado)")]),
      el("div",{className:"legend-item"},[document.createTextNode("Pontuação: Quartas 1/2 • Semis 2/3 • Final 5/6 • 2° Lugar 4 • 3° Lugar 3/4")])
    ]);
    host.appendChild(legend);
  }

  function bindTicketUI(){
    const zone=document.querySelector("#homeView");
    const checkBtn=zone&&zone.querySelector("#checkTicketBtn");
    const clearBtn=zone&&zone.querySelector("#clearTicketBtn");
    const inputTok=zone&&zone.querySelector("#ticketToken");
    function doLookup(){
      if(!inputTok) return;
      const tok=(inputTok.value||"").trim().toUpperCase();
      if(!tok){ const box=document.getElementById("ticketStatusBox"); if(box){ box.innerHTML="<p>Informe um token válido.</p>"; } return; }
      const list=Array.isArray(state.tickets)?state.tickets:[];
      const found=list.find(x=>String(x.token||"").toUpperCase()===tok);
      const ev=found?evaluateTicket(state.tournament,found):null;
      const rk=found?(state._levels&&state._levels.get(found.token)):null;
      renderTicketStatus(found,ev,rk);
    }
    state._doLookup=doLookup;
    if(checkBtn&&!checkBtn._bound){ checkBtn.addEventListener("click",doLookup); checkBtn._bound=true; }
    if(clearBtn&&!clearBtn._bound){ clearBtn.addEventListener("click",()=>{ if(inputTok) inputTok.value=""; const box=document.getElementById("ticketStatusBox"); if(box) box.innerHTML=""; }); clearBtn._bound=true; }
    if(inputTok&&!inputTok._bound){ inputTok.addEventListener("keypress",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); doLookup(); } }); inputTok.addEventListener("blur",()=>{ inputTok.value=(inputTok.value||"").trim().toUpperCase(); }); inputTok._bound=true; }
  }

  async function wire(){
    try{ bindTicketUI(); }catch(_){}
    const t=await getJSON(`${DATA_PATH}copa-1-results.json`);
    const m=(await getJSON(`${DATA_PATH}copa-1-metrics.json`))||{};
    const tk=await getJSON(`${DATA_PATH}copa-1-tickets.json`);
    state.tournament=t||{}; state.metrics=m||{}; state.tickets=(tk&&tk.tickets)||[];
    state._levels=computeLevelsAll(state.tournament,state.tickets);
    buildCarousel(state.tournament);
    moveWinnersAfterCarousel();
    renderRanking();
    renderMetrics(state.metrics);
    const back=document.querySelector("#siteNav .btn-back");
    if(back){ back.addEventListener("click",function(ev){ if(state.view==="bet"){ ev.preventDefault(); go("home"); } }); }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",wire); else wire();
})();
