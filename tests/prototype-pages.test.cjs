const assert = require("node:assert/strict");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

for (const file of ["webtoon.html", "player.html", "swap-test.html", "kid-style.html"]) {
  test(`${file} stops boil when reduced motion is requested`, async t => {
    const opened = await openLocalPage(file, { reducedMotion: "reduce" });
    t.after(() => opened.close());
    const running = await opened.page.evaluate(
      () => window.__prototypeDebug.boil.isRunning()
    );
    assert.equal(running, false);
  });
}

test("player caption is exposed as a polite atomic live region", async t => {
  const opened = await openLocalPage("player.html");
  t.after(() => opened.close());
  const caption = opened.page.locator("#caption");
  assert.equal(await caption.getAttribute("aria-live"), "polite");
  assert.equal(await caption.getAttribute("aria-atomic"), "true");
});

test("player keeps its current decorative loops paused for reduced motion", async t => {
  const opened = await openLocalPage("player.html", { reducedMotion: "reduce" });
  t.after(() => opened.close());
  await opened.page.waitForTimeout(1300);
  const paused = await opened.page.evaluate(
    () => window.__prototypeDebug.getCurrentLoops().map(tween => tween.paused())
  );
  assert.ok(paused.length > 0);
  assert.ok(paused.every(Boolean));
});

test("prototype pages initialize without JavaScript errors", async t => {
  for (const file of [
    "webtoon.html",
    "player.html",
    "swap-test.html",
    "kid-style.html",
    "interaction.html",
    "png-rig.html",
    "parallax.html",
  ]) {
    const opened = await openLocalPage(file);
    t.after(() => opened.close());
    await opened.page.waitForTimeout(file === "player.html" ? 1800 : 100);
    assert.deepEqual(opened.errors.map(error => error.message), [], file);
  }
});
