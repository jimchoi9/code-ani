import assert from "node:assert/strict";
import test from "node:test";
import { scene01 } from "../src/story/scene-01.js";

async function loadComponent(file) {
  try {
    return await import(`../src/components/${file}.js`);
  } catch (error) {
    assert.fail(`${file} should import successfully: ${error.message}`);
  }
}

test("story stage renders every configured layer with its depth metadata", async () => {
  const { renderStoryStage } = await loadComponent("StoryStage");
  const markup = renderStoryStage(scene01, { sceneNumber: 1, sceneCount: 3 });

  assert.match(markup, /id="story-stage"/);
  assert.match(markup, /preserveAspectRatio="xMidYMid slice"/);
  assert.equal((markup.match(/data-parallax-layer/g) ?? []).length, scene01.layers.length);
  assert.match(markup, /data-story-target="hero"/);
});

test("caption and controls expose live text and labeled buttons", async () => {
  const { renderCaption } = await loadComponent("Caption");
  const { renderControls } = await loadComponent("Controls");

  const caption = renderCaption(scene01.caption);
  const controls = renderControls({ index: 0, total: 3, motionEnabled: true });

  assert.match(caption, /aria-live="polite"/);
  assert.match(caption, new RegExp(scene01.caption));
  assert.equal((controls.match(/<button/g) ?? []).length, 4);
  assert.match(controls, /data-action="play"/);
  assert.match(controls, /data-action="motion"[^>]+aria-pressed="true"/);
});

