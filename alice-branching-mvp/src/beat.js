const STORAGE_KEY = "alice-branching-mvp/minimal-ui-v1";
const SENTENCE_PATTERN = /[^.!?。！？]+[.!?。！？]+["'”’」』）)]?|[^.!?。！？]+$/g;

export function splitSentences(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  return (text.match(SENTENCE_PATTERN) ?? [])
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

export function createBeats(text, { maxSentences = 2, maxCharacters = 120 } = {}) {
  const sentences = splitSentences(text);
  const beats = [];
  let current = [];
  for (const sentence of sentences) {
    const candidate = [...current, sentence].join(" ");
    if (current.length && (current.length >= maxSentences || candidate.length > maxCharacters)) {
      beats.push(current.join(" "));
      current = [sentence];
    } else {
      current.push(sentence);
    }
  }
  if (current.length) beats.push(current.join(" "));
  return beats;
}

export function normalizeMinimalState(value, sceneId, beatCount) {
  const valid = value
    && value.sceneId === sceneId
    && Number.isInteger(value.beatIndex)
    && value.beatIndex >= 0
    && value.beatIndex < beatCount;
  return valid ? { sceneId, beatIndex: value.beatIndex } : { sceneId, beatIndex: 0 };
}

export function createMinimalStateStore(storage) {
  if (storage === undefined) {
    try {
      storage = globalThis.sessionStorage;
    } catch {
      storage = null;
    }
  }

  let memory = null;
  let storageFailed = false;

  return {
    load(sceneId, beatCount) {
      if (!storageFailed) {
        try {
          const value = storage?.getItem(STORAGE_KEY);
          if (value !== null && value !== undefined) memory = JSON.parse(value);
        } catch {
          storageFailed = true;
        }
      }
      return normalizeMinimalState(memory, sceneId, beatCount);
    },
    save(state) {
      let serialized;
      try {
        serialized = JSON.stringify(state);
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
      }
    },
    clear() {
      memory = null;
      try {
        storage?.removeItem(STORAGE_KEY);
        storageFailed = false;
      } catch {
        storageFailed = true;
      }
    },
  };
}
