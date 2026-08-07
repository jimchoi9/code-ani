export const scene02 = {
  id: "windy-hill",
  title: "바람 부는 언덕",
  caption: "언덕 위에서 불어온 바람이 나뭇잎을 간질였어요.",
  palette: {
    skyTop: "#9ed9ef",
    skyBottom: "#f6e8be",
    mountain: "#a8b9ad",
    hill: "#77b85a",
    foreground: "#407f37",
    accent: "#f6a8b8",
  },
  layers: [
    { key: "sky", depth: 0.04, scroll: -10 },
    { key: "mountains", depth: 0.2, scroll: 20 },
    { key: "hills", depth: 0.48, scroll: 52 },
    { key: "characters", depth: 0.74, scroll: 78 },
    { key: "foreground", depth: 1, scroll: 118 },
  ],
  beats: [
    { type: "caption", text: "휘이잉, 바람이 불어요." },
    { type: "move", target: "hero", y: -18, duration: 0.35 },
    { type: "expression", target: "hero", value: "surprised" },
  ],
};

