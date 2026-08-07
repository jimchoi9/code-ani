const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

const projectRoot = path.resolve(__dirname, "..");

test("PNG rig page exposes its stage and accessible control groups", async t => {
  assert.ok(
    fs.existsSync(path.join(projectRoot, "png-rig.html")),
    "png-rig.html should exist"
  );
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page, errors } = opened;

  assert.equal(await page.locator("#png-rig").count(), 1);
  assert.equal(await page.locator("#rig-character").count(), 1);
  assert.equal(await page.locator("#pose-character").count(), 1);
  assert.equal(await page.locator('#rig-status[aria-live="polite"]').count(), 1);
  assert.equal(await page.locator("[data-action]").count(), 4);
  assert.equal(await page.locator("[data-expression]").count(), 5);
  assert.equal(await page.locator("[data-direction]").count(), 4);
  assert.equal(await page.locator("#toggle-joints").count(), 1);
  assert.deepEqual(errors.map(error => error.message), []);
});

test("PNG rig loads the named part assets", async t => {
  assert.ok(fs.existsSync(path.join(projectRoot, "png-rig.html")));
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;

  const loaded = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#png-rig img")).map(image => ({
      src: image.getAttribute("src"),
      loaded: image.complete && image.naturalWidth > 0,
    }))
  );
  const sources = loaded.map(item => item.src);
  for (const required of [
    "output/character/torso.png",
    "output/character/head.png",
    "output/character/left-arm.png",
    "output/character/right-arm.png",
    "output/character/leg.png",
    "output/character/foot.png",
  ]) {
    assert.ok(sources.includes(required), required);
  }
  assert.ok(loaded.every(item => item.loaded));
});

test("index links the PNG rig as a supporting experiment", async t => {
  const opened = await openLocalPage("index.html");
  t.after(() => opened.close());
  const card = opened.page.locator('a[href="png-rig.html"]');

  assert.equal(await card.count(), 1);
  assert.match(await card.textContent(), /PNG 파츠 리깅/);
});

test("the rig restores white sock and shoe regions removed with the source background", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;
  const restorations = page.locator(".feet .white-restoration");

  assert.equal(await restorations.count(), 4);
  const colors = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".feet .white-restoration"))
      .map(node => getComputedStyle(node).backgroundColor)
  );
  assert.ok(colors.every(color => color === "rgb(255, 255, 255)"));
});
