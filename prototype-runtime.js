/* Shared motion lifecycle for the static SVG prototypes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PrototypeRuntime = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const DEFAULT_SEEDS = [2, 11, 23, 37];

  function createBoilController({
    nodes = [],
    seeds = DEFAULT_SEEDS,
    intervalMs = 200,
    documentRef = typeof document === "object" ? document : null,
    motionQuery = typeof matchMedia === "function"
      ? matchMedia("(prefers-reduced-motion: reduce)")
      : null,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
  } = {}) {
    const targets = Array.from(nodes);
    let seedIndex = 0;
    let timer = null;
    let requested = false;
    let destroyed = false;
    let listening = false;

    function tick() {
      seedIndex = (seedIndex + 1) % seeds.length;
      targets.forEach((node, index) => {
        node.setAttribute("seed", seeds[(seedIndex + index) % seeds.length]);
      });
    }

    function shouldRun() {
      return requested
        && !destroyed
        && !documentRef?.hidden
        && !motionQuery?.matches
        && targets.length > 0;
    }

    function stopTimer() {
      if (timer === null) return;
      clearIntervalFn(timer);
      timer = null;
    }

    function sync() {
      if (!shouldRun()) {
        stopTimer();
        return;
      }
      if (timer === null) timer = setIntervalFn(tick, intervalMs);
    }

    function listen() {
      if (listening) return;
      documentRef?.addEventListener?.("visibilitychange", sync);
      motionQuery?.addEventListener?.("change", sync);
      listening = true;
    }

    function start() {
      if (destroyed) return;
      requested = true;
      listen();
      sync();
    }

    function stop() {
      requested = false;
      stopTimer();
    }

    function destroy() {
      stop();
      documentRef?.removeEventListener?.("visibilitychange", sync);
      motionQuery?.removeEventListener?.("change", sync);
      listening = false;
      destroyed = true;
    }

    return {
      start,
      stop,
      sync,
      destroy,
      isRunning: () => timer !== null,
    };
  }

  function createLoopController({ reducedMotion = false } = {}) {
    const tweens = [];
    let active = false;
    let reduce = reducedMotion;

    function sync() {
      const shouldPlay = active && !reduce;
      tweens.forEach(tween => {
        if (shouldPlay) tween.resume();
        else tween.pause();
      });
    }

    function add(...items) {
      items.flat().filter(Boolean).forEach(tween => {
        tweens.push(tween);
        tween.pause();
      });
      sync();
      return items.length === 1 ? items[0] : items;
    }

    return {
      add,
      enter() {
        active = true;
        sync();
      },
      leave() {
        active = false;
        sync();
      },
      syncMotion(nextReducedMotion) {
        reduce = Boolean(nextReducedMotion);
        sync();
      },
      items: () => tweens.slice(),
    };
  }

  return { createBoilController, createLoopController };
});
