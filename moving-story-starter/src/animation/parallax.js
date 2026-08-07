const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function calculateLayerTransform({
  depth,
  scroll,
  progress,
  pointerX,
  pointerY,
}) {
  return {
    x: pointerX * depth * 34,
    y: (progress - 0.5) * scroll + pointerY * depth * 18,
    scale: 1 + depth * 0.012,
  };
}

export function createParallaxController({
  stage,
  track,
  layers,
  progressNode = null,
  motionRuntime,
}) {
  let progress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let frameId = null;
  let enabled = motionRuntime.isEnabled();

  function readProgress() {
    const distance = Math.max(1, track.offsetHeight - innerHeight);
    progress = clamp((scrollY - track.offsetTop) / distance, 0, 1);
    if (progressNode) {
      progressNode.style.setProperty("--progress", progress);
      progressNode.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    }
  }

  function reset() {
    layers.forEach(layer => { layer.style.transform = "none"; });
  }

  function render() {
    frameId = null;
    if (!enabled) {
      reset();
      return;
    }

    currentX += (pointerX - currentX) * 0.3;
    currentY += (pointerY - currentY) * 0.3;

    layers.forEach(layer => {
      const value = calculateLayerTransform({
        depth: Number(layer.dataset.depth),
        scroll: Number(layer.dataset.scroll),
        progress,
        pointerX: currentX,
        pointerY: currentY,
      });
      layer.style.transform = `translate3d(${value.x.toFixed(2)}px, ${value.y.toFixed(2)}px, 0) scale(${value.scale.toFixed(4)})`;
    });

    if (Math.abs(pointerX - currentX) > 0.005 || Math.abs(pointerY - currentY) > 0.005) {
      schedule();
    }
  }

  function schedule() {
    if (!enabled || frameId !== null) return;
    frameId = requestAnimationFrame(render);
  }

  function stop() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    reset();
  }

  function handleScroll() {
    readProgress();
    schedule();
  }

  function handlePointer(event) {
    const bounds = stage.getBoundingClientRect();
    pointerX = clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
    pointerY = clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1);
    schedule();
  }

  function centerPointer() {
    pointerX = 0;
    pointerY = 0;
    schedule();
  }

  const unsubscribe = motionRuntime.subscribe(nextEnabled => {
    enabled = nextEnabled;
    if (enabled) {
      readProgress();
      schedule();
    } else {
      stop();
    }
  });

  addEventListener("scroll", handleScroll, { passive: true });
  addEventListener("resize", handleScroll);
  stage.addEventListener("pointermove", handlePointer);
  stage.addEventListener("pointerleave", centerPointer);
  readProgress();
  schedule();

  return {
    stop,
    refresh: handleScroll,
    state: () => ({ progress, pointerX, pointerY, enabled, framePending: frameId !== null }),
    destroy() {
      stop();
      unsubscribe();
      removeEventListener("scroll", handleScroll);
      removeEventListener("resize", handleScroll);
      stage.removeEventListener("pointermove", handlePointer);
      stage.removeEventListener("pointerleave", centerPointer);
    },
  };
}

