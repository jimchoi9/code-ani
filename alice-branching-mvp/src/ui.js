import { renderTemplate } from "./personalization.js";
import { getScene } from "./story-data.js";

const SLOT_OPTIONS = {
  TREAT: ["케이크", "쿠키", "젤리", "붕어빵"],
  PET: ["강아지", "고양이", "토끼", "거북이"],
  COLOR: ["파랑", "노랑", "초록", "분홍"],
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function personalize(value, slots) {
  return renderTemplate(String(value ?? ""), slots);
}

function renderParagraphs(value, slots) {
  return personalize(value, slots)
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function renderVocabularyWords(words = []) {
  if (!words.length) return "";

  return `<aside class="vocabulary" aria-label="낱말 살펴보기"><h2>낱말 살펴보기</h2><ul>${words
    .map(word => `<li><button type="button" data-action="vocab" data-word="${escapeHtml(word)}">${escapeHtml(word)}</button></li>`)
    .join("")}</ul></aside>`;
}

function renderChoice(choice, slots) {
  return `<button class="choice" type="button" data-action="choose" data-choice-id="${escapeHtml(choice.id ?? "")}" data-next-scene="${escapeHtml(choice.nextSceneId)}">${escapeHtml(personalize(choice.label, slots))}</button>`;
}

function renderChip(chip, slots) {
  const label = personalize(chip.label, slots);
  const response = personalize(chip.response, slots);
  return `<button class="chip" type="button" data-action="choose-chip" data-next-scene="${escapeHtml(chip.nextSceneId)}" data-chip-label="${escapeHtml(label)}" data-chip-response="${escapeHtml(response)}">${escapeHtml(label)}</button>`;
}

function renderSceneActions(scene, slots) {
  if (scene.type === "chip") {
    const prompt = scene.prompt
      ? `<p class="chip-prompt">${escapeHtml(personalize(scene.prompt, slots))}</p>`
      : "";
    const chips = (scene.chips ?? []).map(chip => renderChip(chip, slots)).join("");
    return `${prompt}<div class="actions" aria-label="대답 고르기">${chips}</div>`;
  }

  const choices = (scene.choices ?? []).map(choice => renderChoice(choice, slots)).join("");
  if (choices) return `<div class="actions" aria-label="다음 장면 고르기">${choices}</div>`;
  if (!scene.nextSceneId) return "";

  return `<div class="actions" aria-label="다음 장면"><button class="choice" type="button" data-action="continue" data-next-scene="${escapeHtml(scene.nextSceneId)}">계속 읽기</button></div>`;
}

function renderStorybookMasthead(hero, progress) {
  return `<div class="storybook-masthead" role="banner">
    <div class="storybook-profile" aria-label="주인공 ${escapeHtml(hero)}"><span aria-hidden="true">A</span><small>${escapeHtml(hero)}</small></div>
    <div class="storybook-title"><strong>이상한 나라의 앨리스</strong><span>인터랙티브 스토리</span></div>
    <div class="storybook-progress" aria-label="이야기 진행 ${escapeHtml(progress)}"><span aria-hidden="true">☰</span><small>${escapeHtml(progress)}</small></div>
  </div>`;
}

function renderStorybookFooter(session = null) {
  const sceneCount = session?.path?.length ?? 0;
  const vocabCount = session?.vocabTapped?.length ?? 0;
  const endingCount = session?.endingsSeen?.length ?? 0;
  return `<footer class="storybook-footer" aria-label="이야기 기록">
    <span>장면 <strong>${escapeHtml(sceneCount)}</strong></span>
    <span>낱말 <strong>${escapeHtml(vocabCount)}</strong></span>
    <span>결말 <strong>${escapeHtml(endingCount)}/3</strong></span>
  </footer>`;
}

export function renderSetup(slots) {
  const hero = personalize("{HERO}", slots);
  const groups = Object.entries(SLOT_OPTIONS).map(([slot, options]) => `
    <fieldset data-slot="${slot}">
      <legend>${escapeHtml({ TREAT: "간식", PET: "친구", COLOR: "색깔" }[slot])}</legend>
      ${options.map(option => `<label><input type="radio" name="${slot}" value="${escapeHtml(option)}" data-action="set-slot" data-slot="${slot}"${personalize(`{${slot}}`, slots) === option ? " checked" : ""}>${escapeHtml(option)}</label>`).join("")}
    </fieldset>`).join("");

  return `<main class="story-screen setup-screen scene-rabbit-hole">
    <div class="storybook-shell">
      ${renderStorybookMasthead(hero, "준비")}
      <div class="storybook-scene-frame"><div class="scene-art" aria-hidden="true"></div></div>
      <section class="storybook-content storybook-setup-content">
        <h1>나만의 이상한 나라</h1>
        <p class="storybook-intro">이야기 속에서 불릴 이름과 좋아하는 것들을 골라 보세요.</p>
        <form data-action="start">
      <label for="hero-name">이름</label>
      <input id="hero-name" type="text" name="HERO" value="${escapeHtml(hero)}" maxlength="6" autocomplete="off" inputmode="text" data-action="set-name">
      ${groups}
      <button type="submit" data-action="start">이야기 시작</button>
        </form>
      </section>
      ${renderStorybookFooter()}
    </div>
  </main>`;
}

export function renderScene(scene, session, feedback = null) {
  const slots = session.slots;
  const sceneNumber = session.path?.length ?? 0;
  const feedbackMessage = feedback === null || feedback === undefined
    ? ""
    : `<p class="choice-feedback" role="status">네가 고른 길: ${escapeHtml(personalize(feedback, slots))}</p>`;

  return `<main class="story-screen scene-${escapeHtml(scene.art)}">
    <div class="storybook-shell">
      ${renderStorybookMasthead(slots.HERO, `${sceneNumber}/5`)}
      <div class="storybook-scene-frame"><div class="scene-art" aria-hidden="true"></div></div>
      <article class="storybook-content">
      <p class="scene-kicker">${escapeHtml(sceneNumber)}번째 장면</p>
      <h1>${escapeHtml(personalize(scene.title, slots))}</h1>
      ${feedbackMessage}
      <div class="story-copy">${renderParagraphs(scene.body, slots)}</div>
      ${renderVocabularyWords(scene.vocab)}
      ${renderSceneActions(scene, slots)}
      </article>
      ${renderStorybookFooter(session)}
    </div>
  </main>`;
}

export function renderChipResponse(state) {
  const scene = getScene(state.sceneId);
  const response = state.chipResponse;
  return `<main class="story-screen chip-response-screen scene-${escapeHtml(scene.art)}">
    <div class="storybook-shell">
      ${renderStorybookMasthead(state.session?.slots?.HERO ?? "앨리스", "대답")}
      <div class="storybook-scene-frame"><div class="scene-art" aria-hidden="true"></div></div>
      <article class="storybook-content">
      <p class="scene-kicker">네가 고른 말</p>
      <h1>${escapeHtml(response.label)}</h1>
      <p class="chip-answer" role="status">${escapeHtml(response.response)}</p>
      <button class="primary-action" type="button" data-action="continue-chip">이야기 이어 보기</button>
      </article>
      ${renderStorybookFooter(state.session)}
    </div>
  </main>`;
}

export function renderRecovery() {
  return `<main class="story-screen recovery-screen">
    <div class="storybook-shell">
      ${renderStorybookMasthead("앨리스", "멈춤")}
      <section class="storybook-content storybook-recovery" role="alert" aria-labelledby="recovery-title">
        <h1 id="recovery-title">이야기를 이어 갈 수 없어요</h1>
        <p>처음 장면부터 다시 시작해 볼까요?</p>
        <button type="button" data-action="restart">다시 시작</button>
      </section>
      ${renderStorybookFooter()}
    </div>
  </main>`;
}

export function renderVocabularyPanel(word, definition) {
  if (typeof definition !== "string" || definition.length === 0) return "";

  return `<section class="vocabulary-panel" role="region" aria-labelledby="vocabulary-word">
    <h2 id="vocabulary-word">${escapeHtml(word)}</h2>
    <p>${escapeHtml(definition)}</p>
    <button type="button" data-action="close-vocabulary">닫기</button>
  </section>`;
}

export function renderEnding(scene, session) {
  const slots = session.slots;
  const selectedChip = (session.chipChoices ?? []).find(choice => choice.sceneId === scene.sourceSceneId);
  const endingCount = session.endingsSeen?.length ?? 0;
  const recall = selectedChip
    ? `<p class="choice-recall">${escapeHtml(personalize(scene.choiceRecall ?? "네가 고른 말", slots))}: ${escapeHtml(personalize(selectedChip.label, slots))}</p>`
    : "";

  return `<main class="story-screen ending-screen scene-${escapeHtml(scene.art)}">
    <div class="storybook-shell">
      ${renderStorybookMasthead(slots.HERO, "END")}
      <div class="storybook-scene-frame"><div class="scene-art" aria-hidden="true"></div></div>
      <article class="storybook-content">
      <p class="scene-kicker">이야기의 끝</p>
      <h1>${escapeHtml(personalize(scene.title, slots))}</h1>
      <div class="story-copy">${renderParagraphs(scene.body, slots)}</div>
      ${recall}
      <p class="story-trait">너의 이야기 조각: ${escapeHtml(personalize(scene.trait, slots))}</p>
      <p class="ending-progress" aria-label="결말 수집 상태">${escapeHtml(endingCount)}/3</p>
      ${renderVocabularyWords(scene.vocab)}
      <button type="button" data-action="restart">다시 시작</button>
      </article>
      ${renderStorybookFooter(session)}
    </div>
  </main>`;
}
