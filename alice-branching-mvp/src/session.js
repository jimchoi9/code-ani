import { normalizeSlots } from "./personalization.js";

const STORAGE_KEY = "alice-branching-mvp/session-v1";
const isoNow = () => new Date().toISOString();

export function normalizeStoryLevel(value) {
  return value === "easy" ? "easy" : "hard";
}

export function normalizeSessionLevel(session) {
  if (!session || typeof session !== "object") return session;
  return { ...session, level: normalizeStoryLevel(session.level) };
}

function run(id, startedAt) {
  return {
    id,
    startedAt,
    completedAt: null,
    path: [],
    chipChoices: [],
    vocabTapped: [],
    storyState: {},
    replayed: false,
  };
}

function updateCurrentRun(session, update) {
  const currentIndex = session.runs.length - 1;
  return {
    ...session,
    runs: session.runs.map((current, index) => index === currentIndex ? update(current) : current),
  };
}

function appendOnce(items, item) {
  return items.includes(item) ? items : [...items, item];
}

export function createSession(slots = {}, now = isoNow(), level = "hard") {
  return {
    level: normalizeStoryLevel(level),
    slots: normalizeSlots(slots),
    path: [],
    chipChoices: [],
    vocabTapped: [],
    endingsSeen: [],
    traitFragmentsSeen: [],
    roseStampsSeen: [],
    storyState: {},
    runs: [run(`run-${now}`, now)],
  };
}

export function collectTraitFragment(session, fragmentId) {
  return {
    ...session,
    traitFragmentsSeen: appendOnce(session.traitFragmentsSeen ?? [], fragmentId),
  };
}

export function collectRoseStamp(session, stampId) {
  return {
    ...session,
    roseStampsSeen: appendOnce(session.roseStampsSeen ?? [], stampId),
  };
}

export function updateSlots(session, slots) {
  return { ...session, slots: normalizeSlots(slots), runs: [...session.runs] };
}

export function visitScene(session, sceneId) {
  return updateCurrentRun({ ...session, path: [...session.path, sceneId] }, current => ({
    ...current,
    path: [...current.path, sceneId],
  }));
}

export function chooseChip(session, sceneId, label) {
  const choice = { sceneId, label };
  return updateCurrentRun({ ...session, chipChoices: [...session.chipChoices, choice] }, current => ({
    ...current,
    chipChoices: [...current.chipChoices, choice],
  }));
}

export function applyStoryEffect(session, effect = {}) {
  const storyState = { ...(session.storyState ?? {}), ...effect };
  return updateCurrentRun({ ...session, storyState }, current => ({
    ...current,
    storyState: { ...(current.storyState ?? {}), ...effect },
  }));
}

export function tapVocabulary(session, word) {
  if (session.vocabTapped.includes(word)) return { ...session };
  return updateCurrentRun({ ...session, vocabTapped: [...session.vocabTapped, word] }, current => ({
    ...current,
    vocabTapped: [...current.vocabTapped, word],
  }));
}

export function completeRun(session, endingId, now = isoNow()) {
  return updateCurrentRun({
    ...session,
    path: appendOnce(session.path, endingId),
    endingsSeen: appendOnce(session.endingsSeen, endingId),
  }, current => ({
    ...current,
    completedAt: now,
    path: appendOnce(current.path, endingId),
  }));
}

export function restartRun(session, now = isoNow()) {
  const previousRun = session.runs.length - 1;
  return {
    ...session,
    path: [],
    chipChoices: [],
    vocabTapped: [],
    storyState: {},
    runs: [
      ...session.runs.map((current, index) => index === previousRun ? { ...current, replayed: true } : current),
      run(`run-${now}`, now),
    ],
  };
}

export function createSessionStore(storage) {
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = null;
    }
  }

  let memory = null;
  let storageFailed = false;

  return {
    load() {
      if (storageFailed) return normalizeSessionLevel(memory);
      try {
        const value = storage?.getItem(STORAGE_KEY);
        if (value === null || value === undefined) return normalizeSessionLevel(memory);
        memory = normalizeSessionLevel(JSON.parse(value));
        return memory;
      } catch {
        storageFailed = true;
        return normalizeSessionLevel(memory);
      }
    },
    save(session) {
      let serialized;
      try {
        serialized = JSON.stringify(session);
        if (serialized === undefined) return;
        memory = JSON.parse(serialized);
      } catch {
        return;
      }

      try {
        storage?.setItem(STORAGE_KEY, serialized);
        storageFailed = false;
      } catch {
        storageFailed = true;
        // The serialized closure snapshot remains available when storage is blocked.
      }
    },
    clear() {
      memory = null;
      try {
        storage?.removeItem(STORAGE_KEY);
        storageFailed = false;
      } catch {
        storageFailed = true;
        // Clearing memory is sufficient when persistent storage is unavailable.
      }
    },
  };
}
