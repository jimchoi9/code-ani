const escapeAttribute = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

function renderArtwork(key, palette) {
  if (key === "sky") {
    return `
      <defs>
        <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${escapeAttribute(palette.skyTop)}"/>
          <stop offset="1" stop-color="${escapeAttribute(palette.skyBottom)}"/>
        </linearGradient>
      </defs>
      <rect x="-80" y="-60" width="1360" height="840" fill="url(#scene-sky)"/>
      <circle cx="1010" cy="132" r="66" fill="${escapeAttribute(palette.accent)}"
              stroke="#403831" stroke-width="7"/>`;
  }
  if (key === "mountains") {
    return `<path d="M-80 520L190 245l145 150 170-215 205 240 155-170 335 310V780H-80Z"
                  fill="${escapeAttribute(palette.mountain)}" stroke="#403831" stroke-width="8"
                  stroke-linejoin="round"/>`;
  }
  if (key === "hills") {
    return `<path d="M-80 540Q170 382 390 520Q610 365 825 520Q1045 380 1280 530V780H-80Z"
                  fill="${escapeAttribute(palette.hill)}" stroke="#403831" stroke-width="8"/>`;
  }
  if (key === "characters") {
    return `
      <g class="story-motion" data-story-target="hero" transform="translate(535 620)">
        <g class="rig-scale" transform="scale(.86)">
          <path data-p="tail" d="M58-62q70-42 78-100" fill="none"
                stroke="#403831" stroke-width="24" stroke-linecap="round"/>
          <path data-p="tail" d="M58-62q70-42 78-100" fill="none"
                stroke="#f0a35b" stroke-width="15" stroke-linecap="round"/>
          <ellipse cx="0" cy="-58" rx="75" ry="58" fill="#f0a35b"
                   stroke="#403831" stroke-width="7"/>
          <g data-p="head">
            <path d="M-42-202L-66-252l54 29zM42-202l58-35-31 56z"
                  fill="#f0a35b" stroke="#403831" stroke-width="7" stroke-linejoin="round"/>
            <circle cx="0" cy="-172" r="62" fill="#f7bd78" stroke="#403831" stroke-width="7"/>
            <g data-face="neutral">
              <circle cx="-22" cy="-181" r="6" fill="#403831"/>
              <circle cx="22" cy="-181" r="6" fill="#403831"/>
              <path d="M-8-158q8 6 16 0" fill="none" stroke="#403831" stroke-width="5" stroke-linecap="round"/>
            </g>
            <g data-face="happy" hidden>
              <path d="M-32-184q10 12 20 0M12-184q10 12 20 0M-14-156q14 16 28 0"
                    fill="none" stroke="#403831" stroke-width="5" stroke-linecap="round"/>
            </g>
            <g data-face="surprised" hidden>
              <circle cx="-22" cy="-182" r="10" fill="#fffdf5" stroke="#403831" stroke-width="4"/>
              <circle cx="22" cy="-182" r="10" fill="#fffdf5" stroke="#403831" stroke-width="4"/>
              <circle cx="0" cy="-151" r="10" fill="#403831"/>
            </g>
          </g>
        </g>
      </g>
      <g transform="translate(730 626) scale(.64)">
        <ellipse cx="0" cy="-55" rx="70" ry="54" fill="#e8caa0" stroke="#403831" stroke-width="7"/>
        <circle cx="0" cy="-166" r="56" fill="#f1d8b6" stroke="#403831" stroke-width="7"/>
        <circle cx="-18" cy="-176" r="6" fill="#403831"/><circle cx="18" cy="-176" r="6" fill="#403831"/>
        <path d="M-12-151q12 12 24 0" fill="none" stroke="#403831" stroke-width="5" stroke-linecap="round"/>
      </g>`;
  }
  return `<path d="M-80 665Q180 600 420 676Q660 605 900 674Q1090 610 1280 660V790H-80Z"
                fill="${escapeAttribute(palette.foreground)}" stroke="#403831" stroke-width="8"/>`;
}

export function renderStoryStage(scene, { sceneNumber, sceneCount }) {
  const layers = scene.layers.map(layer => `
    <g data-parallax-layer data-layer-name="${escapeAttribute(layer.key)}"
       data-depth="${layer.depth}" data-scroll="${layer.scroll}">
      ${renderArtwork(layer.key, scene.palette)}
    </g>`).join("");

  return `
    <section id="story-stage" aria-label="${escapeAttribute(scene.title)} 움직이는 동화 장면"
             data-scene-id="${escapeAttribute(scene.id)}">
      <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" role="img"
           aria-label="${escapeAttribute(scene.title)} 풍경">
        ${layers}
      </svg>
      <div class="scene-label">
        <span>${sceneNumber}/${sceneCount}</span>
        <strong>${escapeAttribute(scene.title)}</strong>
      </div>
      <div class="progress-shell" aria-hidden="true">
        <div id="story-progress" role="progressbar" aria-label="장면 스크롤 진행도"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
      </div>
    </section>`;
}

