const grid = document.getElementById('playersGrid');

async function loadPlayers(){
  try{
    let players;
    try {
      const res = await fetch('./players.json', {cache: 'no-store'});
      if(!res.ok) throw new Error('HTTP ' + res.status);
      players = await res.json();
    } catch (e) {

      if (location.protocol === 'file:') {
        try {
          const mod = await import('./players.json', { assert: { type: 'json' }});
          players = mod.default;
        } catch (ie) {
          throw e; 
        }
      } else {
        throw e;
      }
    }

    players.sort((a,b) => {
      const ta = Number.isFinite(+a.titulos) ? +a.titulos : 0;
      const tb = Number.isFinite(+b.titulos) ? +b.titulos : 0;
      if (tb !== ta) return tb - ta;

      const sa = String(a.serie || '').toUpperCase();
      const sb = String(b.serie || '').toUpperCase();
      const la = sa === 'A' ? 1 : 0;
      const lb = sb === 'A' ? 1 : 0;
      if (lb != la) return lb - la;

      const na = String(a.displayName || '');
      const nb = String(b.displayName || '');
      return na.localeCompare(nb, 'pt', { sensitivity: 'base' });
    });

    grid.classList.add('container','players-grid');

    grid.innerHTML = players.map(p => {
      const tag = (p.tag || '').replace(/^#/, '');
      const href = `./player.html?tag=${encodeURIComponent(tag)}&nick=${encodeURIComponent(p.displayName)}`;
      const img = p.asset || '';
      const alt = p.displayName || 'Jogador';
      const serie = (p.serie || '').toUpperCase();
      const serieClass = serie === 'A' ? 'serie-a' : 'serie-b';
      const titulos = Number.isFinite(p.titulos) ? p.titulos : 0;

      return `
        <a class="player-card" href="${href}" aria-label="Ver ${alt}">
          <img src="${img}" alt="${alt}" loading="lazy" onerror="this.style.visibility='hidden'">
          <div class="info">
            <strong class="name ${p.passe ? 'gold-pass' : ''}">${alt}</strong>
            <span class="tag">#${tag}</span>
          </div>
          <div class="right">
            <span class="titles" aria-label="Títulos">x${titulos}</span>
            <span class="badge ${serieClass}" aria-label="Série ${serie}">Série ${serie}</span>
          </div>
        </a>
      `;
    }).join('');
  }catch(e){
    grid.innerHTML = `<p style="color:#f88">Erro ao carregar lista: ${e.message}.</p>`;
    console.error(e);
  }
}

loadPlayers();
document.getElementById('year').textContent = new Date().getFullYear();
