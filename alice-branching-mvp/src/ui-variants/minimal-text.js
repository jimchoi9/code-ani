import { createBeats } from "../beat.js";
import { renderTemplate } from "../personalization.js";
import { getScene } from "../story-data.js";
import { escapeHtml } from "../ui.js";
import { currentRenderer } from "./current.js";

function personalize(value, slots = {}) {
  return renderTemplate(String(value ?? ""), slots);
}

function clampBeatIndex(minimalState, sceneId, beatCount) {
  if (minimalState?.sceneId !== sceneId || !Number.isInteger(minimalState?.beatIndex)) return 0;
  return Math.min(Math.max(minimalState.beatIndex, 0), Math.max(beatCount - 1, 0));
}

function chapterLabel(scene, session, mode) {
  if (mode === "ending") return "이야기의 끝";
  const sceneIndex = session?.path?.indexOf(scene?.id) ?? -1;
  return `${sceneIndex >= 0 ? sceneIndex + 1 : 1}장`;
}

export function createMinimalView(scene, session, minimalState, mode = "scene") {
  const beats = createBeats(personalize(scene?.body, session?.slots));
  const beatIndex = clampBeatIndex(minimalState, scene?.id, beats.length);

  return {
    beats,
    beatIndex,
    text: beats[beatIndex] ?? "",
    isLastBeat: beats.length === 0 || beatIndex === beats.length - 1,
    chapterLabel: chapterLabel(scene, session, mode),
  };
}

function renderVocabularyWords(words = []) {
  if (!words.length) return "";

  return `<aside class="minimal-vocabulary" aria-label="낱말 살펴보기"><h2>낱말 살펴보기</h2><ul>${words
    .map(word => `<li><button type="button" data-action="vocab" data-word="${escapeHtml(word)}">${escapeHtml(word)}</button></li>`)
    .join("")}</ul></aside>`;
}

function renderSceneActions(scene, slots) {
  if (scene.type === "chip") {
    const prompt = scene.prompt
      ? `<p class="minimal-prompt">${escapeHtml(personalize(scene.prompt, slots))}</p>`
      : "";
    const chips = (scene.chips ?? []).map(chip => {
      const label = personalize(chip.label, slots);
      const response = personalize(chip.response, slots);
      return `<button class="minimal-choice" type="button" data-action="choose-chip" data-next-scene="${escapeHtml(chip.nextSceneId)}" data-chip-label="${escapeHtml(label)}" data-chip-response="${escapeHtml(response)}">${escapeHtml(label)}</button>`;
    }).join("");
    return `${prompt}<div class="minimal-actions" aria-label="대답 고르기">${chips}</div>`;
  }

  const choices = (scene.choices ?? []).map(choice => (
    `<button class="minimal-choice" type="button" data-action="choose" data-choice-id="${escapeHtml(choice.id ?? "")}" data-next-scene="${escapeHtml(choice.nextSceneId)}">${escapeHtml(personalize(choice.label, slots))}</button>`
  )).join("");
  if (choices) return `<div class="minimal-actions" aria-label="다음 장면 고르기">${choices}</div>`;
  if (!scene.nextSceneId) return "";

  return `<div class="minimal-actions" aria-label="다음 장면"><button class="minimal-choice" type="button" data-action="continue" data-next-scene="${escapeHtml(scene.nextSceneId)}">계속 읽기</button></div>`;
}

function renderReader(scene, session, minimalState, mode, finalContent) {
  const view = createMinimalView(scene, session, minimalState, mode);
  const final = view.isLastBeat ? finalContent : "";
  const next = view.isLastBeat
    ? ""
    : '<button class="minimal-next" type="button" data-action="next-beat" aria-label="다음 문장">⌄</button>';
  const readerAction = view.isLastBeat ? "" : ' data-reader-action="next-beat"';

  return `<main class="minimal-shell" data-ui="minimal" data-scene-id="${escapeHtml(scene.id)}"${readerAction}>
    <article class="minimal-reader">
      <p class="minimal-chapter">${escapeHtml(view.chapterLabel)}</p>
      <p class="minimal-beat" data-focus-target role="status" aria-live="polite" aria-atomic="true">${escapeHtml(view.text)}</p>
      ${final}
      ${next}
    </article>
  </main>`;
}

export function renderScene(scene, session, feedback = null, options = {}) {
  const slots = session?.slots ?? {};
  const feedbackMessage = feedback === null || feedback === undefined
    ? ""
    : `<p class="minimal-feedback" role="status">네가 고른 길: ${escapeHtml(personalize(feedback, slots))}</p>`;
  const finalContent = `${feedbackMessage}${renderVocabularyWords(scene.vocab)}${renderSceneActions(scene, slots)}`;

  return renderReader(scene, session, options.minimalState, "scene", finalContent);
}

export function renderChipResponse(state, options = {}) {
  const scene = getScene(state?.sceneId);
  if (!scene) return currentRenderer.renderRecovery(options);

  const response = state?.chipResponse ?? {};
  const responseScene = { ...scene, body: response.response ?? "" };
  const finalContent = `<button class="minimal-choice" type="button" data-action="continue-chip">이야기 이어 보기</button>`;

  return renderReader(responseScene, state?.session, options.minimalState, "chip-response", finalContent);
}

export function renderEnding(scene, session, options = {}) {
  const slots = session?.slots ?? {};
  const selectedChip = (session?.chipChoices ?? []).find(choice => choice.sceneId === scene.sourceSceneId);
  const recall = selectedChip
    ? `<p class="minimal-feedback">${escapeHtml(personalize(scene.choiceRecall ?? "네가 고른 말", slots))}: ${escapeHtml(personalize(selectedChip.label, slots))}</p>`
    : "";
  const endingCount = session?.endingsSeen?.length ?? 0;
  const finalContent = `${recall}
    <p class="minimal-trait">너의 이야기 조각: ${escapeHtml(personalize(scene.trait, slots))}</p>
    <p class="minimal-ending-progress" aria-label="결말 수집 상태">지금까지 만난 결말 ${escapeHtml(endingCount)}/3</p>
    ${renderVocabularyWords(scene.vocab)}
    <button class="minimal-choice" type="button" data-action="restart">다시 시작</button>`;

  return renderReader(scene, session, options.minimalState, "ending", finalContent);
}

export const minimalTextRenderer = Object.freeze({
  id: "minimal",
  createView: createMinimalView,
  renderSetup: currentRenderer.renderSetup,
  renderScene,
  renderChipResponse,
  renderEnding,
  renderRecovery: currentRenderer.renderRecovery,
  renderVocabularyPanel: currentRenderer.renderVocabularyPanel,
});
