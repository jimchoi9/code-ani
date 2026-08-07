const assert = require("node:assert/strict");
const test = require("node:test");

const runtime = require("../prototype-runtime.js");

function eventTarget(initial = {}) {
  const listeners = new Map();
  return {
    ...initial,
    addEventListener(type, listener) {
      const group = listeners.get(type) || new Set();
      group.add(listener);
      listeners.set(type, group);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type) {
      listeners.get(type)?.forEach(listener => listener({ matches: this.matches }));
    },
  };
}

function makeEnvironment() {
  let intervalDelay = null;
  let activeTimer = null;
  const documentRef = eventTarget({ hidden: false });
  const motionQuery = eventTarget({ matches: false });
  const nodes = [{ seed: null, setAttribute(name, value) { this[name] = value; } }];
  const options = {
    nodes,
    documentRef,
    motionQuery,
    setIntervalFn(callback, delay) {
      intervalDelay = delay;
      activeTimer = { callback };
      return activeTimer;
    },
    clearIntervalFn(timer) {
      if (activeTimer === timer) activeTimer = null;
    },
  };
  return {
    options,
    documentRef,
    motionQuery,
    nodes,
    get intervalDelay() { return intervalDelay; },
    get activeTimer() { return activeTimer; },
  };
}

function fakeTween() {
  let isPaused = false;
  return {
    pause() { isPaused = true; return this; },
    resume() { isPaused = false; return this; },
    paused() { return isPaused; },
  };
}

test("boil runs at 200ms only while visible and motion is allowed", () => {
  const env = makeEnvironment();
  const controller = runtime.createBoilController(env.options);

  controller.start();
  assert.equal(env.intervalDelay, 200);
  assert.equal(controller.isRunning(), true);

  env.documentRef.hidden = true;
  env.documentRef.dispatch("visibilitychange");
  assert.equal(controller.isRunning(), false);

  env.documentRef.hidden = false;
  env.documentRef.dispatch("visibilitychange");
  assert.equal(controller.isRunning(), true);

  env.motionQuery.matches = true;
  env.motionQuery.dispatch("change");
  assert.equal(controller.isRunning(), false);
});

test("boil advances seeds while active and removes listeners on destroy", () => {
  const env = makeEnvironment();
  const controller = runtime.createBoilController(env.options);

  controller.start();
  env.activeTimer.callback();
  assert.equal(env.nodes[0].seed, 11);

  controller.destroy();
  assert.equal(controller.isRunning(), false);
  env.documentRef.hidden = false;
  env.documentRef.dispatch("visibilitychange");
  assert.equal(controller.isRunning(), false);
});

test("loop controller resumes only inside the scene when motion is allowed", () => {
  const tween = fakeTween();
  const loops = runtime.createLoopController({ reducedMotion: false });

  loops.add(tween);
  assert.equal(tween.paused(), true);

  loops.enter();
  assert.equal(tween.paused(), false);

  loops.leave();
  assert.equal(tween.paused(), true);

  loops.enter();
  loops.syncMotion(true);
  assert.equal(tween.paused(), true);

  loops.syncMotion(false);
  assert.equal(tween.paused(), false);
});
