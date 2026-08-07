const assert = require("node:assert/strict");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

test("expression controls swap the head and pressed state", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page, errors } = opened;

  await page.locator('[data-expression="happy"]').click();
  assert.match(
    await page.locator("#expression-image").getAttribute("src"),
    /face-happy\.png$/
  );
  assert.equal(
    await page.locator('[data-expression="happy"]').getAttribute("aria-pressed"),
    "true"
  );
  assert.equal(
    await page.locator('[data-expression="neutral"]').getAttribute("aria-pressed"),
    "false"
  );
  assert.equal(
    await page.evaluate(() => window.__pngRigDebug.expression()),
    "happy"
  );
  assert.deepEqual(errors.map(error => error.message), []);
});

test("direction controls switch between the layered rig and complete poses", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator('[data-direction="side"]').click();
  assert.equal(await page.locator("#rig-character").evaluate(node => getComputedStyle(node).display), "none");
  assert.notEqual(await page.locator("#pose-character").evaluate(node => getComputedStyle(node).display), "none");
  assert.notEqual(await page.locator("#pose-backdrop").evaluate(node => getComputedStyle(node).display), "none");
  assert.match(await page.locator("#pose-character").getAttribute("src"), /character-side\.png$/);

  await page.locator('[data-direction="front"]').click();
  assert.notEqual(await page.locator("#rig-character").evaluate(node => getComputedStyle(node).display), "none");
  assert.equal(await page.locator("#pose-character").evaluate(node => getComputedStyle(node).display), "none");
  assert.equal(await page.locator("#pose-backdrop").evaluate(node => getComputedStyle(node).display), "none");
});

test("joint toggle exposes calibrated pivot markers", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator("#toggle-joints").click();
  assert.equal(await page.locator("#toggle-joints").getAttribute("aria-pressed"), "true");
  assert.ok(await page.locator("#png-rig").evaluate(node => node.classList.contains("show-joints")));
});

test("replaying an action keeps one active timeline and restarts from base state", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator('[data-action="wave"]').click();
  await page.locator('[data-action="wave"]').click();

  assert.equal(
    await page.evaluate(() => window.__pngRigDebug.actionCount("wave")),
    2
  );
  assert.equal(
    await page.evaluate(() => window.__pngRigDebug.activeAction()),
    "wave"
  );
  assert.equal(
    await page.evaluate(() => window.__pngRigDebug.hasOneTimeline()),
    true
  );
});

test("hello combines its speech bubble with an advancing mouth sequence", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator('[data-action="hello"]').click();
  assert.equal(await page.locator("#speech-bubble").textContent(), "안녕하세요!");
  assert.equal(await page.locator("#mouth-mask").evaluate(node => getComputedStyle(node).display), "flex");
  assert.equal(await page.locator("#speech-bubble").getAttribute("aria-hidden"), "false");

  await page.waitForTimeout(180);
  assert.equal(
    await page.evaluate(() => window.__pngRigDebug.mouthFrame()),
    "a"
  );
  assert.match(await page.locator("#mouth-image").getAttribute("src"), /mouth-a\.png$/);
});

test("replaying hello replaces its timeline and mouth timer", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator('[data-action="hello"]').click();
  await page.locator('[data-action="hello"]').click();
  assert.equal(
    await page.evaluate(() => window.__pngRigDebug.actionCount("hello")),
    2
  );
  assert.equal(
    await page.evaluate(() => window.__pngRigDebug.hasMouthTimer()),
    true
  );
});

test("reduced motion preserves hello copy and lip sync", async t => {
  const opened = await openLocalPage("png-rig.html", { reducedMotion: "reduce" });
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator('[data-action="hello"]').click();
  await page.waitForTimeout(180);
  assert.equal(await page.locator("#speech-bubble").textContent(), "안녕하세요!");
  assert.equal(await page.evaluate(() => window.__pngRigDebug.isReducedMotion()), true);
  assert.equal(await page.evaluate(() => window.__pngRigDebug.mouthFrame()), "a");
});

test("hiding the document stops action and lip sync", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.evaluate(() => {
    document.querySelector('[data-action="hello"]').click();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await page.evaluate(() => window.__pngRigDebug.activeAction()), null);
  assert.equal(await page.evaluate(() => window.__pngRigDebug.hasMouthTimer()), false);
});

test("mobile layout keeps the stage and controls inside the viewport", async t => {
  const opened = await openLocalPage("png-rig.html");
  t.after(() => opened.close());
  const { page } = opened;
  await page.setViewportSize({ width: 390, height: 844 });

  for (const selector of ["#png-rig", ".control-panel", '[data-action="hello"]', "#toggle-joints"]) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box, selector);
    assert.ok(box.x >= 0, `${selector} left`);
    assert.ok(box.x + box.width <= 391, `${selector} right`);
  }
});
