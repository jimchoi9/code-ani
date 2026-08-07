const assert = require("node:assert/strict");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

const targetIds = ["nabi", "mongi", "ball", "flower", "cloud"];

test("interaction playground exposes five accessible SVG targets", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;

  assert.equal(
    await page.locator('script[src="characters.js"]').count(),
    1
  );
  assert.equal(
    await page.locator('#interaction-status[aria-live="polite"][aria-atomic="true"]').count(),
    1
  );

  for (const id of targetIds) {
    const target = page.locator(`[data-interaction="${id}"]`);
    assert.equal(await target.count(), 1, id);
    assert.equal(await target.getAttribute("role"), "button", id);
    assert.equal(await target.getAttribute("tabindex"), "0", id);
    assert.ok(await target.getAttribute("aria-label"), id);
  }
});

test("index links the interaction playground as a supporting experiment", async t => {
  const opened = await openLocalPage("index.html");
  t.after(() => opened.close());
  const { page } = opened;
  const card = page.locator('a[href="interaction.html"]');

  assert.equal(await card.count(), 1);
  assert.match(await card.textContent(), /인터랙션 놀이터/);
  assert.equal(
    await card.evaluate(node => node.closest(".cards")?.previousElementSibling?.textContent.trim()),
    "보조 기술 실험"
  );
});

test("positioned assets keep layout transforms outside their animation layer", async t => {
  const opened = await openLocalPage("interaction.html");
  t.after(() => opened.close());
  const { page } = opened;

  for (const id of ["nabi", "mongi", "ball"]) {
    const structure = await page.locator(`[data-interaction="${id}"]`).evaluate(target => {
      const art = target.querySelector(".reaction-art");
      return {
        animationTransform: art?.getAttribute("transform"),
        placementClass: art?.parentElement?.getAttribute("class"),
        placementTransform: art?.parentElement?.getAttribute("transform"),
      };
    });
    assert.equal(structure.animationTransform, null, id);
    assert.equal(structure.placementClass, "placement", id);
    assert.ok(structure.placementTransform?.startsWith("translate("), id);
  }
});
