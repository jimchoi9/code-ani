(function () {
  "use strict";

  const stage = document.querySelector("#parallax-stage");
  const track = document.querySelector("#parallax-track");
  const progressNode = document.querySelector("#parallax-progress");
  const toggle = document.querySelector("#toggle-parallax");
  const layers = Array.from(document.querySelectorAll("[data-parallax-layer]"));
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let enabled = !motionQuery.matches;
  let progress = 0;
  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let frameId = null;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function readProgress() {
    const distance = Math.max(1, track.offsetHeight - window.innerHeight);
    progress = clamp((window.scrollY - track.offsetTop) / distance, 0, 1);
    progressNode.style.setProperty("--progress", progress);
    progressNode.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
  }

  function resetLayers() {
    layers.forEach(layer => {
      layer.style.transform = "none";
    });
  }

  function render() {
    frameId = null;
    if (!enabled || motionQuery.matches || document.hidden) {
      resetLayers();
      return;
    }

    currentX += (pointerX - currentX) * 0.32;
    currentY += (pointerY - currentY) * 0.32;

    layers.forEach(layer => {
      const depth = Number(layer.dataset.depth);
      const scrollDistance = Number(layer.dataset.scroll);
      const x = currentX * depth * 34;
      const y = (progress - 0.5) * scrollDistance + currentY * depth * 18;
      const scale = 1 + depth * 0.012;
      layer.style.transform =
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    });

    if (Math.abs(pointerX - currentX) > 0.005 ||
        Math.abs(pointerY - currentY) > 0.005) {
      scheduleFrame();
    }
  }

  function scheduleFrame() {
    if (frameId !== null || !enabled || motionQuery.matches || document.hidden) return;
    frameId = window.requestAnimationFrame(render);
  }

  function stopFrame() {
    if (frameId === null) return;
    window.cancelAnimationFrame(frameId);
    frameId = null;
  }

  function handleScroll() {
    readProgress();
    scheduleFrame();
  }

  function handlePointerMove(event) {
    if (!enabled || motionQuery.matches) return;
    const bounds = stage.getBoundingClientRect();
    pointerX = clamp(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1);
    pointerY = clamp(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1, 1);
    scheduleFrame();
  }

  function centerPointer() {
    pointerX = 0;
    pointerY = 0;
    scheduleFrame();
  }

  function setEnabled(nextEnabled) {
    enabled = nextEnabled && !motionQuery.matches;
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.textContent = enabled ? "패럴랙스 켜짐" : "패럴랙스 꺼짐";

    if (enabled) {
      readProgress();
      scheduleFrame();
    } else {
      stopFrame();
      currentX = 0;
      currentY = 0;
      resetLayers();
    }
  }

  function handleMotionPreference() {
    setEnabled(!motionQuery.matches);
    toggle.disabled = motionQuery.matches;
    if (motionQuery.matches) {
      toggle.textContent = "모션 감소 적용";
    }
  }

  function handleVisibility() {
    if (document.hidden) {
      stopFrame();
      return;
    }
    readProgress();
    scheduleFrame();
  }

  toggle.addEventListener("click", () => setEnabled(!enabled));
  stage.addEventListener("pointermove", handlePointerMove);
  stage.addEventListener("pointerleave", centerPointer);
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll);
  document.addEventListener("visibilitychange", handleVisibility);
  motionQuery.addEventListener("change", handleMotionPreference);

  readProgress();
  if (motionQuery.matches) {
    handleMotionPreference();
  } else {
    scheduleFrame();
  }

  window.__parallaxDebug = {
    progress: () => progress,
    pointer: () => ({ x: pointerX, y: pointerY }),
    enabled: () => enabled,
    isReducedMotion: () => motionQuery.matches,
    isFramePending: () => frameId !== null,
  };
})();

