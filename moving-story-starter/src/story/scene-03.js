export const scene03 = {
  id: "sunset-home",
  title: "노을과 집으로",
  caption: "하늘이 주황빛으로 물들자 친구는 천천히 집으로 돌아갔어요.",
  palette: {
    skyTop: "#9d7ec4",
    skyBottom: "#ffd08a",
    mountain: "#826f83",
    hill: "#6e9a58",
    foreground: "#3f7040",
    accent: "#f29a62",
  },
  layers: [
    { key: "sky", depth: 0.05, scroll: -12 },
    { key: "mountains", depth: 0.24, scroll: 28 },
    { key: "hills", depth: 0.52, scroll: 50 },
    { key: "characters", depth: 0.75, scroll: 80 },
    { key: "foreground", depth: 1, scroll: 120 },
  ],
  beats: [
    { type: "caption", text: "오늘도 즐거운 하루였어요." },
    { type: "move", target: "hero", x: 96, duration: 0.9 },
    { type: "expression", target: "hero", value: "happy" },
  ],
};

