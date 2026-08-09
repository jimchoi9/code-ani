export const visualNovelAssets = Object.freeze({
  illustrations: Object.freeze({
    start_rabbit_hole: "./assets/visual-novel/scenes/start_rabbit_hole.jpg",
    door_shrink: "./assets/visual-novel/scenes/door_shrink.jpg",
    cake_grow: "./assets/visual-novel/scenes/cake_grow.jpg",
    door_cat_meet: "./assets/visual-novel/scenes/door_cat_meet.jpg",
    door_caterpillar_meet: "./assets/visual-novel/scenes/door_caterpillar_meet.jpg",
    door_hatter_meet: "./assets/visual-novel/scenes/door_hatter_meet.jpg",
    cake_cat_meet: "./assets/visual-novel/scenes/cake_cat_meet.jpg",
    cake_caterpillar_meet: "./assets/visual-novel/scenes/cake_caterpillar_meet.jpg",
    cake_hatter_meet: "./assets/visual-novel/scenes/cake_hatter_meet.jpg",
    mist_hill_grin: "./assets/visual-novel/scenes/mist_hill_grin.jpg",
    queen_garden_trial_small: "./assets/visual-novel/scenes/queen_garden_trial_small.jpg",
    queen_garden_trial_big: "./assets/visual-novel/scenes/queen_garden_trial_big.jpg",
    end_curiosity: "./assets/visual-novel/endings/end_curiosity.jpg",
    end_prudence: "./assets/visual-novel/endings/end_prudence.jpg",
    end_cheer: "./assets/visual-novel/endings/end_cheer.jpg",
    end_composure: "./assets/visual-novel/endings/end_composure.jpg",
    end_selftrust: "./assets/visual-novel/endings/end_selftrust.jpg",
    end_warmth: "./assets/visual-novel/endings/end_warmth.jpg",
  }),
  spots: Object.freeze({
    spot_truth: "./assets/visual-novel/spots/spot_truth.jpg",
    spot_shield: "./assets/visual-novel/spots/spot_shield.jpg",
    spot_turn: "./assets/visual-novel/spots/spot_turn.jpg",
  }),
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

export function getVisualNovelArtUrl(artKey) {
  return visualNovelAssets.illustrations[artKey] ?? visualNovelAssets.spots[artKey] ?? null;
}
