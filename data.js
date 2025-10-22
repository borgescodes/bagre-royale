window.BAGRE_DATA = {
  players: {
    "Borges": { name:"Borges", avatar:"assets/borges.png", achievements:["Campeão 1ª Season Bagre Royale"] },
    "Lascanor": { name:"Lascanor", avatar:"assets/lascanor.png", achievements:["2º Lugar – 1ª Season Bagre Royale"] },
    "Bad": { name:"Bad", avatar:"assets/bad.png", achievements:["3º Lugar – 1ª Season Bagre Royale"] },
    "Person": { name:"Person", avatar:"assets/person.png", achievements:[] },
    "Gaab": { name:"Gaab", avatar:"assets/gaab.png", achievements:[] }
  },
  tournaments: [
    {
      id: "bagre-s1",
      name: "Camp Bagre Royale - 1ª Season",
      cover: "assets/bagre1.png",
      date: "2025-10-19",
      status: "done",
      summary: {
        champion: { name:"Borges", mvp:true, note:"Melhor desempenho geral — saldo +4 em séries e duas vitórias por 2×0."},
        upset: "Gaab 2×1 Borges — única vitória de Gaab e única derrota do campeão.",
        topMatches: [
          "Gaab 2×1 Borges — resultado mais inesperado.",
          "Bad 2×1 Person — definiu o top 3.",
          "Lascanor 2×1 Bad — consolidou o saldo positivo."
        ],
        sweeps: [
          "Borges: 2 a favor (vs Bad, Person)",
          "Person: 1 a favor (vs Gaab) / 1 contra (vs Borges)",
          "Bad: 1 a favor (vs Gaab) / 1 contra (vs Borges)",
          "Lascanor: 1 a favor (vs Gaab)",
          "Gaab: 3 contra"
        ],
        efficiency: "Borges 70% > Lascanor 55% > Bad / Person 50% > Gaab 22%",
        curiosities: [
          "Borges teve o melhor ataque, vencendo 7 duelos no total.",
          "Lascanor foi o mais consistente, sem perder por 2×0.",
          "Gaab foi o rei das surpresas, tirando o único ponto do campeão.",
          "Person manteve 50% de aproveitamento mesmo enfrentando os três do topo.",
          "Bad teve a melhor recuperação após começar perdendo duas partidas."
        ]
      },
      matches: [
        { a:"Lascanor", b:"Gaab", as:2, bs:0 },
        { a:"Lascanor", b:"Bad", as:2, bs:1 },
        { a:"Lascanor", b:"Borges", as:1, bs:2 },
        { a:"Lascanor", b:"Person", as:1, bs:2 },
        { a:"Gaab", b:"Bad", as:0, bs:2 },
        { a:"Gaab", b:"Borges", as:2, bs:1 },
        { a:"Gaab", b:"Person", as:0, bs:2 },
        { a:"Bad", b:"Borges", as:0, bs:2 },
        { a:"Bad", b:"Person", as:2, bs:1 },
        { a:"Borges", b:"Person", as:2, bs:0 }
      ],
      ranking: [
        { name:"Borges", wins:3, losses:1, saldo:+4 },
        { name:"Lascanor", wins:2, losses:2, saldo:+1 },
        { name:"Bad", wins:2, losses:2, saldo:0 },
        { name:"Person", wins:2, losses:2, saldo:0 },
        { name:"Gaab", wins:1, losses:3, saldo:-5 }
      ]
    },
    {
      id: "bagre-s2",
      name: "Camp Bagre Royale - 2° Season",
      cover: "assets/bagre2.png",
      date: "2025-10-24",
      status: "upcoming",
      summary: { },
      matches: []
    }
  ]
};
