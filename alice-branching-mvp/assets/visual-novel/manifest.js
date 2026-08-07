export const visualNovelAssets = Object.freeze({
  backgrounds: {
    rabbitHole: "./assets/visual-novel/backgrounds/rabbit-hole.svg",
    tinyGarden: "./assets/visual-novel/backgrounds/tiny-garden.svg",
    cheshireTree: "./assets/visual-novel/backgrounds/cheshire-tree.svg",
    teaParty: "./assets/visual-novel/backgrounds/tea-party.svg",
    giantLand: "./assets/visual-novel/backgrounds/giant-land.svg",
    giantMushroom: "./assets/visual-novel/backgrounds/giant-mushroom.svg",
  },
  characters: {
    rabbit: "./assets/visual-novel/characters/white-rabbit.svg",
    cat: "./assets/visual-novel/characters/cheshire-cat.svg",
    hatter: "./assets/visual-novel/characters/mad-hatter.svg",
    caterpillar: "./assets/visual-novel/characters/caterpillar.svg",
  },
  sceneBackgrounds: {
    S00: "rabbitHole", S01: "tinyGarden", A1: "cheshireTree", A3: "teaParty",
    S02: "giantLand", B2: "giantMushroom", E1: "cheshireTree", E3: "teaParty", E5: "giantLand",
  },
  sceneCharacters: { S00: "rabbit", A1: "cat", A3: "hatter", B2: "caterpillar" },
  endingTones: { E1: "curiosity", E3: "joy", E5: "confidence" },
});
