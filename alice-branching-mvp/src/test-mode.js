import { normalizeUiPreference } from "./ui-preference.js";

const STORAGE_KEY = "alice-branching-mvp/test-v1";

const INITIAL_ONBOARDING = Object.freeze({ step: "name", answers: {} });

function clone(value) {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function isTestMode(search = "") {
  return new URLSearchParams(search).get("test") === "1";
}

export function normalizeParticipantId(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 12);
}

export function createTestModeStore(storage, now = () => new Date().toISOString(), uiId = "visual-novel") {
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = null;
    }
  }

  let memory = null;
  let storageFailed = false;

  function persist(record) {
    memory = clone(record);
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(record));
      storageFailed = false;
    } catch {
      storageFailed = true;
    }
  }

  function load() {
    if (storageFailed) return clone(memory);
    try {
      const serialized = storage?.getItem(STORAGE_KEY);
      if (serialized === null || serialized === undefined) return clone(memory);
      memory = JSON.parse(serialized);
      return clone(memory);
    } catch {
      storageFailed = true;
      return clone(memory);
    }
  }

  function record(type, details = {}) {
    const current = load();
    if (!current) return null;
    const timestamp = now();
    const event = {
      type,
      participantId: current.participantId,
      ui: normalizeUiPreference(uiId),
      timestamp,
      elapsedMs: Math.max(0, Date.parse(timestamp) - Date.parse(current.startedAt)),
      ...clone(details),
    };
    const next = { ...current, events: [...current.events, event] };
    persist(next);
    return clone(event);
  }

  return {
    load,
    start(participantId) {
      const normalized = normalizeParticipantId(participantId);
      if (!normalized) return null;
      const startedAt = now();
      persist({ participantId: normalized, startedAt, events: [], onboarding: clone(INITIAL_ONBOARDING) });
      record("test_started");
      return load();
    },
    saveOnboarding(onboarding) {
      const current = load();
      if (!current) return null;
      const next = {
        ...current,
        onboarding: {
          step: String(onboarding?.step ?? "name"),
          answers: clone(onboarding?.answers ?? {}),
          ...(onboarding?.ageGroup ? { ageGroup: String(onboarding.ageGroup) } : {}),
          ...(onboarding?.level ? { level: String(onboarding.level) } : {}),
        },
      };
      persist(next);
      return clone(next.onboarding);
    },
    record,
    clear() {
      memory = null;
      try {
        storage?.removeItem(STORAGE_KEY);
        storageFailed = false;
      } catch {
        storageFailed = true;
      }
    },
    exportSnapshot(storySession) {
      return {
        schemaVersion: 1,
        exportedAt: now(),
        participant: load(),
        storySession: clone(storySession),
      };
    },
  };
}
