import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL, fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadStory() {
  const url = pathToFileURL(path.join(projectRoot, "src/story/story-data.js")).href;
  try {
    return (await import(url)).story;
  } catch (error) {
    assert.fail(`story data should import successfully: ${error.message}`);
  }
}

test("story data provides three independently addressable scenes", async () => {
  const story = await loadStory();
  assert.equal(story.scenes.length, 3);
  assert.equal(new Set(story.scenes.map(scene => scene.id)).size, 3);

  for (const scene of story.scenes) {
    assert.ok(scene.title.length > 0, scene.id);
    assert.ok(scene.caption.length > 0, scene.id);
    assert.ok(scene.layers.length >= 4, `${scene.id} layers`);
    assert.ok(scene.beats.length >= 1, `${scene.id} beats`);
    assert.ok(scene.layers.every(layer =>
      typeof layer.depth === "number" && typeof layer.scroll === "number"
    ));
  }
});

test("each sample scene spans background to foreground depth", async () => {
  const story = await loadStory();

  for (const scene of story.scenes) {
    const depths = scene.layers.map(layer => layer.depth);
    assert.ok(Math.min(...depths) <= 0.1, `${scene.id} distant layer`);
    assert.ok(Math.max(...depths) >= 0.9, `${scene.id} foreground layer`);
  }
});

