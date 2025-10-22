(function(){
  function computeTournamentStats(t) {
    const per = {};
    function ensure(p){ if(!per[p]) per[p]={ name:p, wins:0, losses:0, sweepsFor:0, sweepsAgainst:0, series:+0, saldo:+0 }; return per[p]; }
    for(const m of t.matches){
      const A = ensure(m.a), B = ensure(m.b);
      A.series++; B.series++;
      if(m.as>m.bs){ A.wins++; B.losses++; A.saldo += (m.as-m.bs); B.saldo -= (m.as-m.bs); }
      else { B.wins++; A.losses++; B.saldo += (m.bs-m.as); A.saldo -= (m.bs-m.as); }
      if(m.as===2 && m.bs===0){ A.sweepsFor++; B.sweepsAgainst++; }
      if(m.bs===2 && m.as===0){ B.sweepsFor++; A.sweepsAgainst++; }
    }
    return per;
  }

  function aggregateAll(data){
    const total = {};
    const titles = {};
    for(const t of data.tournaments){
      const stats = computeTournamentStats(t);
      if(t.status==="done"){
        const champ = (t.ranking && t.ranking[0]?.name) || Object.values(stats).sort((a,b)=> (b.wins-a.wins) || (b.saldo-a.saldo))[0]?.name;
        if(champ){ titles[champ] = (titles[champ]||0)+1; }
      }
      for(const [name,ps] of Object.entries(stats)){
        if(!total[name]) total[name]={ name, wins:0, losses:0, titles:0 };
        total[name].wins += ps.wins;
        total[name].losses += ps.losses;
      }
    }
    for(const [n,c] of Object.entries(titles)){
      if(!total[n]) total[n]={ name:n, wins:0, losses:0, titles:0 };
      total[n].titles = c;
    }
    for(const n of Object.keys(data.players)){
      if(!total[n]) total[n]={ name:n, wins:0, losses:0, titles:0 };
    }
    return total;
  }

  function sortPlayers(players, mode){
    const arr = Object.values(players);
    if(mode==="wins") arr.sort((a,b)=> (b.wins-a.wins) || (b.titles-a.titles) || a.name.localeCompare(b.name));
    else if(mode==="name") arr.sort((a,b)=> a.name.localeCompare(b.name));
    else arr.sort((a,b)=> (b.titles-a.titles) || (b.wins-a.wins) || a.name.localeCompare(b.name));
    return arr;
  }

  function qs(id){ return document.getElementById(id); }
  function setYear(){ const y = new Date().getFullYear(); const el = document.getElementById("year"); if(el) el.textContent = y; }

  window.BAGRE_ENGINE = { computeTournamentStats, aggregateAll, sortPlayers, qs, setYear };
})();
