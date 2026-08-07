import { createMotionRuntime } from "./animation/runtime.js";
import { createParallaxController } from "./animation/parallax.js";
import { createStoryTimeline } from "./animation/timeline.js";
import { renderCaption } from "./components/Caption.js";
import { renderControls } from "./components/Controls.js";
import { renderStoryStage } from "./components/StoryStage.js";
import { story } from "./story/story-data.js";

const app = document.querySelector("#app");
const motionRuntime = createMotionRuntime();
let sceneIndex = 0;
let motionRequested = true;
let parallaxController = null;
let sceneTimeline = null;

function destroySceneRuntime() {
  parallaxController?.destroy();
  sceneTimeline?.kill?.();
  parallaxController = null;
  sceneTimeline = null;
}

function updateMotionButton() {
  const button = app.querySelector('[data-action="motion"]');
  if (!button) return;
  const enabled = motionRuntime.isEnabled();
  button.setAttribute("aria-pressed", String(enabled));
  button.textContent = `모션 ${enabled ? "켜짐" : "꺼짐"}`;
}

function render() {
  destroySceneRuntime();
  const scene = story.scenes[sceneIndex];
  app.innerHTML = `
    <header class="story-header">
      <p>코드 기반 움직이는 동화 스타터</p>
      <h1>${story.title}</h1>
      <span>스크롤하고 장면 위에서 포인터를 움직여 보세요.</span>
    </header>
    <main id="story-scroll-track">
      <div class="story-sticky">
        <div class="story-frame">
          ${renderStoryStage(scene, { sceneNumber: sceneIndex + 1, sceneCount: story.scenes.length })}
          ${renderCaption(scene.caption)}
          ${renderControls({
            index: sceneIndex,
            total: story.scenes.length,
            motionEnabled: motionRuntime.isEnabled(),
          })}
        </div>
      </div>
    </main>
    <footer class="story-footer">
      <strong>확장 지점</strong>
      <span>src/story에 장면을 추가하고, src/assets에 캐릭터와 배경을 교체하세요.</span>
    </footer>`;

  const stage = app.querySelector("#story-stage");
  const track = app.querySelector("#story-scroll-track");
  parallaxController = createParallaxController({
    stage,
    track,
    layers: Array.from(stage.querySelectorAll("[data-parallax-layer]")),
    progressNode: app.querySelector("#story-progress"),
    motionRuntime,
  });
  sceneTimeline = createStoryTimeline({
    gsap: window.gsap,
    root: stage,
    beats: scene.beats,
  });
}

app.addEventListener("click", event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;

  if (action === "previous" && sceneIndex > 0) {
    sceneIndex -= 1;
    render();
  } else if (action === "next" && sceneIndex < story.scenes.length - 1) {
    sceneIndex += 1;
    render();
  } else if (action === "play") {
    sceneTimeline?.restart?.();
  } else if (action === "motion") {
    motionRequested = !motionRequested;
    motionRuntime.setRequested(motionRequested);
    updateMotionButton();
  }
});

motionRuntime.subscribe(updateMotionButton);
render();

window.__movingStoryDebug = {
  sceneIndex: () => sceneIndex,
  motionEnabled: () => motionRuntime.isEnabled(),
  parallaxState: () => parallaxController?.state(),
};

