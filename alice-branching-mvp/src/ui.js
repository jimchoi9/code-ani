import { renderTemplate } from "./personalization.js";

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
  return `<button class="choice" type="button" data-action="choose" data-next-scene="${escapeHtml(choice.nextSceneId)}">${escapeHtml(personalize(choice.label, slots))}</button>`;
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

  return `<div class="actions" aria-label="다음 장면"><button class="choice" type="button" data-action="choose" data-next-scene="${escapeHtml(scene.nextSceneId)}">계속 읽기</button></div>`;
}

export function renderSetup(slots) {
  const hero = personalize("{HERO}", slots);
  const groups = Object.entries(SLOT_OPTIONS).map(([slot, options]) => `
    <fieldset data-slot="${slot}">
      <legend>${escapeHtml({ TREAT: "간식", PET: "친구", COLOR: "색깔" }[slot])}</legend>
      ${options.map(option => `<label><input type="radio" name="${slot}" value="${escapeHtml(option)}" data-action="set-slot" data-slot="${slot}"${personalize(`{${slot}}`, slots) === option ? " checked" : ""}>${escapeHtml(option)}</label>`).join("")}
    </fieldset>`).join("");

  return `<main class="story-screen setup-screen">
    <header><h1>앨리스와 세 갈래 이상한 나라</h1></header>
    <form data-action="start">
      <label for="hero-name">이름</label>
      <input id="hero-name" type="text" name="HERO" value="${escapeHtml(hero)}" maxlength="6" autocomplete="off" inputmode="text" data-action="set-name" required>
      ${groups}
      <button type="submit" data-action="start">이야기 시작</button>
    </form>
  </main>`;
}

export function renderScene(scene, session, feedback = null) {
  const slots = session.slots;
  const sceneNumber = (session.path?.length ?? 0) + 1;
  const feedbackMessage = feedback === null || feedback === undefined
    ? ""
    : `<p class="choice-feedback" role="status">네가 고른 길: ${escapeHtml(personalize(feedback, slots))}</p>`;

  return `<main class="story-screen scene-${escapeHtml(scene.art)}">
    <div class="scene-art" aria-hidden="true"></div>
    <article>
      <p class="scene-kicker">${escapeHtml(sceneNumber)}번째 장면</p>
      <h1>${escapeHtml(personalize(scene.title, slots))}</h1>
      ${feedbackMessage}
      <div class="story-copy">${renderParagraphs(scene.body, slots)}</div>
      ${renderVocabularyWords(scene.vocab)}
      ${renderSceneActions(scene, slots)}
    </article>
  </main>`;
}

export function renderRecovery() {
  return `<main class="story-screen recovery-screen">
    <section role="alert" aria-labelledby="recovery-title">
      <h1 id="recovery-title">이야기를 이어 갈 수 없어요</h1>
      <p>처음 장면부터 다시 시작해 볼까요?</p>
      <button type="button" data-action="restart">다시 시작</button>
    </section>
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
    <div class="scene-art" aria-hidden="true"></div>
    <article>
      <p class="scene-kicker">이야기의 끝</p>
      <h1>${escapeHtml(personalize(scene.title, slots))}</h1>
      <div class="story-copy">${renderParagraphs(scene.body, slots)}</div>
      ${recall}
      <p class="story-trait">너의 이야기 조각: ${escapeHtml(personalize(scene.trait, slots))}</p>
      <p class="ending-progress" aria-label="결말 수집 상태">${escapeHtml(endingCount)}/3</p>
      ${renderVocabularyWords(scene.vocab)}
      <button type="button" data-action="restart">다시 시작</button>
    </article>
  </main>`;
}
