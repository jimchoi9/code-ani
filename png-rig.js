window.PngRigConfig = {
  expressions: {
    neutral: "output/character/head.png",
    happy: "output/character/face-happy.png",
    surprised: "output/character/face-surprised.png",
    angry: "output/character/face-angry.png",
    sad: "output/character/face-sad.png",
  },
  directions: {
    front: "output/character/character-front.png",
    "left-three-quarter": "output/character/character-left-three-quarter.png",
    "right-three-quarter": "output/character/character-right-three-quarter.png",
    side: "output/character/character-side.png",
  },
  mouths: {
    closed: "output/character/mouth-closed.png",
    a: "output/character/mouth-a.png",
    o: "output/character/mouth-o.png",
    u: "output/character/mouth-u.png",
    smile: "output/character/mouth-smile.png",
  },
};

(function () {
  const config = window.PngRigConfig;
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const rigStage = document.getElementById("png-rig");
  const rigCharacter = document.getElementById("rig-character");
  const poseCharacter = document.getElementById("pose-character");
  const poseBackdrop = document.getElementById("pose-backdrop");
  const expressionImage = document.getElementById("expression-image");
  const status = document.getElementById("rig-status");
  const speechBubble = document.getElementById("speech-bubble");
  const mouthMask = document.getElementById("mouth-mask");
  const mouthImage = document.getElementById("mouth-image");
  const headMotion = document.querySelector(".head .motion");
  const rightArmMotion = document.querySelector(".arm-right .motion");
  const toggleJoints = document.getElementById("toggle-joints");

  const state = {
    expression: "neutral",
    direction: "front",
    activeAction: null,
    timeline: null,
    mouthTimer: null,
    mouthFrame: "closed",
    actionCounts: new Map(),
  };

  function setPressed(selector, activeValue) {
    document.querySelectorAll(selector).forEach(button => {
      const value = button.dataset.expression || button.dataset.direction;
      button.setAttribute("aria-pressed", String(value === activeValue));
    });
  }

  function updateStatus(message) {
    status.textContent = message;
  }

  function resetMotionLayers() {
    gsap.set([rigCharacter, headMotion, rightArmMotion], {
      clearProps: "x,y,rotation,scale,opacity",
    });
    speechBubble.style.opacity = "0";
    speechBubble.style.transform = "scale(.8)";
    speechBubble.setAttribute("aria-hidden", "true");
    mouthMask.style.display = "none";
  }

  function stopCurrentAction() {
    state.timeline?.kill();
    state.timeline = null;
    clearTimeout(state.mouthTimer);
    state.mouthTimer = null;
    state.activeAction = null;
    resetMotionLayers();
  }

  function setExpression(id) {
    const source = config.expressions[id];
    if (!source) return false;
    stopCurrentAction();
    state.expression = id;
    expressionImage.src = source;
    setPressed("[data-expression]", id);
    updateStatus(`정면 · ${document.querySelector(`[data-expression="${id}"]`).textContent.trim()} 표정`);
    return true;
  }

  function setDirection(id) {
    const source = config.directions[id];
    if (!source) return false;
    stopCurrentAction();
    state.direction = id;
    poseCharacter.src = source;
    const isFront = id === "front";
    rigCharacter.style.display = isFront ? "block" : "none";
    poseCharacter.style.display = isFront ? "none" : "block";
    poseBackdrop.style.display = isFront ? "none" : "block";
    setPressed("[data-direction]", id);
    const label = document.querySelector(`[data-direction="${id}"]`).textContent.trim();
    updateStatus(`${label} 방향`);
    return true;
  }

  function ensureFront() {
    if (state.direction !== "front") setDirection("front");
  }

  function setMouthFrame(frame) {
    const source = config.mouths[frame];
    if (!source) return false;
    state.mouthFrame = frame;
    mouthImage.src = source;
    return true;
  }

  function playMouthSequence(frames, intervalMs) {
    let index = 0;
    mouthMask.style.display = "flex";
    setMouthFrame(frames[index]);

    function advance() {
      index += 1;
      if (index >= frames.length) {
        state.mouthTimer = null;
        return;
      }
      setMouthFrame(frames[index]);
      state.mouthTimer = setTimeout(advance, intervalMs);
    }

    state.mouthTimer = setTimeout(advance, intervalMs);
  }

  function playHello(timeline) {
    speechBubble.style.opacity = "1";
    speechBubble.style.transform = "scale(1)";
    speechBubble.setAttribute("aria-hidden", "false");
    playMouthSequence(["closed", "a", "o", "u", "smile", "closed"], 150);

    if (motionQuery.matches) {
      timeline.to(rigCharacter, {
        scale: 1.02,
        opacity: .86,
        duration: .16,
        yoyo: true,
        repeat: 1,
      });
      return;
    }
    timeline
      .to(rightArmMotion, {
        rotation: -68,
        duration: .22,
        transformOrigin: "18% 12%",
      }, 0)
      .to(rightArmMotion, {
        rotation: -38,
        duration: .12,
        yoyo: true,
        repeat: 5,
      })
      .to(rightArmMotion, { rotation: 0, duration: .2 })
      .to(headMotion, {
        rotation: 7,
        duration: .18,
        transformOrigin: "50% 94%",
      }, 0)
      .to(headMotion, { rotation: 0, duration: .22 });
  }

  function playAction(id) {
    if (!["hello", "nod", "wave", "jump"].includes(id)) return false;
    stopCurrentAction();
    ensureFront();
    state.activeAction = id;
    state.actionCounts.set(id, (state.actionCounts.get(id) || 0) + 1);
    const timeline = gsap.timeline({ paused: true });
    state.timeline = timeline;

    if (id === "hello") {
      playHello(timeline);
    } else if (motionQuery.matches) {
      timeline.to(rigCharacter, {
        scale: 1.02,
        opacity: .84,
        duration: .16,
        yoyo: true,
        repeat: 1,
      });
    } else if (id === "nod") {
      timeline
        .to(headMotion, { rotation: 8, duration: .18, transformOrigin: "50% 94%" })
        .to(headMotion, { rotation: -3, duration: .18 })
        .to(headMotion, { rotation: 0, duration: .16 });
    } else if (id === "wave") {
      timeline
        .to(rightArmMotion, { rotation: -68, duration: .22, transformOrigin: "18% 12%" })
        .to(rightArmMotion, { rotation: -38, duration: .12, yoyo: true, repeat: 5 })
        .to(rightArmMotion, { rotation: 0, duration: .22 });
    } else if (id === "jump") {
      timeline
        .to(rigCharacter, { y: -62, duration: .28, ease: "power2.out" })
        .to(rigCharacter, { y: 0, duration: .35, ease: "bounce.out" });
    }

    const label = document.querySelector(`[data-action="${id}"]`).textContent.trim();
    updateStatus(`${label} 동작 재생`);
    timeline.play(0);
    return true;
  }

  document.querySelectorAll("[data-expression]").forEach(button => {
    button.addEventListener("click", () => setExpression(button.dataset.expression));
  });
  document.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("click", () => setDirection(button.dataset.direction));
  });
  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => playAction(button.dataset.action));
  });
  toggleJoints.addEventListener("click", () => {
    const show = !rigStage.classList.contains("show-joints");
    rigStage.classList.toggle("show-joints", show);
    toggleJoints.setAttribute("aria-pressed", String(show));
    toggleJoints.textContent = show ? "관절점 숨기기" : "관절점 보기";
    updateStatus(show ? "머리와 양쪽 어깨 관절점 표시" : "관절점 숨김");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCurrentAction();
  });
  motionQuery.addEventListener("change", stopCurrentAction);

  window.__pngRigDebug = {
    expression: () => state.expression,
    direction: () => state.direction,
    activeAction: () => state.activeAction,
    actionCount: id => state.actionCounts.get(id) || 0,
    mouthFrame: () => state.mouthFrame,
    isReducedMotion: () => motionQuery.matches,
    hasOneTimeline: () => Boolean(state.timeline),
    hasMouthTimer: () => state.mouthTimer !== null,
    stop: stopCurrentAction,
  };
})();
