const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

const projectRoot = path.resolve(__dirname, "..");

test("parallax page exposes an accessible layered stage", async t => {
  assert.ok(
    fs.existsSync(path.join(projectRoot, "parallax.html")),
    "parallax.html should exist"
  );
  const opened = await openLocalPage("parallax.html");
  t.after(() => opened.close());
  const { page, errors } = opened;

  assert.equal(await page.locator("#parallax-stage").count(), 1);
  assert.equal(
    await page.locator("#parallax-scene").getAttribute("preserveAspectRatio"),
    "xMidYMid slice"
  );
  assert.ok(await page.locator("[data-parallax-layer]").count() >= 7);
  assert.equal(
    await page.locator('#parallax-progress[role="progressbar"]').count(),
    1
  );
  assert.equal(
    await page.locator('#toggle-parallax[aria-pressed="true"]').count(),
    1
  );

  const layerMetadata = await page.locator("[data-parallax-layer]").evaluateAll(
    nodes => nodes.map(node => ({
      depth: Number(node.dataset.depth),
      scroll: Number(node.dataset.scroll),
    }))
  );
  assert.ok(layerMetadata.every(layer =>
    Number.isFinite(layer.depth) && Number.isFinite(layer.scroll)
  ));
  assert.deepEqual(errors.map(error => error.message), []);
});

test("index links the parallax playground as a supporting experiment", async t => {
  const opened = await openLocalPage("index.html");
  t.after(() => opened.close());
  const card = opened.page.locator('a[href="parallax.html"]');

  assert.equal(await card.count(), 1);
  assert.match(await card.textContent(), /패럴랙스/);
});
