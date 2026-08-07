const assert = require("node:assert/strict");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

async function waitForFrame(page) {
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  ));
}

test("scroll progress moves the foreground farther than the distant sky", async t => {
  const opened = await openLocalPage("parallax.html");
  t.after(() => opened.close());
  const { page, errors } = opened;
  await page.setViewportSize({ width: 1100, height: 760 });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.62));
  await waitForFrame(page);

  const state = await page.evaluate(() => ({
    progress: window.__parallaxDebug.progress(),
    skyY: new DOMMatrix(getComputedStyle(
      document.querySelector('[data-layer-name="sky"]')
    ).transform).m42,
    grassY: new DOMMatrix(getComputedStyle(
      document.querySelector('[data-layer-name="foreground"]')
    ).transform).m42,
    ariaNow: Number(document.querySelector("#parallax-progress")
      .getAttribute("aria-valuenow")),
  }));

  assert.ok(state.progress > 0.4);
  assert.ok(Math.abs(state.grassY) > Math.abs(state.skyY));
  assert.equal(state.ariaNow, Math.round(state.progress * 100));
  assert.deepEqual(errors.map(error => error.message), []);
});

test("the sticky stage remains fully visible through the parallax track", async t => {
  const opened = await openLocalPage("parallax.html");
  t.after(() => opened.close());
  const { page } = opened;
  await page.setViewportSize({ width: 1100, height: 760 });

  await page.evaluate(() => window.scrollTo(0, document.querySelector("#parallax-track").offsetTop + 240));
  await waitForFrame(page);
  const geometry = await page.evaluate(() => {
    const bounds = document.querySelector("#parallax-stage").getBoundingClientRect();
    return { top: bounds.top, bottom: bounds.bottom, viewport: innerHeight };
  });

  assert.ok(geometry.top >= 0, `stage top should be visible, got ${geometry.top}`);
  assert.ok(
    geometry.bottom <= geometry.viewport,
    `stage bottom should be visible, got ${geometry.bottom}/${geometry.viewport}`
  );
});

test("pointer movement is scaled by each layer depth", async t => {
  const opened = await openLocalPage("parallax.html");
  t.after(() => opened.close());
  const { page } = opened;
  await page.setViewportSize({ width: 1100, height: 760 });

  const stage = await page.locator("#parallax-stage").boundingBox();
  assert.ok(stage);
  await page.mouse.move(stage.x + stage.width * 0.88, stage.y + stage.height * 0.3);
  await waitForFrame(page);

  const movement = await page.evaluate(() => ({
    pointer: window.__parallaxDebug.pointer(),
    skyX: new DOMMatrix(getComputedStyle(
      document.querySelector('[data-layer-name="sky"]')
    ).transform).m41,
    grassX: new DOMMatrix(getComputedStyle(
      document.querySelector('[data-layer-name="foreground"]')
    ).transform).m41,
  }));

  assert.ok(movement.pointer.x > 0.5);
  assert.ok(Math.abs(movement.grassX) > Math.abs(movement.skyX));
});

test("comparison toggle resets transforms and updates pressed state", async t => {
  const opened = await openLocalPage("parallax.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.locator("#toggle-parallax").click();
  assert.equal(await page.locator("#toggle-parallax").getAttribute("aria-pressed"), "false");
  assert.equal(await page.evaluate(() => window.__parallaxDebug.enabled()), false);
  const transforms = await page.locator("[data-parallax-layer]").evaluateAll(
    nodes => nodes.map(node => node.style.transform)
  );
  assert.ok(transforms.every(transform => transform === "none"));
});

test("reduced motion keeps the layered scene static", async t => {
  const opened = await openLocalPage("parallax.html", { reducedMotion: "reduce" });
  t.after(() => opened.close());
  const { page } = opened;

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await waitForFrame(page);
  assert.equal(await page.evaluate(() => window.__parallaxDebug.isReducedMotion()), true);
  assert.equal(await page.evaluate(() => window.__parallaxDebug.isFramePending()), false);
  const transforms = await page.locator("[data-parallax-layer]").evaluateAll(
    nodes => nodes.map(node => node.style.transform)
  );
  assert.ok(transforms.every(transform => transform === "none"));
});

test("hiding the document cancels the pending animation frame", async t => {
  const opened = await openLocalPage("parallax.html");
  t.after(() => opened.close());
  const { page } = opened;

  await page.evaluate(() => {
    window.dispatchEvent(new Event("scroll"));
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await page.evaluate(() => window.__parallaxDebug.isFramePending()), false);
});

test("mobile layout stays inside the viewport without horizontal overflow", async t => {
  const opened = await openLocalPage("parallax.html");
  t.after(() => opened.close());
  const { page } = opened;
  await page.setViewportSize({ width: 390, height: 844 });

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.equal(metrics.scrollWidth, metrics.clientWidth);

  for (const selector of ["#parallax-stage", "#toggle-parallax", "#parallax-progress"]) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box, selector);
    assert.ok(box.x >= 0, `${selector} left`);
    assert.ok(box.x + box.width <= 391, `${selector} right`);
  }
});
