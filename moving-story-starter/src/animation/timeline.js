import { findPart, setExpression } from "./rig.js";

function unavailableTimeline() {
  return {
    available: false,
    play() {},
    restart() {},
    kill() {},
  };
}

export function createStoryTimeline({ gsap, root, beats }) {
  if (!gsap?.timeline || !root) return unavailableTimeline();

  const timeline = gsap.timeline({ paused: true, defaults: { ease: "power1.inOut" } });
  beats.forEach((beat, index) => {
    timeline.addLabel(`beat-${index}`);
    const target = root.querySelector(`[data-story-target="${beat.target}"]`);

    if (beat.type === "move" && target) {
      timeline.to(target, {
        x: beat.x ?? 0,
        y: beat.y ?? 0,
        duration: beat.duration ?? 0.6,
      });
    } else if (beat.type === "expression" && target) {
      timeline.call(() => setExpression(target, beat.value));
    } else if (beat.type === "part" && target) {
      const part = findPart(target, beat.part);
      if (part) timeline.to(part, beat.vars ?? {});
    }
  });

  timeline.available = true;
  return timeline;
}

