import { visualNovelAssets } from "../../assets/visual-novel/manifest.js";
import { renderTemplate } from "../personalization.js";
import { getScene } from "../story-data.js";
import { escapeHtml } from "../ui.js";

const SLOT_OPTIONS = {
  TREAT: ["케이크", "쿠키", "젤리", "붕어빵"],
  PET: ["강아지", "고양이", "토끼", "거북이"],
  COLOR: ["파랑", "노랑", "초록", "분홍"],
};

const progressByScene = Object.freeze({
  S00: 1,
  S01: 2,
  S02: 2,
  A1: 3,
  A3: 3,
  B2: 3,
  E1: 5,
  E3: 5,
  E5: 5,
});

const speakers = Object.freeze({
  rabbit: { id: "rabbit", label: "하얀 토끼" },
  cat: { id: "cat", label: "체셔 고양이" },
  hatter: { id: "hatter", label: "모자장수" },
  caterpillar: { id: "caterpillar", label: "애벌레" },
  narrator: { id: "narrator", label: "서술자" },
  ending: { id: "ending", label: "결말" },
});

function personalize(value, slots = {}) {
  return renderTemplate(String(value ?? ""), slots);
}

function renderParagraphs(value, slots) {
  return personalize(value, slots)
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function renderTrail(progress) {
  return `<div class="vn-trail" aria-label="진행 ${progress}/5">${Array.from(
    { length: 5 },
    (_, index) => `<span class="vn-trail-card${index < progress ? " is-complete" : ""}" aria-hidden="true"></span>`,
  ).join("")}</div>`;
}

function renderGameHud(session = null, slots = {}) {
  const hero = personalize("{HERO}", slots) || "앨리스";
  const level = Math.max(1, session?.path?.length ?? 1);
  const vocabCount = session?.vocabTapped?.length ?? 0;
  const endingCount = session?.endingsSeen?.length ?? 0;
  return `<header class="vn-game-hud">
    <div class="vn-avatar" aria-hidden="true">A</div>
    <div class="vn-player"><strong>${escapeHtml(hero)}</strong><span>STORY Lv. ${escapeHtml(level)}</span></div>
    <div class="vn-hud-stat"><span>낱말</span><strong>${escapeHtml(vocabCount)}</strong></div>
    <div class="vn-hud-stat"><span>결말</span><strong>${escapeHtml(endingCount)}/3</strong></div>
  </header>`;
}

function renderTitlePlaque(title, subtitle) {
  return `<div class="vn-title-plaque"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>`;
}

function renderGameFooter(session = null, progress = 0) {
  const vocabCount = session?.vocabTapped?.length ?? 0;
  const endingCount = session?.endingsSeen?.length ?? 0;
  return `<footer class="vn-game-footer" aria-label="모험 기록">
    <span>진행 <strong>${escapeHtml(progress)}/5</strong></span>
    <span>낱말 <strong>${escapeHtml(vocabCount)}</strong></span>
    <span>결말 <strong>${escapeHtml(endingCount)}/3</strong></span>
  </footer>`;
}

function renderVocabularyWords(words = []) {
  if (!words.length) return "";

  return `<aside class="vn-vocabulary" aria-label="낱말 살펴보기"><h2>낱말 살펴보기</h2><ul>${words
    .map(word => `<li><button type="button" data-action="vocab" data-word="${escapeHtml(word)}">${escapeHtml(word)}</button></li>`)
    .join("")}</ul></aside>`;
}

function renderChoice(choice, slots) {
  return `<button class="vn-choice" type="button" data-action="choose" data-next-scene="${escapeHtml(choice.nextSceneId)}">${escapeHtml(personalize(choice.label, slots))}</button>`;
}

function renderChip(chip, slots) {
  const label = personalize(chip.label, slots);
  const response = personalize(chip.response, slots);
  return `<button class="vn-choice" type="button" data-action="choose-chip" data-next-scene="${escapeHtml(chip.nextSceneId)}" data-chip-label="${escapeHtml(label)}" data-chip-response="${escapeHtml(response)}">${escapeHtml(label)}</button>`;
}

function renderSceneActions(scene, slots) {
  if (scene.type === "chip") {
    const prompt = scene.prompt
      ? `<p class="vn-prompt">${escapeHtml(personalize(scene.prompt, slots))}</p>`
      : "";
    return `${prompt}<div class="vn-actions" aria-label="대답 고르기">${(scene.chips ?? []).map(chip => renderChip(chip, slots)).join("")}</div>`;
  }

  const choices = (scene.choices ?? []).map(choice => renderChoice(choice, slots)).join("");
  if (choices) return `<div class="vn-actions" aria-label="다음 장면 고르기">${choices}</div>`;
  if (!scene.nextSceneId) return "";

  return `<div class="vn-actions" aria-label="다음 장면"><button class="vn-choice" type="button" data-action="continue" data-next-scene="${escapeHtml(scene.nextSceneId)}">계속 읽기</button></div>`;
}

function renderStage(scene, dialogue, progress, endingTone = "", session = null, context = {}) {
  const backgroundKey = visualNovelAssets.sceneBackgrounds[scene.id];
  const background = visualNovelAssets.backgrounds[backgroundKey];
  const characterKey = visualNovelAssets.sceneCharacters[scene.id];
  const character = visualNovelAssets.characters[characterKey];
  const speaker = getVisualNovelSpeaker(scene);
  const toneAttribute = endingTone ? ` data-ending-tone="${escapeHtml(endingTone)}"` : "";
  const backdrop = background
    ? `<div class="vn-background" style="background-image: url('${escapeHtml(background)}')">${character ? `<img class="vn-sprite" src="${escapeHtml(character)}" alt="">` : ""}</div>`
    : `<div class="vn-background"></div>`;

  const slots = session?.slots ?? {};
  return `<main class="vn-shell" data-ui="visual-novel"${toneAttribute}>
    <div class="vn-game-frame">
      ${renderGameHud(session, slots)}
      ${renderTitlePlaque(personalize(scene.title, slots), scene.type === "ending" ? "모험의 결말" : "이상한 나라의 모험")}
      <section class="vn-stage">
        <div class="vn-art-frame">${backdrop}</div>
        <article class="vn-dialogue">
        <p class="vn-nameplate vn-nameplate--${speaker.id}">${escapeHtml(speaker.label)}</p>
        ${dialogue}
        ${renderTrail(progress)}
        </article>
      </section>
      ${renderGameFooter(session, progress)}
    </div>
  </main>`;
}

export function getVisualNovelProgress(session, scene) {
  void session;
  if (!scene || scene.type === "setup") return 0;
  if (scene.type === "chip-response" || scene.screen === "chip-response") return 4;
  return progressByScene[scene.id] ?? 0;
}

export function getVisualNovelSpeaker(scene) {
  if (scene?.type === "ending") return speakers.ending;
  const character = visualNovelAssets.sceneCharacters[scene?.id];
  return speakers[character] ?? speakers.narrator;
}

export function renderSetup(slots = {}, context = {}) {
  const hero = personalize("{HERO}", slots);
  const setupBackground = visualNovelAssets.backgrounds.rabbitHole;
  const groups = Object.entries(SLOT_OPTIONS).map(([slot, options]) => `
    <fieldset data-slot="${slot}">
      <legend>${escapeHtml({ TREAT: "간식", PET: "친구", COLOR: "색깔" }[slot])}</legend>
      ${options.map(option => `<label><input type="radio" name="${slot}" value="${escapeHtml(option)}" data-action="set-slot" data-slot="${slot}"${personalize(`{${slot}}`, slots) === option ? " checked" : ""}>${escapeHtml(option)}</label>`).join("")}
    </fieldset>`).join("");

  void setupBackground;
  return `<main class="vn-shell vn-setup" data-ui="visual-novel">
    <div class="vn-game-frame">
      ${renderGameHud(null, slots)}
      ${renderTitlePlaque("사용자 정보 입력", "앨리스의 모험을 준비해 주세요")}
      <section class="vn-setup-panel">
        <form data-action="start">
          ${context.testMode ? `<label for="participant-id">참가자 코드</label>
          <input id="participant-id" class="vn-participant-input" type="text" name="PARTICIPANT_ID" value="${escapeHtml(context.participantId ?? "")}" maxlength="12" pattern="[A-Za-z0-9_-]+" autocomplete="off" autocapitalize="characters" required data-focus-target>` : ""}
          <label for="hero-name">이름</label>
          <input id="hero-name" type="text" name="HERO" value="${escapeHtml(hero)}" maxlength="6" autocomplete="off" inputmode="text" data-action="set-name">
          ${groups}
          <button class="vn-choice" type="submit" data-action="start">이야기 시작</button>
        </form>
        ${renderTrail(0)}
      </section>
      ${renderGameFooter(null, 0)}
    </div>
  </main>`;
}

export function renderScene(scene, session, feedback = null, context = {}) {
  const slots = session?.slots ?? {};
  const feedbackMessage = feedback === null || feedback === undefined
    ? ""
    : `<p class="vn-feedback" role="status">네가 고른 길: ${escapeHtml(personalize(feedback, slots))}</p>`;
  const dialogue = `<h1>${escapeHtml(personalize(scene.title, slots))}</h1>
    ${feedbackMessage}
    <div class="vn-copy">${renderParagraphs(scene.body, slots)}</div>
    ${renderVocabularyWords(scene.vocab)}
    ${renderSceneActions(scene, slots)}`;

  return renderStage(scene, dialogue, getVisualNovelProgress(session, scene), "", session, context);
}

export function renderChipResponse(state, context = {}) {
  const scene = getScene(state?.sceneId);
  if (!scene) return renderRecovery();

  const response = state?.chipResponse ?? {};
  const dialogue = `<p class="vn-kicker">네가 고른 말</p>
    <h1>${escapeHtml(response.label ?? "")}</h1>
    <p class="vn-feedback" role="status">${escapeHtml(response.response ?? "")}</p>
    <button class="vn-choice" type="button" data-action="continue-chip">이야기 이어 보기</button>`;

  return renderStage(scene, dialogue, 4, "", state.session, context);
}

export function renderEnding(scene, session, context = {}) {
  const slots = session?.slots ?? {};
  const selectedChip = (session?.chipChoices ?? []).find(choice => choice.sceneId === scene.sourceSceneId);
  const recall = selectedChip
    ? `<p class="vn-feedback">${escapeHtml(personalize(scene.choiceRecall ?? "네가 고른 말", slots))}: ${escapeHtml(personalize(selectedChip.label, slots))}</p>`
    : "";
  const endingCount = session?.endingsSeen?.length ?? 0;
  const endingActions = context.testMode
    ? `<div class="vn-test-ending-actions">
        <button class="vn-choice" type="button" data-action="other-ending">다른 결말 보러 가기</button>
        <button class="vn-choice" type="button" data-action="test-complete">오늘은 여기까지</button>
      </div>`
    : `<button class="vn-choice" type="button" data-action="restart">다시 시작</button>`;
  const dialogue = `<p class="vn-kicker">이야기의 끝</p>
    <h1>${escapeHtml(personalize(scene.title, slots))}</h1>
    <div class="vn-copy">${renderParagraphs(scene.body, slots)}</div>
    ${recall}
    <p class="vn-trait">너의 이야기 조각: ${escapeHtml(personalize(scene.trait, slots))}</p>
    <p class="vn-ending-progress" aria-label="결말 수집 상태">${escapeHtml(endingCount)}/3</p>
    ${renderVocabularyWords(scene.vocab)}
    ${endingActions}`;

  return renderStage(scene, dialogue, getVisualNovelProgress(session, scene), visualNovelAssets.endingTones[scene.id], session, context);
}

export function renderRecovery(context = {}) {
  return `<main class="vn-shell" data-ui="visual-novel">
    <div class="vn-game-frame">
      ${renderGameHud()}
      ${renderTitlePlaque("모험이 멈췄어요", "이야기를 다시 불러오지 못했어요")}
      <section class="vn-recovery" role="alert" aria-labelledby="recovery-title">
        <h1 id="recovery-title">이야기를 이어 갈 수 없어요</h1>
        <p>처음 장면부터 다시 시작해 볼까요?</p>
        <button class="vn-choice" type="button" data-action="restart">다시 시작</button>
      </section>
      ${renderGameFooter()}
    </div>
  </main>`;
}

export function renderVocabularyPanel(word, definition) {
  if (typeof definition !== "string" || definition.length === 0) return "";

  return `<section class="vn-vocabulary-panel" role="region" aria-labelledby="vocabulary-word">
    <h2 id="vocabulary-word">${escapeHtml(word)}</h2>
    <p>${escapeHtml(definition)}</p>
    <button class="vn-choice" type="button" data-action="close-vocabulary">닫기</button>
  </section>`;
}

export function renderTestTools(context = {}) {
  if (!context.testMode) return "";
  return `<details class="vn-test-tools">
    <summary>TEST</summary>
    <div>
      <p>참가자 <strong>${escapeHtml(context.participantId || "미등록")}</strong> · 이벤트 ${escapeHtml(context.eventCount ?? 0)}개</p>
      <button type="button" data-action="test-download"${context.participantId ? "" : " disabled"}>JSON 다운로드</button>
      <button type="button" data-action="test-reset">새 테스트 시작</button>
    </div>
  </details>`;
}

export const visualNovelRenderer = Object.freeze({
  id: "visual-novel",
  renderSetup,
  renderScene,
  renderChipResponse,
  renderEnding,
  renderRecovery,
  renderVocabularyPanel,
  renderTestTools,
});
