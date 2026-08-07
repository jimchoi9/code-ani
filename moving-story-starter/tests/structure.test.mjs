import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("starter exposes every documented extension point", () => {
  const required = [
    "index.html",
    "styles.css",
    "package.json",
    "README.md",
    "src/assets/characters/README.md",
    "src/assets/backgrounds/README.md",
    "src/assets/props/README.md",
    "src/animation/runtime.js",
    "src/animation/parallax.js",
    "src/animation/rig.js",
    "src/animation/timeline.js",
    "src/story/story-data.js",
    "src/story/scene-01.js",
    "src/story/scene-02.js",
    "src/story/scene-03.js",
    "src/components/StoryStage.js",
    "src/components/Caption.js",
    "src/components/Controls.js",
    "src/app.js",
  ];

  const missing = required.filter(file => !fs.existsSync(path.join(projectRoot, file)));
  assert.deepEqual(missing, [], `missing starter files: ${missing.join(", ")}`);
});

