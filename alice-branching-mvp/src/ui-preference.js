import { SUPPORTED_UI_IDS } from "./ui-variant.js";

export const DEFAULT_UI_ID = "visual-novel";
export const UI_PREFERENCE_STORAGE_KEY = "alice-branching-mvp/ui-preference-v1";

export function normalizeUiPreference(value) {
  return SUPPORTED_UI_IDS.includes(value) ? value : DEFAULT_UI_ID;
}

export function createUiPreferenceStore(storage) {
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = null;
    }
  }

  let memory = DEFAULT_UI_ID;
  let storageFailed = !storage;

  return {
    load() {
      if (storageFailed) return memory;
      try {
        memory = normalizeUiPreference(storage.getItem(UI_PREFERENCE_STORAGE_KEY));
      } catch {
        storageFailed = true;
      }
      return memory;
    },
    save(value) {
      memory = normalizeUiPreference(value);
      if (!storage) return memory;
      try {
        storage.setItem(UI_PREFERENCE_STORAGE_KEY, memory);
        storageFailed = false;
      } catch {
        storageFailed = true;
      }
      return memory;
    },
  };
}
