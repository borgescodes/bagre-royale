const hallGrid = document.getElementById("hallGrid");

const data = {
  bagreDaGalera: {
    title: "Bagre da Galera",
    subtitle: "Votação popular (encerrada)",
    options: [
      { label: "Borges", pct: 78.3, img: "../assets/bagres/borges.webp" },
      { label: "Boaz", pct: 14.0, img: "../assets/bagres/boaz.webp" },
      { label: "Felipão", pct: 9.7, img: "../assets/bagres/felipão.webp" },
    ],
  },

  bestDeck: {
    title: "Melhor Deck do Ano",
    subtitle: "Votação entre finalistas",
    winnerDeckThumb: "../assets/bagres/borges.webp",
    options: [
      {
        label: "Morteiro Bait — Borges",
        pct: 39.1,
        ownerImg: "../assets/bagres/borges.webp",
      },
      {
        label: "Mega Bait — Lobato",
        pct: 17.4,
        ownerImg: "../assets/bagres/lobato.webp",
      },
      {
        label: "Porcos e Recrutas — Boaz",
        pct: 13.0,
        ownerImg: "../assets/bagres/boaz.webp",
      },
    ],
  },

  matchOfYear: {
    title: "Melhor Partida do Ano",
    subtitle: "Votação encerrada",
    winner: {
      title: "Lobato × Barnes — Série B T2",
      pct: 43.5,
      imgA: "../assets/bagres/lobato.webp",
      imgB: "../assets/bagres/barnes.webp",
    },
    // note: propriedade "nominated" removida / ausente — renderMatch trata isso agora
  },

  topWinners: [
    {
      title: "Bagre Revelação",
      winner: "LOBATO",
      notes: ["Destaque absoluto na Série B2", "3º lugar na Copa 2"],
    },
    {
      title: "Melhor Retorno em Série (Clutch Player)",
      winner: "FELPS",
      notes: [
        "Diversas viradas 0×1 → 2×1",
        "Clutch em Série A e Copa",
        "Alto índice de decisões",
      ],
    },
    {
      title: "Rei das Copas",
      winner: "BORGES",
      notes: ["Invicto em mata-mata", "Campeão das duas edições"],
    },
  ],

  fullWinners: [
    {
      title: "Bagre Mais Consistente",
      winner: "BOAZ",
      notes: ["Baixa variação", "Pódios nas Copas"],
    },
    {
      title: "Melhor Win Rate do Ano",
      winner: "BORGES",
      notes: ["WR perfeito nas Copas"],
    },
    {
      title: "Bagre que Mais Evoluiu",
      winner: "FELIPÃO",
      notes: ["Evolução clara entre temporadas"],
    },
    {
      title: "Melhor Performance de Divisão",
      winner: "BOAZ",
      notes: ["Dominou de forma perfeita uma divisão (Série B 1)"],
    },
    {
      title: "Jogador Mais Decisivo da Série A",
      winner: "BORGES",
      notes: ["Resultados que definiram topo"],
    },
    {
      title: "Jogador Mais Decisivo da Série B",
      winner: "LOBATO",
      notes: ["Impacto direto no G4"],
    },
    {
      title: "Melhor Estreia em Copa",
      winner: "LOBATO",
      notes: ["Semifinal + 3º lugar"],
    },
    {
      title: "Melhor Jogador em Jogos Grandes",
      winner: "FELIPÃO",
      notes: ["Capacidade de bater jogadores mais fortes em momentos decisivos"],
    },
    {
      title: "Rival que Ninguém Quer Pegar",
      winner: "PERSON",
      notes: ["Séries apertadas contra líderes"],
    },
    {
      title: "Prêmio Persistência Inabalável",
      winner: "RICARDO",
      notes: ["Sempre presente, nunca desistiu"],
    },
    {
      title: "Maior Ascensão do Ano",
      winner: "MC KAUÃ",
      notes: ["Evolução contínua na B2"],
    },
    {
      title: "Retorno Mais Impactante do Ano",
      winner: "BARNES",
      notes: ["De WO a vitórias importantes"],
    },
  ],
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "style") node.style.cssText = v;
    else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) =>
    typeof c === "string"
      ? node.appendChild(document.createTextNode(c))
      : c && node.appendChild(c)
  );
  return node;
}

function renderHighlight() {
  const card = el("div", { class: "card big highlight" });

  const left = el("div", {}, [
    el("div", { class: "section-title" }, "Destaque do Ano"),
    el(
      "p",
      { class: "small" },
      "MVP • Rei das Copas • Melhor Deck"
    ),
  ]);

  const right = el(
    "div",
    { style: "display:flex;gap:12px;align-items:center" },
    [
      el("img", {
        src: "../assets/bagres/borges.webp",
        alt: "BORGES",
        style: "width:92px;height:92px;border-radius:14px;object-fit:cover",
      }),
      el("div", {}, [
        el("div", { style: "font-weight:800;font-size:20px" }, "BORGES"),
        el("div", { class: "small" }, "MVP de 2025"),
      ]),
    ]
  );

  card.append(left, right);
  return card;
}

function renderSmallCard(obj) {
  const card = el("div", { class: "card" });
  card.append(el("h3", {}, obj.title));
  if (obj.subtitle) card.append(el("div", { class: "small" }, obj.subtitle));

  const list = el("div", {});
  (obj.options || []).forEach((o) => {
    const row = el("div", { class: "row" });
    row.append(
      el("div", { class: "player" }, [
        el("img", { src: o.img, alt: o.label }),
        el("div", {}, el("div", { style: "font-weight:700" }, o.label)),
      ]),
      el("div", { class: "progress-wrap" }, [
        el(
          "div",
          { class: "bar" },
          el("i", { style: `width:${Math.max(0, Math.min(100, o.pct))}%` })
        ),
        el("div", { class: "pct" }, `${o.pct}%`),
      ])
    );
    list.append(row);
  });

  card.append(list);
  return card;
}

function renderDeck(obj) {
  const card = el("div", { class: "card" });
  card.append(el("h3", {}, obj.title));
  if (obj.subtitle) card.append(el("div", { class: "small" }, obj.subtitle));

  const list = el("div", {});
  const optionsToShow = (obj.options || []).slice();

  let winnerOption = null;
  if (obj.winnerDeckThumb && optionsToShow.length > 0) {
    winnerOption = optionsToShow.shift();
  }

  optionsToShow.forEach((o) => {
    const row = el("div", { class: "row" });
    row.append(
      el("div", { class: "player" }, [
        el("img", { src: o.ownerImg || o.img || "", alt: o.label }),
        el("div", {}, el("div", { style: "font-weight:700" }, o.label)),
      ]),
      el("div", { class: "pct" }, `${o.pct}%`)
    );
    list.append(row);
  });

  if (winnerOption && obj.winnerDeckThumb) {
    const winnerRow = el("div", { class: "row" }, [
      el("div", { class: "player" }, [
        el("img", {
          src: obj.winnerDeckThumb,
          class: "deck-thumb",
          alt: "Deck vencedor",
        }),
        el("div", {}, [
          el("div", { style: "font-weight:800" }, winnerOption.label),
          el("div", { class: "small" }, "Deck vencedor"),
        ]),
      ]),
      el("div", { class: "pct" }, `${winnerOption.pct}%`),
    ]);

    card.append(winnerRow);
  }

  card.append(list);
  return card;
}

function renderMatch(obj) {
  const card = el("div", { class: "card" });
  card.append(el("h3", {}, obj.title));
  if (obj.subtitle) card.append(el("div", { class: "small" }, obj.subtitle));

  if (obj.winner) {
    card.append(
      el("div", { class: "row" }, [
        el("div", { class: "player" }, [
          el("img", { src: obj.winner.imgA, alt: "Time A" }),
          el("div", {}, obj.winner.title),
        ]),
        el("div", { class: "pct" }, `${obj.winner.pct}%`),
      ])
    );
  }

  // somente renderiza a lista de indicados se houver
  if (Array.isArray(obj.nominated) && obj.nominated.length) {
    const list = el("ol", { class: "small" });
    obj.nominated.forEach((x) => list.append(el("li", {}, x)));
    card.append(list);
  }

  return card;
}

function renderTopWinners(list) {
  const card = el("div", { class: "card" });
  card.append(el("h3", {}, "Destaques Especiais"));

  const grid = el("div", { class: "winners-grid" });
  (list || []).forEach((item) => {
    const row = el("div", { class: "winner-row" });

    row.append(
      el("div", { class: "winner-left" }, [
        // tenta usar imagem correspondente ao vencedor, fallback para borges
        el("img", {
          src: `../assets/bagres/${item.winner
            .toLowerCase()
            .replace(/\s+/g, "")}.webp`,
          alt: item.winner,
        }),
        el("div", { class: "winner-meta" }, [
          el("div", { class: "meta-title" }, item.title),
          el("div", { class: "meta-notes" }, (item.notes || []).join(" • ")),
        ]),
      ]),
      el("div", { style: "font-weight:800;color:var(--accent)" }, item.winner)
    );

    grid.append(row);
  });

  card.append(grid);
  return card;
}

function renderWinnerList(list) {
  const FALLBACK_IMG = "../assets/bagres/borges.webp";

  const imageMap = {
    "bagre mais consistente": "../assets/bagres/boaz.webp",
    "melhor performance de divisão": "../assets/bagres/boaz.webp",
    "melhor win rate do ano": "../assets/bagres/borges.webp",
    "bagre que mais evoluiu": "../assets/bagres/felipao.webp",
    "melhor jogador em jogos grandes": "../assets/bagres/felipao.webp",
    "jogador mais decisivo da série b": "../assets/bagres/lobato.webp",
    "jogador mais decisivo da série a": "../assets/bagres/borges.webp",
    "melhor estreia em copa": "../assets/bagres/lobato.webp",
    "rival que ninguém quer pegar": "../assets/bagres/person.webp",
    "prêmio persistência inabalável": "../assets/bagres/ricardo.webp",
    "maior ascensão do ano": "../assets/bagres/kaua.webp",
    "retorno mais impactante do ano": "../assets/bagres/felipe.webp",
  };

  function norm(s) {
    return String(s || "")
      .trim()
      .toLowerCase();
  }

  const card = el("div", { class: "card" });
  card.append(el("h3", {}, "Premiações Gerais"));

  const grid = el("div", { class: "winners-grid" });

  (list || []).forEach((item) => {
    const row = el("div", { class: "winner-row" });

    const mapped = imageMap[norm(item.title)] || FALLBACK_IMG;

    row.append(
      el("div", { class: "winner-left" }, [
        el("img", {
          src: mapped,
          alt: item.title,
          onerror: `this.onerror=null;this.src='${FALLBACK_IMG}'`,
        }),
        el("div", { class: "winner-meta" }, [
          el("div", { class: "meta-title" }, item.title),
          el("div", { class: "meta-notes" }, (item.notes || []).join(" • ")),
        ]),
      ]),
      el("div", { style: "font-weight:800;color:var(--accent)" }, item.winner)
    );

    grid.append(row);
  });

  card.append(grid);
  return card;
}

function buildPage() {
  hallGrid.append(
    renderHighlight(),
    renderSmallCard(data.bagreDaGalera),
    renderDeck(data.bestDeck),
    renderMatch(data.matchOfYear),
    renderTopWinners(data.topWinners),
    renderWinnerList(data.fullWinners)
  );
}

buildPage();
