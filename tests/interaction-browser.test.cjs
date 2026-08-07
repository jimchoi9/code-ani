const assert = require("node:assert/strict");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

test("clicking a target shows its message and replaces the previous response", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page, errors } = opened;

  await page.locator('[data-interaction="nabi"]').click();
  assert.equal(await page.locator("#speech-text").textContent(), "나랑 놀자!");
  assert.equal(await page.locator("#interaction-status").textContent(), "나비: 나랑 놀자!");

  await page.locator('[data-interaction="ball"]').click();
  assert.equal(await page.locator("#speech-text").textContent(), "통통!");
  assert.equal(
    await page.evaluate(() => window.__interactionDebug.activeId()),
    "ball"
  );
  assert.deepEqual(errors.map(error => error.message), []);
});

test("reselecting a target restarts one reaction instead of accumulating timelines", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.evaluate(() => {
    window.__interactionDebug.activate("mongi");
    window.__interactionDebug.activate("mongi");
  });

  assert.equal(
    await page.evaluate(() => window.__interactionDebug.activationCount("mongi")),
    2
  );
  assert.equal(
    await page.evaluate(() => window.__interactionDebug.isTimelineActive()),
    true
  );
});

test("Enter and Space activate the focused SVG target", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator('[data-interaction="flower"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#speech-text").textContent(), "간질간질~");

  await page.locator('[data-interaction="cloud"]').focus();
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#speech-text").textContent(), "둥실둥실");
});

test("reduced motion keeps messages while using the reduced branch", async t => {
  const opened = await openLocalPage("interaction.html", { reducedMotion: "reduce" });
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator('[data-interaction="nabi"]').click();
  assert.equal(await page.locator("#speech-text").textContent(), "나랑 놀자!");
  assert.equal(
    await page.evaluate(() => window.__interactionDebug.isReducedMotion()),
    true
  );
});

test("visibility change kills the active reaction instead of resuming it", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.evaluate(() => {
    window.__interactionDebug.activate("ball");
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  assert.equal(
    await page.evaluate(() => window.__interactionDebug.isTimelineActive()),
    false
  );
});

test("all five targets stay inside the stage at a mobile viewport", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;
  await page.setViewportSize({ width: 390, height: 844 });

  const stageBox = await page.locator("#playground").boundingBox();
  assert.ok(stageBox);
  for (const id of ["nabi", "mongi", "ball", "flower", "cloud"]) {
    const box = await page.locator(`[data-interaction="${id}"]`).boundingBox();
    assert.ok(box, id);
    assert.ok(box.x >= stageBox.x, `${id} left edge`);
    assert.ok(box.y >= stageBox.y, `${id} top edge`);
    assert.ok(box.x + box.width <= stageBox.x + stageBox.width + 1, `${id} right edge`);
    assert.ok(box.y + box.height <= stageBox.y + stageBox.height + 1, `${id} bottom edge`);
  }
});
