(function(){
  const D = (window.BAGRE_DATA && typeof window.BAGRE_DATA==="object") ? window.BAGRE_DATA : { players:{}, tournaments:[] };

  function el(tag, props={}, children=[]){
    const n=document.createElement(tag);
    if(props && typeof props==="object"){
      for(const [k,v] of Object.entries(props)){
        if(v==null) continue;
        if(k==="className"){ n.setAttribute("class", v); continue; }
        if(k.includes("-") || k.startsWith("aria") || k.startsWith("data")){ n.setAttribute(k, v); continue; }
        try{ if(k in n) n[k]=v; else n.setAttribute(k, v); }catch(_){ n.setAttribute(k, v); }
      }
    }
    for(const c of (children||[])){
      if(c==null) continue;
      n.appendChild(typeof c==="string" ? document.createTextNode(c) : c);
    }
    return n;
  }

  function text(v){ return String(v==null?"":v); }
  function clamp(n,min,max){ n=+n||0; return Math.max(min, Math.min(max, n)); }

  function buildCard(t){
    const cover=el("img",{className:"card-cover",src:text(t.cover||""),alt:text(t.name||"Capa")});
    const body=el("div",{className:"card-body"});
    const title=el("h3",{className:"card-title"},[text(t.name||"Campeonato")]);
    const meta=el("p",{className:"card-meta"},[new Date(t.date||Date.now()).toLocaleDateString("pt-BR")]);
    const link=el("a",{className:"card-link",href:`season.html?id=${encodeURIComponent(t.id)}`,"aria-label":`Abrir ${t.name}`});
    body.appendChild(title); body.appendChild(meta);
    return el("article",{className:"card"},[cover,body,link]);
  }

  function aggregatePlayers(){
    const base={};
    const players=D.players||{};
    for(const k of Object.keys(players)){
      const p=players[k]||{};
      base[k]={ name:p.name||k, avatar:p.avatar||"", achievements:Array.isArray(p.achievements)?p.achievements:[], wins:0, losses:0, saldo:0, series:0, titles:0 };
    }
    const ts=Array.isArray(D.tournaments)?D.tournaments:[];
    for(const t of ts){
      const per={};
      const ms=Array.isArray(t.matches)?t.matches:[];
      for(const m of ms){
        if(!m||!m.a||!m.b) continue;
        if(!per[m.a]) per[m.a]={wins:0,losses:0,saldo:0,series:0};
        if(!per[m.b]) per[m.b]={wins:0,losses:0,saldo:0,series:0};
        per[m.a].series++; per[m.b].series++;
        const as=m.as|0, bs=m.bs|0;
        if(as>bs){ per[m.a].wins++; per[m.b].losses++; per[m.a].saldo+=(as-bs); per[m.b].saldo-=(as-bs); }
        else if(bs>as){ per[m.b].wins++; per[m.a].losses++; per[m.b].saldo+=(bs-as); per[m.a].saldo-=(bs-as); }
      }
      // aplica totais desse torneio ao agregado
      for(const k of Object.keys(per)){
        if(!base[k]) base[k]={ name:k, avatar:"", achievements:[], wins:0, losses:0, saldo:0, series:0, titles:0 };
        base[k].wins += per[k].wins|0;
        base[k].losses += per[k].losses|0;
        base[k].saldo += per[k].saldo|0;
        base[k].series += per[k].series|0;
      }
      // títulos por tabela final se existir
      if(Array.isArray(t.ranking)){
        const champ = t.ranking[0] && t.ranking[0].name;
        if(champ && base[champ]) base[champ].titles += 1;
      }
    }
    return base;
  }

  function sortTournaments(list){
    const a=list.slice();
    a.sort((x,y)=> new Date(y.date||0) - new Date(x.date||0));
    return a;
  }

  function renderCarousel(){
    const root=document.getElementById("carousel");
    if(!root) return;
    const items=sortTournaments(Array.isArray(D.tournaments)?D.tournaments:[]);
    root.innerHTML="";
    for(const t of items){ root.appendChild(buildCard(t)); }
  }

  function buildPlayerCard(p){
    const root=el("div",{className:"player",role:"button",tabIndex:0,"aria-expanded":"false"});
    const ava=el("img",{className:"player-avatar",src:text(p.avatar||""),alt:text(p.name)});
    const info=el("div");
    const name=el("h4",{className:"player-name"},[text(p.name)]);
    const sub=el("p",{className:"player-sub"},[`${p.titles||0} título(s) · ${p.wins||0}V-${p.losses||0}D · saldo ${p.saldo>0?"+":""}${p.saldo||0}`]);
    const toggle=el("button",{className:"player-toggle","aria-label":"Expandir detalhes"},["▾"]);
    const details=el("div",{className:"player-details"});
    const badges=el("div");
    const ach=Array.isArray(p.achievements)?p.achievements:[];
    if(ach.length===0) badges.appendChild(el("span",{className:"badge"},["Sem conquistas ainda"]));
    else for(const a of ach){ badges.appendChild(el("span",{className:"badge"},[text(a)])); }
    details.appendChild(badges);
    info.appendChild(name); info.appendChild(sub); info.appendChild(details);
    root.appendChild(ava); root.appendChild(info); root.appendChild(toggle);

    function toggleOpen(){
      const isOpen = root.classList.toggle("is-open");
      root.setAttribute("aria-expanded", isOpen?"true":"false");
    }
    root.addEventListener("click", e=>{ if(e.target===toggle) toggleOpen(); });
    root.addEventListener("keypress", e=>{ if(e.key==="Enter"||e.key===" ") toggleOpen(); });

    return root;
  }

  function sortPlayers(arr, mode){
    const a=arr.slice();
    if(mode==="wins") a.sort((x,y)=>(y.wins-x.wins)||(y.saldo-x.saldo)||(y.titles-x.titles)||x.name.localeCompare(y.name));
    else if(mode==="name") a.sort((x,y)=>x.name.localeCompare(y.name));
    else a.sort((x,y)=>(y.titles-x.titles)||(y.wins-x.wins)||(y.saldo-x.saldo)||x.name.localeCompare(y.name));
    return a;
  }

  function renderPlayers(){
    const box=document.getElementById("playersGrid"); if(!box) return;
    const select=document.getElementById("playerSort");
    const mode=select ? select.value : "titles";
    const agg=aggregatePlayers();
    const list=sortPlayers(Object.values(agg), mode);
    box.innerHTML="";
    if(list.length===0){ box.appendChild(el("div",{className:"card-body"},["Nenhum jogador encontrado"])); return; }
    for(const p of list){ box.appendChild(buildPlayerCard(p)); }
  }

  function wire(){
    const y=document.getElementById("year"); if(y) y.textContent=String(new Date().getFullYear());
    try{ renderCarousel(); }catch(e){ console.error("Erro ao renderizar carrossel:", e); }
    const sort=document.getElementById("playerSort"); if(sort) sort.addEventListener("change", renderPlayers);
    try{ renderPlayers(); }catch(e){ console.error("Erro ao renderizar jogadores:", e); }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
