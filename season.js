(function(){
  const D = window.BAGRE_DATA;
  const E = window.BAGRE_ENGINE;

  function el(tag, props={}, children=[]){
    const n = document.createElement(tag);
    Object.assign(n, props);
    if(props.className) n.setAttribute("class", props.className);
    for(const c of children){
      if(typeof c==="string") n.appendChild(document.createTextNode(c)); else if(c) n.appendChild(c);
    }
    return n;
  }

  function param(name){
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }

  function renderRanking(t){
    const stats = E.computeTournamentStats(t);
    const computedRank = Object.values(stats).sort((a,b)=> (b.wins-a.wins) || (b.saldo-a.saldo));
    const rows = (t.ranking?.length ? t.ranking : computedRank.map(r=>({name:r.name,wins:r.wins,losses:r.losses,saldo:r.saldo})));
    const tbody = document.querySelector("#rankingTable tbody");
    tbody.innerHTML = "";
    rows.forEach((r,i)=>{
      const tr = document.createElement("tr");
      const pos = document.createElement("td");
      const chip = document.createElement("span"); chip.className="rank-pos-chip"; chip.textContent = i+1;
      pos.appendChild(chip);
      tr.appendChild(pos);
      tr.appendChild(el("td",{},[r.name]));
      tr.appendChild(el("td",{},[String(r.wins)]));
      tr.appendChild(el("td",{},[String(r.losses)]));
      tr.appendChild(el("td",{},[r.saldo>0?`+${r.saldo}`:String(r.saldo)]));
      tbody.appendChild(tr);
    });
  }

  function render(){
    E.setYear();
    const id = param("id");
    const t = D.tournaments.find(x=>x.id===id) || D.tournaments[0];
    document.getElementById("seasonCover").src = t.cover;
    document.getElementById("seasonName").textContent = t.name;
    document.getElementById("seasonMeta").textContent = t.status==="upcoming" ? "Em breve" : "Concluído";

    const summary = document.getElementById("seasonSummary");
    summary.innerHTML = "";
    if(t.status==="upcoming"){
      summary.appendChild(el("p",{},["Detalhes serão publicados após o torneio."]));
    }else{
      const s = t.summary || {};
      if(s.champion){
        summary.appendChild(el("p",{},[`🏆 Campeão (MVP): ${s.champion.name}. ${s.champion.note}`]));
      }
      if(s.efficiency) summary.appendChild(el("p",{},[`📈 Eficiência: ${s.efficiency}`]));
      if(s.curiosities?.length){
        summary.appendChild(el("p",{},["🧠 Curiosidades:"]));
        for(const c of s.curiosities){ summary.appendChild(el("p",{},[`• ${c}`])); }
      }
    }

    const highlights = document.getElementById("seasonHighlights");
    highlights.innerHTML = "";
    if(t.summary?.upset) highlights.appendChild(el("p",{},[`⚡ Zebra: ${t.summary.upset}`]));
    if(t.summary?.topMatches?.length){
      highlights.appendChild(el("p",{},["🔥 Melhores jogos:"]));
      for(const g of t.summary.topMatches){ highlights.appendChild(el("p",{},[`• ${g}`])); }
    }
    if(t.summary?.sweeps?.length){
      highlights.appendChild(el("p",{},["💥 Varridas:"]));
      for(const g of t.summary.sweeps){ highlights.appendChild(el("p",{},[`• ${g}`])); }
    }

    renderRanking(t);

    const tbody = document.querySelector("#matchesTable tbody");
    tbody.innerHTML = "";
    for(const m of t.matches){
      const tr = el("tr");
      tr.appendChild(el("td",{},[m.a]));
      tr.appendChild(el("td",{},[`${m.as} × ${m.bs}`]));
      tr.appendChild(el("td",{},[m.b]));
      tbody.appendChild(tr);
    }
  }

  document.addEventListener("DOMContentLoaded", render);
})();
