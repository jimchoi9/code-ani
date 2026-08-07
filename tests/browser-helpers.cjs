const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const projectRoot = path.resolve(__dirname, "..");

async function openLocalPage(file, { reducedMotion = "no-preference" } = {}) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const context = await browser.newContext({ reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error));
  await page.route("**/new_char.svg", route => route.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    body: fs.readFileSync(path.join(projectRoot, "new_char.svg")),
  }));
  await page.route("https://**/*", route => route.abort());
  await page.addInitScript(() => {
    function tween() {
      let paused = false;
      let killed = false;
      return {
        pause() { paused = true; return this; },
        play() { paused = false; killed = false; return this; },
        restart() { paused = false; killed = false; return this; },
        resume() { paused = false; return this; },
        paused() { return paused; },
        kill() { paused = true; killed = true; return this; },
        isActive() { return !paused && !killed; },
        progress() { return 0; },
        timeScale() { return this; },
      };
    }
    function timeline(options = {}) {
      const value = tween();
      value.labels = {};
      value.to = () => value;
      value.fromTo = () => value;
      value.set = () => value;
      value.add = () => value;
      value.call = callback => {
        value.__completion = callback;
        return value;
      };
      value.addLabel = label => {
        value.labels[label] = Object.keys(value.labels).length;
        return value;
      };
      value.time = () => 0;
      value.duration = () => 1;
      value.seek = () => value;
      value.eventCallback = (name, callback) => {
        if (name === "onComplete") value.__completion = callback;
        return value;
      };
      if (options.paused) value.pause();
      if (options.scrollTrigger) {
        value.scrollTrigger = { vars: options.scrollTrigger };
        window.__scrollTriggerConfigs = window.__scrollTriggerConfigs || [];
        window.__scrollTriggerConfigs.push(options.scrollTrigger);
      }
      return value;
    }
    window.ScrollTrigger = { refresh() {} };
    window.gsap = {
      registerPlugin() {},
      set() {},
      to() { return tween(); },
      timeline,
      ticker: { add() {} },
    };
  });
  const target = path.resolve(projectRoot, file);
  if (!target.startsWith(projectRoot + path.sep) || !fs.existsSync(target)) {
    throw new Error(`Missing local page: ${file}`);
  }
  await page.goto(pathToFileURL(target).href, { waitUntil: "domcontentloaded", timeout: 10000 });
  return {
    page,
    errors,
    async close() {
      await browser.close();
    },
  };
}

module.exports = { openLocalPage };
