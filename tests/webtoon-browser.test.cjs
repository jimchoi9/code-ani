const assert = require("node:assert/strict");
const test = require("node:test");
const { openLocalPage } = require("./browser-helpers.cjs");

test("webtoon loads shared defs and clones shared backgrounds", async t => {
  const opened = await openLocalPage("webtoon.html");
  t.after(() => opened.close());
  const { page, errors } = opened;

  await page.waitForSelector("#def-room", { state: "attached", timeout: 3000 });
  assert.equal(await page.locator("#def-nabi").count(), 1);
  assert.equal(await page.locator("#def-mongi").count(), 1);
  assert.equal(await page.locator('script[src="characters.js"]').count(), 1);
  assert.ok(await page.locator('#sc1 [data-p="truck"]').count());
  assert.ok(await page.locator('#sc1 [data-p="truckdog"]').count());
  assert.ok(await page.locator('#sc1 #l1 [data-p="tail"]').count());
  assert.ok(await page.locator("#sc2 .yard path").count());
  assert.ok(await page.locator("#sc4 .dusk path").count());
  assert.deepEqual(errors.map(error => error.message), []);
});

test("webtoon decorative loops run only for the entered scene", async t => {
  const opened = await openLocalPage("webtoon.html");
  t.after(() => opened.close());
  const { page } = opened;

  const initial = await page.evaluate(() =>
    window.__prototypeDebug.sceneLoops.map(group =>
      group.items().map(tween => tween.paused())
    )
  );
  assert.equal(initial.length, 5);
  assert.ok(initial.every(group => group.length > 0 && group.every(Boolean)));

  await page.evaluate(() => window.__prototypeDebug.sceneLoops[1].enter());
  const entered = await page.evaluate(() =>
    window.__prototypeDebug.sceneLoops.map(group =>
      group.items().map(tween => tween.paused())
    )
  );
  assert.ok(entered[1].every(value => value === false));
  assert.ok(entered[0].every(Boolean));

  await page.evaluate(() => {
    window.__prototypeDebug.sceneLoops[1].leave();
    window.__prototypeDebug.sceneLoops[2].enter();
  });
  const moved = await page.evaluate(() =>
    window.__prototypeDebug.sceneLoops.map(group =>
      group.items().map(tween => tween.paused())
    )
  );
  assert.ok(moved[1].every(Boolean));
  assert.ok(moved[2].every(value => value === false));
});
