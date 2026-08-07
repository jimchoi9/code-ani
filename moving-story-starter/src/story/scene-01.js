export const scene01 = {
  id: "morning-path",
  title: "아침 숲길",
  caption: "작은 친구는 햇살을 따라 숲길을 걷기 시작했어요.",
  palette: {
    skyTop: "#8fcdf0",
    skyBottom: "#fff0c7",
    mountain: "#8fa9a6",
    hill: "#83c45d",
    foreground: "#4f963d",
    accent: "#f5c93f",
  },
  layers: [
    { key: "sky", depth: 0.05, scroll: -8 },
    { key: "mountains", depth: 0.22, scroll: 24 },
    { key: "hills", depth: 0.5, scroll: 48 },
    { key: "characters", depth: 0.72, scroll: 74 },
    { key: "foreground", depth: 1, scroll: 112 },
  ],
  beats: [
    { type: "caption", text: "햇살 좋은 아침이에요." },
    { type: "move", target: "hero", x: 80, duration: 0.8 },
    { type: "expression", target: "hero", value: "happy" },
  ],
};

