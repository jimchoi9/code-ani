import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL, fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadModule(relativePath) {
  const url = pathToFileURL(path.join(projectRoot, relativePath)).href;
  try {
    return await import(url);
  } catch (error) {
    assert.fail(`${relativePath} should import successfully: ${error.message}`);
  }
}

test("parallax transform combines story progress, pointer, and layer depth", async () => {
  const { calculateLayerTransform } = await loadModule("src/animation/parallax.js");
  const transform = calculateLayerTransform({
    depth: 0.5,
    scroll: 100,
    progress: 0.75,
    pointerX: 1,
    pointerY: -0.5,
  });

  assert.deepEqual(transform, { x: 17, y: 20.5, scale: 1.006 });
});

test("motion runtime disables animation for reduced motion or hidden documents", async () => {
  const { deriveMotionEnabled } = await loadModule("src/animation/runtime.js");

  assert.equal(deriveMotionEnabled({ requested: true, reduced: false, hidden: false }), true);
  assert.equal(deriveMotionEnabled({ requested: true, reduced: true, hidden: false }), false);
  assert.equal(deriveMotionEnabled({ requested: true, reduced: false, hidden: true }), false);
});

test("rig expression switch shows only the requested face", async () => {
  const { setExpression } = await loadModule("src/animation/rig.js");
  const faces = ["neutral", "happy", "surprised"].map(expression => ({
    dataset: { face: expression },
    hidden: false,
  }));
  const root = { querySelectorAll: () => faces };

  assert.equal(setExpression(root, "happy"), true);
  assert.deepEqual(faces.map(face => face.hidden), [true, false, true]);
  assert.equal(setExpression(root, "missing"), false);
});

