import { renderTemplate } from "./personalization.js";
import {
  chooseChip,
  completeRun,
  createSession,
  createSessionStore,
  restartRun,
  tapVocabulary,
  updateSlots,
  visitScene,
} from "./session.js";
import { getScene, story } from "./story-data.js";
import {
  escapeHtml,
  renderEnding,
  renderRecovery,
  renderScene,
  renderSetup,
  renderVocabularyPanel,
} from "./ui.js";
import { getVocabulary } from "./vocabulary.js";

function baseState(session = null) {
  return {
    screen: "setup",
    sceneId: story.startSceneId,
    session,
    feedback: null,
    chipResponse: null,
    vocabulary: null,
  };
}

function isUsableSession(session) {
  return Boolean(
    session
    && typeof session === "object"
    && session.slots
    && Array.isArray(session.path)
    && Array.isArray(session.chipChoices)
    && Array.isArray(session.vocabTapped)
    && Array.isArray(session.endingsSeen)
    && Array.isArray(session.runs)
    && session.runs.length > 0,
  );
}

function personalized(value, session) {
  return renderTemplate(String(value ?? ""), session.slots);
}

function previousChoiceFeedback(path) {
  if (path.length < 2) return null;
  const previous = getScene(path.at(-2));
  const currentSceneId = path.at(-1);
  return previous?.choices?.find(choice => choice.nextSceneId === currentSceneId)?.label ?? null;
}

function restoredChipResponse(scene, session) {
  const selected = [...session.chipChoices]
    .reverse()
    .find(choice => choice.sceneId === scene.id);
  if (!selected) return null;

  const chip = scene.chips?.find(item => personalized(item.label, session) === selected.label);
  if (!chip || !getScene(chip.nextSceneId)) return null;
  return {
    label: personalized(chip.label, session),
    response: personalized(chip.response, session),
    nextSceneId: chip.nextSceneId,
  };
}

export function createAppState(session = null) {
  const state = baseState(session);
  if (session === null || session === undefined) return state;
  if (!isUsableSession(session)) return { ...state, screen: "recovery", sceneId: null };
  if (session.path.length === 0) return state;

  const sceneId = session.path.at(-1);
  const scene = getScene(sceneId);
  if (!scene) return { ...state, screen: "recovery", sceneId };
  if (scene.type === "ending") return { ...state, screen: "ending", sceneId };

  const chipResponse = scene.type === "chip" ? restoredChipResponse(scene, session) : null;
  return {
    ...state,
    screen: chipResponse ? "chip-response" : "scene",
    sceneId,
    feedback: previousChoiceFeedback(session.path),
    chipResponse,
  };
}

export function startStory(state, slots) {
  const session = isUsableSession(state.session)
    ? updateSlots(state.session, slots)
    : createSession(slots);
  return {
    ...baseState(visitScene(session, story.startSceneId)),
    screen: "scene",
  };
}

export function choosePath(state, nextSceneId, selectedLabel = null) {
  const nextScene = getScene(nextSceneId);
  if (!isUsableSession(state.session) || !nextScene) {
    return { ...state, screen: "recovery", vocabulary: null };
  }

  const session = nextScene.type === "ending"
    ? completeRun(state.session, nextScene.id)
    : visitScene(state.session, nextScene.id);
  return {
    ...state,
    screen: nextScene.type === "ending" ? "ending" : "scene",
    sceneId: nextScene.id,
    session,
    feedback: selectedLabel,
    chipResponse: null,
    vocabulary: null,
  };
}

export function continueStory(state, nextSceneId) {
  return choosePath(state, nextSceneId, null);
}

export function selectChip(state, selection) {
  const scene = getScene(state.sceneId);
  if (!isUsableSession(state.session) || scene?.type !== "chip") return state;

  const chip = scene.chips?.find(item => (
    personalized(item.label, state.session) === selection.label
    && item.nextSceneId === selection.nextSceneId
  ));
  if (!chip || !getScene(chip.nextSceneId)) {
    return { ...state, screen: "recovery", vocabulary: null };
  }

  const chipResponse = {
    label: personalized(chip.label, state.session),
    response: personalized(chip.response, state.session),
    nextSceneId: chip.nextSceneId,
  };
  return {
    ...state,
    screen: "chip-response",
    session: chooseChip(state.session, scene.id, chipResponse.label),
    feedback: null,
    chipResponse,
    vocabulary: null,
  };
}

export function continueChip(state) {
  if (state.screen !== "chip-response" || !state.chipResponse) return state;
  return choosePath(state, state.chipResponse.nextSceneId);
}

export function openVocabulary(state, word) {
  const definition = getVocabulary(word);
  if (!definition || !isUsableSession(state.session)) return state;
  return {
    ...state,
    session: tapVocabulary(state.session, word),
    vocabulary: { word, definition },
  };
}

export function closeVocabulary(state) {
  return { ...state, vocabulary: null };
}

export function restartStory(state) {
  const session = isUsableSession(state.session) ? restartRun(state.session) : null;
  return baseState(session);
}

function clone(value) {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function createDebugGetters(getState) {
  return Object.freeze({
    screen: () => getState().screen,
    sceneId: () => getState().sceneId,
    session: () => clone(getState().session),
  });
}

export function resetTransitionView(scrollTo, focusTarget) {
  scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (!focusTarget) return;
  focusTarget.setAttribute("tabindex", "-1");
  focusTarget.focus({ preventScroll: true });
}

function renderChipResponse(state) {
  const scene = getScene(state.sceneId);
  const response = state.chipResponse;
  return `<main class="story-screen chip-response-screen scene-${escapeHtml(scene.art)}">
    <div class="scene-art" aria-hidden="true"></div>
    <article>
      <p class="scene-kicker">네가 고른 말</p>
      <h1>${escapeHtml(response.label)}</h1>
      <p class="chip-answer" role="status">${escapeHtml(response.response)}</p>
      <button class="primary-action" type="button" data-action="continue-chip">이야기 이어 보기</button>
    </article>
  </main>`;
}

export function bindAppEvents(
  app,
  getState,
  commit,
  readForm = form => Object.fromEntries(new FormData(form)),
) {
  app.addEventListener("submit", event => {
    const form = event.target.closest('form[data-action="start"]');
    if (!form) return;
    event.preventDefault();
    commit(startStory(getState(), readForm(form)));
  });

  app.addEventListener("click", event => {
    const control = event.target.closest("[data-action]");
    if (!control || !app.contains(control)) return;

    const state = getState();
    const action = control.dataset.action;
    if (action === "choose") {
      commit(choosePath(state, control.dataset.nextScene, control.textContent.trim()));
    } else if (action === "continue") {
      commit(continueStory(state, control.dataset.nextScene));
    } else if (action === "choose-chip") {
      commit(selectChip(state, {
        label: control.dataset.chipLabel,
        response: control.dataset.chipResponse,
        nextSceneId: control.dataset.nextScene,
      }));
    } else if (action === "continue-chip") {
      commit(continueChip(state));
    } else if (action === "vocab") {
      commit(openVocabulary(state, control.dataset.word), false);
      app.querySelector(".vocabulary-panel button")?.focus();
    } else if (action === "close-vocabulary") {
      const word = state.vocabulary?.word;
      commit(closeVocabulary(state), false);
      [...app.querySelectorAll('[data-action="vocab"]')]
        .find(button => button.dataset.word === word)
        ?.focus();
    } else if (action === "restart") {
      commit(restartStory(state));
    }
  });
}

function mountBrowserApp() {
  const app = document.querySelector("#app");
  if (!app) return;

  const store = createSessionStore();
  let state = createAppState(store.load());

  function render(focusHeading = false) {
    const scene = getScene(state.sceneId);
    let html;
    if (state.screen === "setup") html = renderSetup(state.session?.slots);
    else if (state.screen === "scene" && scene) html = renderScene(scene, state.session, state.feedback);
    else if (state.screen === "chip-response" && scene) html = renderChipResponse(state);
    else if (state.screen === "ending" && scene) html = renderEnding(scene, state.session);
    else html = renderRecovery();

    const panel = state.vocabulary
      ? renderVocabularyPanel(state.vocabulary.word, state.vocabulary.definition)
      : "";
    app.innerHTML = html + panel;

    if (focusHeading) {
      const heading = app.querySelector("main h1");
      resetTransitionView(options => window.scrollTo(options), heading);
    }
  }

  function commit(nextState, focusHeading = true) {
    state = nextState;
    if (state.session) store.save(state.session);
    render(focusHeading);
  }

  bindAppEvents(app, () => state, commit);

  window.__aliceStoryDebug = createDebugGetters(() => state);
  render();
}

if (typeof document !== "undefined" && typeof window !== "undefined") mountBrowserApp();
