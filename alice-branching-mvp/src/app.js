import {
  createBeats,
  createMinimalStateStore,
  normalizeMinimalState,
} from "./beat.js";
import { renderTemplate } from "./personalization.js";
import {
  applyStoryEffect,
  chooseChip,
  collectRoseStamp,
  collectTraitFragment,
  completeRun,
  createSession,
  createSessionStore,
  restartRun,
  tapVocabulary,
  updateSlots,
  visitScene,
} from "./session.js";
import { ENDING_BY_ENCOUNTER, getScene, resolveScene, story } from "./story-data.js";
import { createTestModeStore } from "./test-mode.js";
import { escapeHtml } from "./ui.js";
import { createCompareLinks, getUiRenderer } from "./ui-variant.js";
import { createUiPreferenceStore } from "./ui-preference.js";
import { getVocabulary } from "./vocabulary.js";

function baseState(session = null) {
  return {
    screen: "setup",
    sceneId: story.startSceneId,
    session,
    feedback: null,
    chipResponse: null,
    vocabulary: null,
    testCompleted: false,
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

const ONBOARDING_STEPS = Object.freeze({
  name: { slot: "HERO", next: "snack", maxLength: 6 },
  snack: { slot: "TREAT", next: "friend", maxLength: 12 },
  friend: { slot: "PET", next: "confirm", maxLength: 12 },
});

export function answerOnboarding(onboarding, value) {
  const current = onboarding ?? { step: "name", answers: {} };
  const config = ONBOARDING_STEPS[current.step];
  if (!config) return current;
  const answer = String(value ?? "").trim().slice(0, config.maxLength);
  if (!answer) return current;
  return {
    step: config.next,
    answers: { ...(current.answers ?? {}), [config.slot]: answer },
  };
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
    response: personalized([chip.response, scene.afterChip].filter(Boolean).join("\n\n"), session),
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

export function choosePath(state, nextSceneId, selectedLabel = null, choiceId = null) {
  const nextScene = getScene(nextSceneId);
  if (!isUsableSession(state.session) || !nextScene) {
    return { ...state, screen: "recovery", vocabulary: null };
  }

  let session = state.session;
  if (choiceId) {
    const currentScene = resolveScene(state.sceneId, session);
    const choice = currentScene?.choices?.find(item => item.id === choiceId);
    if (!choice || choice.nextSceneId !== nextSceneId) {
      return { ...state, screen: "recovery", vocabulary: null };
    }
    session = applyStoryEffect(session, choice.effect);
  }

  if (nextScene.id === "FRAGMENT") {
    const fragmentId = ENDING_BY_ENCOUNTER[session.storyState?.encounterId];
    if (fragmentId) session = collectTraitFragment(session, fragmentId);
  }
  if (nextScene.type === "ending") {
    const variation = session.storyState?.endingVariation;
    if (variation) session = collectRoseStamp(session, `${nextScene.id}:${variation}`);
    session = completeRun(session, nextScene.id);
  } else {
    session = visitScene(session, nextScene.id);
  }
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
    response: personalized([chip.response, scene.afterChip].filter(Boolean).join("\n\n"), state.session),
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

export function replayForAnotherEnding(state) {
  if (!isUsableSession(state.session)) return state;
  const session = visitScene(restartRun(state.session), story.startSceneId);
  return {
    ...baseState(session),
    screen: "scene",
    sceneId: story.startSceneId,
  };
}

export function finishAdventure(state) {
  if (state?.screen !== "ending" || !isUsableSession(state.session)) return state;
  return { ...state, screen: "complete", vocabulary: null, testCompleted: false };
}

export function markTestComplete(state) {
  if (state?.screen !== "complete") return state;
  return { ...state, testCompleted: true };
}

export function returnToEnding(state) {
  if (state?.screen !== "complete") return state;
  return { ...state, screen: "ending", testCompleted: false };
}

export function createStoryReward(previousState, nextState) {
  if (nextState?.sceneId === "FRAGMENT") {
    const fragmentId = ENDING_BY_ENCOUNTER[nextState.session?.storyState?.encounterId];
    const before = previousState?.session?.traitFragmentsSeen ?? [];
    const after = nextState.session?.traitFragmentsSeen ?? [];
    if (!fragmentId || before.includes(fragmentId) || !after.includes(fragmentId)) return null;
    return { kind: "trait", fragmentId, count: after.length };
  }
  if (nextState?.screen !== "ending" || !nextState.sceneId) return null;
  const variation = nextState.session?.storyState?.endingVariation;
  const stampId = variation ? `${nextState.sceneId}:${variation}` : null;
  const before = previousState?.session?.roseStampsSeen ?? [];
  const after = nextState.session?.roseStampsSeen ?? [];
  if (!stampId || before.includes(stampId) || !after.includes(stampId)) return null;
  return { kind: "rose", endingId: nextState.sceneId, variation, stampId, count: after.length };
}

export function advanceMinimalBeat(appState, minimalState, beatCount) {
  const current = normalizeMinimalState(minimalState, appState.sceneId, beatCount);
  return {
    appState,
    minimalState: {
      ...current,
      beatIndex: Math.min(current.beatIndex + 1, Math.max(beatCount - 1, 0)),
    },
  };
}

function clone(value) {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function createDebugGetters(
  getState,
  getUiVariant = () => "current",
  getMinimalState = () => null,
) {
  return Object.freeze({
    screen: () => getState().screen,
    sceneId: () => getState().sceneId,
    session: () => clone(getState().session),
    uiVariant: () => clone(getUiVariant()),
    minimalState: () => clone(getMinimalState()),
  });
}

export function resetTransitionView(scrollTo, focusTarget) {
  scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (!focusTarget) return;
  focusTarget.setAttribute("tabindex", "-1");
  focusTarget.focus({ preventScroll: true });
}

export function focusRenderedContent(app, scrollTo, resetScroll = false) {
  const target = app.querySelector("[data-focus-target]")
    ?? app.querySelector("main h1")
    ?? app.querySelector("main");
  if (resetScroll) {
    resetTransitionView(scrollTo, target);
    return;
  }
  if (!target) return;
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

const UI_LABELS = Object.freeze({
  current: "현재형",
  "visual-novel": "비주얼노벨",
  minimal: "미니멀 텍스트",
});

export function renderCompareMenu(search, uiVariant) {
  const params = new URLSearchParams(search);
  if (params.get("test") === "1" || params.get("compare") !== "1") return "";

  const links = createCompareLinks(search).map(({ id, href }) => {
    const current = id === uiVariant ? ' aria-current="page"' : "";
    return `<a href="${escapeHtml(href)}"${current}>${UI_LABELS[id]}</a>`;
  }).join("");
  return `<nav class="compare-menu" aria-label="UI 비교">${links}</nav>`;
}

export function renderTestNavigation() {
  return `<nav class="test-navigation" aria-label="테스트 설정">
    <button class="test-home-button" type="button" data-action="return-to-start">← 처음으로</button>
    <a class="test-settings-link" href="./settings.html">UI 설정</a>
  </nav>`;
}

export function renderTestEndingActions() {
  return `<div class="test-ending-actions" aria-label="테스트 계속하기">
    <button type="button" data-action="other-ending">다른 결말 보기</button>
    <button type="button" data-action="finish-adventure">오늘 테스트 마치기</button>
  </div>`;
}

export function bindAppEvents(
  app,
  getState,
  commit,
  readForm = form => Object.fromEntries(new FormData(form)),
  {
    onNextBeat = () => {},
    onRestart = () => {},
    getSelectionText = () => globalThis.getSelection?.()?.toString() ?? "",
    onStart = (values, state) => startStory(state, values),
    onStoryEvent = () => {},
    onOtherEnding = state => replayForAnotherEnding(state),
    onReturnToStart = state => state,
    onTestReset = state => state,
    onTestDownload = () => {},
    onTestComplete = () => {},
    onNewParticipant = state => state,
    onStartOnboarding = () => {},
    onOnboardingAnswer = () => {},
    onOnboardingConfirm = () => {},
    onDismissReward = () => {},
  } = {},
) {
  app.addEventListener("submit", event => {
    const form = event.target.closest('form[data-action="start"]') ?? event.target.closest("form[data-action]");
    if (!form) return;
    const action = form.dataset?.action ?? "start";
    if (!["start", "start-onboarding", "onboarding-answer"].includes(action)) return;
    event.preventDefault();
    const values = readForm(form);
    if (action === "start") commit(onStart(values, getState()));
    else if (action === "start-onboarding") onStartOnboarding(values);
    else onOnboardingAnswer(values.ANSWER);
  });

  app.addEventListener("click", event => {
    const control = event.target.closest("[data-action]");
    if (!control) {
      const reader = event.target.closest('[data-reader-action="next-beat"]');
      if (reader && app.contains(reader) && !getSelectionText().trim()) onNextBeat();
      return;
    }
    if (!app.contains(control)) return;

    const state = getState();
    const action = control.dataset.action;
    if (action === "choose") {
      onStoryEvent("choice_selected", {
        sceneId: state.sceneId,
        choice: control.textContent.trim(),
        nextSceneId: control.dataset.nextScene,
      });
      commit(choosePath(state, control.dataset.nextScene, control.textContent.trim(), control.dataset.choiceId));
    } else if (action === "continue") {
      commit(continueStory(state, control.dataset.nextScene));
    } else if (action === "choose-chip") {
      onStoryEvent("choice_selected", {
        sceneId: state.sceneId,
        choice: control.dataset.chipLabel,
        nextSceneId: control.dataset.nextScene,
        kind: "chip",
      });
      commit(selectChip(state, {
        label: control.dataset.chipLabel,
        response: control.dataset.chipResponse,
        nextSceneId: control.dataset.nextScene,
      }));
    } else if (action === "continue-chip") {
      commit(continueChip(state));
    } else if (action === "next-beat") {
      onNextBeat();
    } else if (action === "vocab") {
      onStoryEvent("vocabulary_opened", { sceneId: state.sceneId, word: control.dataset.word });
      commit(openVocabulary(state, control.dataset.word), false);
      app.querySelector('[data-action="close-vocabulary"]')?.focus();
    } else if (action === "close-vocabulary") {
      const word = state.vocabulary?.word;
      commit(closeVocabulary(state), false);
      [...app.querySelectorAll('[data-action="vocab"]')]
        .find(button => button.dataset.word === word)
        ?.focus();
    } else if (action === "restart") {
      onStoryEvent("story_restarted", { sceneId: state.sceneId });
      onRestart();
      commit(restartStory(state));
    } else if (action === "return-to-start") {
      commit(onReturnToStart(state));
    } else if (action === "other-ending") {
      onStoryEvent("story_replayed", { sceneId: state.sceneId });
      commit(onOtherEnding(state));
    } else if (action === "test-reset") {
      commit(onTestReset(state));
    } else if (action === "test-download") {
      onTestDownload(state);
    } else if (action === "finish-adventure") {
      commit(finishAdventure(state));
    } else if (action === "complete-test") {
      onStoryEvent("test_completed", { sceneId: state.sceneId });
      onTestComplete(state);
      commit(markTestComplete(state), false);
    } else if (action === "new-participant") {
      commit(onNewParticipant(state));
    } else if (action === "back-to-ending") {
      commit(returnToEnding(state));
    } else if (action === "onboarding-suggestion") {
      onOnboardingAnswer(control.dataset.value);
    } else if (action === "onboarding-confirm") {
      onOnboardingConfirm();
    } else if (action === "dismiss-reward") {
      onDismissReward(control);
    }
  });
}

export function downloadTestJson(documentRef, windowRef, payload, filename) {
  const blob = new windowRef.Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = windowRef.URL.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  windowRef.URL.revokeObjectURL(url);
}

function getMinimalBeatContext(state) {
  if (!["scene", "chip-response", "ending"].includes(state.screen)) return null;
  const scene = resolveScene(state.sceneId, state.session ?? {});
  if (!scene || !isUsableSession(state.session)) return null;

  const body = state.screen === "chip-response" ? state.chipResponse?.response : scene.body;
  return {
    sceneId: scene.id,
    beatCount: createBeats(personalized(body, state.session)).length,
  };
}

export function mountBrowserApp({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  sessionStore: suppliedSessionStore = null,
  minimalStore: suppliedMinimalStore = null,
  testStore: suppliedTestStore = null,
  preferenceStore: suppliedPreferenceStore = null,
  downloadJson = downloadTestJson,
  getRenderer = getUiRenderer,
} = {}) {
  const app = documentRef?.querySelector("#app");
  if (!app) return;

  const testMode = true;
  const preferenceStore = suppliedPreferenceStore ?? createUiPreferenceStore();
  const uiVariant = preferenceStore.load();
  const ui = getRenderer(uiVariant);
  const testShell = getRenderer("visual-novel");
  const minimalStore = suppliedMinimalStore ?? createMinimalStateStore();
  const store = suppliedSessionStore ?? createSessionStore();
  const testStore = suppliedTestStore ?? createTestModeStore(undefined, undefined, uiVariant);
  const activeTest = testStore.load();
  if (!activeTest) store.clear();
  let state = createAppState(store.load());
  let minimalState = null;
  let storyReward = null;
  let onboarding = activeTest?.onboarding ?? null;
  let onboardingTyping = false;
  let onboardingGeneration = 0;
  if (activeTest && state.screen === "setup") state = { ...state, screen: "onboarding" };

  app.dataset.ui = uiVariant;
  app.dataset.testMode = "true";

  function testContext() {
    const record = testStore.load();
    return {
      testMode,
      participantId: record?.participantId ?? "",
      eventCount: record?.events?.length ?? 0,
      storyReward,
      testCompleted: state.testCompleted,
      onboarding,
      onboardingTyping,
    };
  }

  function syncMinimalState() {
    if (uiVariant !== "minimal") return;
    const context = getMinimalBeatContext(state);
    if (!context) {
      minimalState = null;
      return;
    }
    minimalState = minimalStore.load(context.sceneId, context.beatCount);
    minimalStore.save(minimalState);
  }

  function renderStoryWithUi(method, ...args) {
    if (uiVariant === "minimal") return ui[method](...args, { minimalState });
    if (uiVariant === "visual-novel") return ui[method](...args, { ...testContext(), testMode: false });
    return ui[method](...args);
  }

  function renderTestShell(method, ...args) {
    return testShell[method](...args, testContext());
  }

  function render(focusContent = false, resetScroll = focusContent) {
    syncMinimalState();
    const scene = resolveScene(state.sceneId, state.session ?? {});
    let html;
    if (state.screen === "setup") html = renderTestShell("renderSetup", state.session?.slots);
    else if (state.screen === "onboarding") html = renderTestShell("renderOnboarding");
    else if (state.screen === "scene" && scene) html = renderStoryWithUi("renderScene", scene, state.session, state.feedback);
    else if (state.screen === "chip-response" && scene) html = renderStoryWithUi("renderChipResponse", state);
    else if (state.screen === "ending" && scene) html = renderStoryWithUi("renderEnding", scene, state.session);
    else if (state.screen === "complete" && scene) html = renderTestShell("renderComplete", state.session, scene);
    else html = renderStoryWithUi("renderRecovery");

    const panel = state.vocabulary
      ? renderStoryWithUi("renderVocabularyPanel", state.vocabulary.word, state.vocabulary.definition)
      : "";
    const minimalContext = getMinimalBeatContext(state);
    const isEndingReady = uiVariant !== "minimal"
      || minimalState?.beatIndex === Math.max((minimalContext?.beatCount ?? 1) - 1, 0);
    const endingActions = state.screen === "ending" && isEndingReady ? renderTestEndingActions() : "";
    const testTools = !["complete", "onboarding"].includes(state.screen) && typeof testShell.renderTestTools === "function"
      ? testShell.renderTestTools(testContext())
      : "";
    app.dataset.screen = state.screen;
    app.innerHTML = html + panel + endingActions + testTools + renderTestNavigation();

    if (storyReward && typeof ui.playReward === "function") {
      ui.playReward(app, windowRef);
      storyReward = null;
    }

    if (focusContent) focusRenderedContent(app, options => windowRef.scrollTo(options), resetScroll);
  }

  function commit(nextState, focusHeading = true) {
    const previous = state;
    storyReward = createStoryReward(previous, nextState);
    state = nextState;
    if (state.session) store.save(state.session);
    if (testMode && testStore.load()) {
      if (state.screen === "scene" && (previous.screen !== "scene" || previous.sceneId !== state.sceneId)) {
        testStore.record("scene_viewed", { sceneId: state.sceneId });
      }
      if (state.screen === "ending" && previous.screen !== "ending") {
        testStore.record("ending_reached", { sceneId: state.sceneId });
      }
    }
    render(focusHeading);
  }

  function resetOnboardingState() {
    onboardingGeneration += 1;
    onboarding = null;
    onboardingTyping = false;
  }

  bindAppEvents(app, () => state, commit, undefined, {
    onNextBeat() {
      if (uiVariant !== "minimal") return;
      const context = getMinimalBeatContext(state);
      if (!context) return;
      const next = advanceMinimalBeat(state, minimalState, context.beatCount);
      minimalState = next.minimalState;
      minimalStore.save(minimalState);
      render(true, false);
    },
    onRestart() {
      minimalStore.clear();
      minimalState = null;
    },
    onReturnToStart() {
      store.clear();
      minimalStore.clear();
      testStore.clear();
      resetOnboardingState();
      return createAppState();
    },
    getSelectionText: () => windowRef.getSelection?.()?.toString() ?? "",
    onStart(values) {
      if (!testMode) return startStory(state, values);
      store.clear();
      minimalStore.clear();
      resetOnboardingState();
      testStore.start(values.PARTICIPANT_ID);
      return startStory(createAppState(), values);
    },
    onStartOnboarding(values) {
      if (!testMode) return;
      store.clear();
      minimalStore.clear();
      resetOnboardingState();
      testStore.start(values.PARTICIPANT_ID);
      testStore.record("onboarding_started");
      onboarding = testStore.load()?.onboarding ?? { step: "name", answers: {} };
      state = { ...createAppState(), screen: "onboarding" };
      render(true);
    },
    onOnboardingAnswer(value) {
      if (!testMode || !onboarding || onboardingTyping) return;
      const previousStep = onboarding.step;
      const next = answerOnboarding(onboarding, value);
      if (next === onboarding) return;
      const slot = ONBOARDING_STEPS[previousStep].slot;
      testStore.record("onboarding_answered", { step: previousStep, slot, value: next.answers[slot] });
      onboarding = next;
      onboardingTyping = true;
      render();
      const replyGeneration = onboardingGeneration;
      const finishReply = () => {
        if (replyGeneration !== onboardingGeneration) return;
        onboardingTyping = false;
        testStore.saveOnboarding(onboarding);
        render(true, false);
      };
      if (typeof windowRef.setTimeout === "function") windowRef.setTimeout(finishReply, 650);
      else finishReply();
    },
    onOnboardingConfirm() {
      if (!testMode || onboarding?.step !== "confirm") return;
      testStore.record("onboarding_completed", { answers: onboarding.answers });
      testStore.saveOnboarding({ ...onboarding, step: "complete" });
      commit(startStory(createAppState(), onboarding.answers));
    },
    onStoryEvent(type, details) {
      if (testMode) testStore.record(type, details);
    },
    onTestReset() {
      store.clear();
      minimalStore.clear();
      testStore.clear();
      resetOnboardingState();
      return createAppState();
    },
    onTestDownload(currentState) {
      if (!testMode) return;
      const payload = testStore.exportSnapshot(currentState.session);
      const participantId = payload.participant?.participantId ?? "unknown";
      downloadJson(documentRef, windowRef, payload, `moriai-${participantId}.json`);
    },
    onTestComplete(currentState) {
      if (!testMode) return;
      const payload = testStore.exportSnapshot(currentState.session);
      const participantId = payload.participant?.participantId ?? "unknown";
      downloadJson(documentRef, windowRef, payload, `moriai-${participantId}.json`);
    },
    onNewParticipant() {
      store.clear();
      minimalStore.clear();
      testStore.clear();
      resetOnboardingState();
      return createAppState();
    },
    onDismissReward(control) {
      control.closest(".vn-reward-overlay")?.remove();
    },
  });

  windowRef.__aliceStoryDebug = createDebugGetters(
    () => state,
    () => uiVariant,
    () => minimalState,
  );
  render();
  if (testMode && activeTest && ["scene", "ending"].includes(state.screen)) {
    testStore.record("scene_viewed", { sceneId: state.sceneId, restored: true });
  }
}

if (typeof document !== "undefined" && typeof window !== "undefined") mountBrowserApp();
