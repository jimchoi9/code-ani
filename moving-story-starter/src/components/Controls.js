export function renderControls({ index, total, motionEnabled }) {
  return `
    <nav class="story-controls" aria-label="이야기 재생 컨트롤">
      <button type="button" data-action="previous" ${index === 0 ? "disabled" : ""}>← 이전 장면</button>
      <button type="button" data-action="play">장면 재생</button>
      <button type="button" data-action="motion" aria-pressed="${motionEnabled}">
        모션 ${motionEnabled ? "켜짐" : "꺼짐"}
      </button>
      <button type="button" data-action="next" ${index === total - 1 ? "disabled" : ""}>다음 장면 →</button>
    </nav>`;
}

