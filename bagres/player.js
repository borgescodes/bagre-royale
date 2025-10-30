function $(sel, root = document) {
  return root.querySelector(sel);
}
function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

const normTag = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const params = new URLSearchParams(location.search);
const inputTag = (params.get("tag") || "").toUpperCase();
const nick = params.get("nick") || "";

const RAW_TOKEN = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImE5ODEwNDA2LWE2YmItNDM4Ny1iNTZkLWExMDM3YWExMDU3MCIsImlhdCI6MTc2MTc0MjkyOCwic3ViIjoiZGV2ZWxvcGVyLzI3OTRlOTAzLWIxZWMt MDk4Ny01NjIzLWU3OTIzNjEwOTI3ZCIsInNjb3BlcyI6WyJyb3lhbGUiXSwibGltaXRzIj pbeyJ0aWVyIjoiZGV2ZWxvcGVyL3NpbHZlciIsInR5cGUiOiJ0aHJvdHRsaW5nIn0seyJja WRycyI6WyI0NS43OS4yMTguNzkiXSwidHlwZSI6ImNsaWVudCJ9XX0.kwTd90q8nbAWeDy4CswkrGR2dWQ4r4SCrkoRcYrWp6-T2CIrxtqqCHTOCuiePLETpIAwHCbfjf2J_o-cNXXe4g`;
const TOKEN = RAW_TOKEN.replace(/\s+/g, "");

function translateRole(role) {
  const m = {
    coLeader: "Colíder",
    leader: "Líder",
    elder: "Ancião",
    member: "Membro",
  };
  return m[role] || role || "-";
}
function seasonalTrophiesOr(data, fallback) {
  const s = data.progress?.["seasonal-trophy-road-202510"];
  return s?.trophies ?? fallback;
}
/* function clanBadgeUrl(id) {
  return `https://cdn.statsroyale.com/images/badges/${id}.png`;
} */

function cardIcon(u) {
  return u?.iconUrls?.medium || u?.iconUrls?.evolutionMedium || "";
}

async function loadPlayersIndex() {
  try {
    const res = await fetch("./players.json", { cache: "no-store" });
    if (!res.ok) throw new Error("players.json HTTP " + res.status);
    return await res.json();
  } catch (e) {
    console.warn("players.json não disponível", e);
    return [];
  }
}

async function fetchPlayer(tag) {
  if (!tag) {
    throw new Error("TAG vazia");
  }
  const encodedTag = encodeURIComponent(tag.startsWith("#") ? tag : "#" + tag);
  const url = `https://proxy.royaleapi.dev/v1/players/${encodedTag}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error("Falha na API: " + res.status);
  return res.json();
}

function showSpinner() {
  if (document.querySelector(".loading-overlay")) return;
  const el = document.createElement("div");
  el.className = "loading-overlay";
  el.innerHTML =
    '<div class="spinner" role="status" aria-live="polite" aria-label="Carregando"></div>';
  document.body.appendChild(el);
}
function hideSpinner() {
  const el = document.querySelector(".loading-overlay");
  if (el) el.remove();
}
function setLoadingState() {
  showSpinner();
}

function hideApiSections() {
  const sels = [
    "#clanInfo",
    ".deck-section",
    ".season-section",
    ".stats-section",
    ".achievements-section",
  ];
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (el) {
      el.style.display = "none";
    }
  }
}
function showApiSections() {
  const sels = [
    "#clanInfo",
    ".deck-section",
    ".season-section",
    ".stats-section",
    ".achievements-section",
  ];
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (el) {
      el.style.display = "";
    }
  }
}
function removeApiDownNotice() {
  document.querySelectorAll(".api-down.notice").forEach((n) => n.remove());
}
function showApiDownNotice() {
  hideSpinner();
  removeApiDownNotice();
  const main =
    document.querySelector("main.container.resume") ||
    document.querySelector("main") ||
    document.body;

  const whatsUrl =
    "https://wa.me/5591987338595?text=Opa%20Borges%2C%20meus%20dados%20de%20jogador%20no%20site%20Bagre%20Royale%20n%C3%A3o%20est%C3%A3o%20carregando.%20Pode%20verificar%20pra%20mim%3F";

  const msg = `
    <div class="notice api-down" role="status" aria-live="polite">
  <strong>🛠️ Dados em manutenção</strong><br>
  O carregamento dos dados do jogador fica indisponível entre <b>03:00</b> e <b>08:00</b>.<br>
  Se o problema ocorrer fora desse período, entre em contato:<br>
  <a href="https://www.instagram.com/borgesdev/" target="_blank" rel="noopener">@borgesdev</a> | 
  <a href="https://www.instagram.com/pedromyranda/" target="_blank" rel="noopener">@pedromyranda</a><br><br>
  <a href="https://wa.me/5591987338595?text=Opa%20Bg%2C%20meus%20dados%20de%20jogador%20no%20site%20n%C3%A3o%20est%C3%A3o%20carregando.%20Pode%20verificar%20pra%20mim%3F"
     class="btn-whats" target="_blank" rel="noopener"
     aria-label="Falar no WhatsApp">
    <img src="./font/zap.png" alt="" width="18" height="18" class="btn-whats__icon" decoding="async">
    Falar no WhatsApp
  </a>
</div>`;
  main.insertAdjacentHTML("beforeend", msg);
}

async function fetchPlayerWithTimeout(tag, ms = 6000) {
  return await Promise.race([
    fetchPlayer(tag),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("timeout API")), ms)
    ),
  ]);
}
async function renderFallbackFromJson() {
  try {
    const res = await fetch("./players.json", { cache: "no-store" });
    if (!res.ok) throw new Error("players.json HTTP " + res.status);
    const idx = await res.json();
    const me = Array.isArray(idx)
      ? idx.find(
          (p) => (p.tag || "").toUpperCase() === (inputTag || "").toUpperCase()
        )
      : null;
    if (me) {
      __avatarOverride = me.asset || null;

      renderHeader({
        name: me.displayName || me.name || "Jogador",
        tag: me.tag || "",
      });

      if (Array.isArray(me.titles) || typeof me.titles === "object") {
        renderBagreTitles(me.titles);
      }
    }
  } catch (e) {
    console.warn("fallback JSON falhou", e);
  }
  hideApiSections();
  showApiDownNotice();
}

let __avatarOverride = null;

function renderHeader(data) {
  const fallback = `../assets/bagres/${encodeURIComponent(
    nick || data.name
  )}.webp`;
  const avatar = __avatarOverride || fallback;

  const tagText = data.tag ? `(${data.tag})` : "";
  const rawTrophies = data.trophies ?? 0;
  const headerTrophies =
    rawTrophies >= 10000 ? seasonalTrophiesOr(data, rawTrophies) : rawTrophies;

  document.getElementById("headerResume").innerHTML = `
    <img class="avatar" src="${avatar}" alt="Avatar de ${
    nick || data.name
  }" onerror="this.src='../assets/bagres/Borges.webp'">
    <div class="player-head">
      <div class="top-row">
        <h2 class="nick">${data.name} <small class="tag">${tagText}</small></h2>
        <div class="trophy-info" title="Troféus">${headerTrophies.toLocaleString(
          "pt-BR"
        )} 🏆</div>
      </div>
    </div>
  `;
}

function renderClanInfo(data){
  try{
    const el = document.getElementById('clanInfo');
    if (!el) return;

    const clanName = data?.clan?.name || 'Sem Clã';
    const role = (typeof translateRole === 'function')
      ? translateRole((data?.role || '').trim())
      : (data?.role || '—');

    el.innerHTML = [
      `<img id="clanBadgeImg" class="clan-icon" src="./font/clan.png" alt="Ícone do clã">`,
      `<span class="clan-name">${clanName}</span>`,
      `<span class="sep">|</span>`,
      `<span class="clan-role">Cargo <strong>${role}</strong></span>`
    ].join('');
  } catch (e){
    console.error('renderClanInfo error', e);
  }
}

function renderStats(data) {
  const stats = [
    ["Troféus", data.trophies],
    ["Recorde", data.bestTrophies],
    ["Vitórias", data.wins],
    ["Derrotas", data.losses],
    ["3 Coroas", data.threeCrownWins],
    ["Doações (total)", data.totalDonations],
    ["Nível XP", data.expLevel],
    ["Batalhas", data.battleCount],
  ];
  const el = document.getElementById("statsCard");
  if (!el) return;
  el.innerHTML = `
    <h2>Estatísticas</h2>
    <ul class="kv">${stats
      .map(([k, v]) => `<li><span>${k}</span><strong>${v ?? "-"}</strong></li>`)
      .join("")}</ul>
  `;
}

function renderArenaSeasonal(data) {
  const seasonal = data.progress?.["seasonal-trophy-road-202510"];
  const arenaName = seasonal?.arena?.name || data.arena?.name || "-";
  const trophies = seasonal?.trophies ?? data.trophies ?? "-";
  const best = seasonal?.bestTrophies ?? data.bestTrophies ?? "-";

  const el = document.getElementById("arenaCard");
  if (!el) return;
  el.innerHTML = `
    <h2>Temporada Atual</h2>
    <ul class="kv">
      <li><span>Arena</span><strong>${arenaName}</strong></li>
      <li><span>Troféus</span><strong>${trophies}</strong></li>
      <li><span>Recorde da temporada</span><strong>${best}</strong></li>
    </ul>
  `;
}

function renderDeck(data) {
  const el = document.getElementById("deck");
  if (!el) return;
  const cards = data.currentDeck || [];
  el.innerHTML = cards
    .map((c) => {
      const src = cardIcon(c);
      const name = c?.name || "";
      return `<img class="deck-card" title="${name}" alt="${name}" src="${src}">`;
    })
    .join("");
}

function renderBadgesTop(data) {
  const el = document.getElementById("badges");
  if (!el) return;
  const badges = Array.isArray(data.badges) ? data.badges : [];
  const levelOf = (b) => b.level ?? b.maxLevel ?? b.progress ?? 0;
  const top = badges
    .slice()
    .sort((a, b) => levelOf(b) - levelOf(a))
    .slice(0, 4);
  el.innerHTML = top
    .map((b) => {
      const src =
        b.iconUrls?.large || b.iconUrls?.medium || b.iconUrls?.small || "";
      const name = b.name || "Badge";
      return `<img class="badge-img" src="${src}" alt="${name}" title="${name}">`;
    })
    .join("");
}

function renderBagreTitles(titles) {
  const container = document.getElementById("bagreTitles");
  if (!container) return;

  const out = [];
  const pushEntry = (titulo, img, count) => {
    if (!titulo) return;
    const i = out.findIndex((x) => x.titulo === titulo);
    if (i >= 0) {
      out[i].count += Number(count) || 0;
      if (img) out[i].img = img;
    } else out.push({ titulo, img: img || "", count: Number(count) || 0 });
  };

  if (Array.isArray(titles)) {
    for (const item of titles) {
      if (!item) continue;
      if (typeof item.titulo === "string") {
        // legado
        pushEntry(item.titulo.trim(), item.img || item.asset || "", 1);
        continue;
      }
      if (typeof item === "object") {
        // novo formato
        const img = item.img || item.asset || "";
        for (const [k, v] of Object.entries(item)) {
          if (k === "img" || k === "asset") continue;
          if (typeof v === "number") pushEntry(k.trim(), img, v);
        }
      }
    }
  } else if (titles && typeof titles === "object") {
    for (const [k, v] of Object.entries(titles)) {
      if (v && typeof v === "object")
        pushEntry(k.trim(), v.img || v.asset || "", v.count || v.qtd || 0);
      else if (typeof v === "number") pushEntry(k.trim(), "", v);
    }
  }

  if (out.length === 0) {
    container.closest(".titles-section")?.remove();
    return;
  }

  container.innerHTML = out
    .map(
      (it) => `
    <div class="titles-item">
      <img src="${it.img}" alt="${it.titulo}">
      <span class="label">${it.titulo}</span>
      <span class="count">x${it.count}</span>
    </div>
  `
    )
    .join("");
}

(async () => {
  try {
    setLoadingState();
    // Carrega API primeiro com timeout
    const data = await fetchPlayerWithTimeout(inputTag);

    try {
      const idx = await loadPlayersIndex();
      const me = Array.isArray(idx)
        ? idx.find((p) => normTag(p.tag) === normTag(data.tag))
        : null;
      __avatarOverride = me?.asset || null;
      renderBagreTitles(me?.titles || []);
    } catch (e) {
      console.warn("players.json indisponível", e);
    }

    hideSpinner();
    removeApiDownNotice();
    showApiSections();

    renderHeader(data);
    renderClanInfo(data);
    renderDeck(data);

    const ac = document.getElementById("arenaCard");
    if ((data.trophies ?? 0) >= 10000) {
      if (ac) ac.style.display = "block";
      renderArenaSeasonal(data);
    } else {
      if (ac) {
        ac.innerHTML = "";
        ac.style.display = "none";
      }
    }

    renderStats(data);
    renderBadgesTop(data);
  } catch (e) {
    console.error(e);
    hideSpinner();
    await renderFallbackFromJson();
  }
})();
