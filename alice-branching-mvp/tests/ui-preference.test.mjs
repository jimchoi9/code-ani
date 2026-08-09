import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_UI_ID,
  createUiPreferenceStore,
  normalizeUiPreference,
} from "../src/ui-preference.js";

function storageDouble(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

test("UI 선택은 지원 ID만 저장하고 기본값으로 복구한다", () => {
  const storage = storageDouble();
  const store = createUiPreferenceStore(storage);

  assert.equal(DEFAULT_UI_ID, "visual-novel");
  assert.equal(normalizeUiPreference("current"), "current");
  assert.equal(normalizeUiPreference("minimal"), "minimal");
  assert.equal(normalizeUiPreference("unknown"), "visual-novel");
  assert.equal(store.load(), "visual-novel");
  assert.equal(store.save("minimal"), "minimal");
  assert.equal(createUiPreferenceStore(storage).load(), "minimal");
  assert.equal(store.save("unknown"), "visual-novel");
});

test("저장소 접근 실패 시 메모리 선택을 유지한다", () => {
  const store = createUiPreferenceStore({
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  });

  assert.equal(store.load(), "visual-novel");
  assert.equal(store.save("current"), "current");
  assert.equal(store.load(), "current");
});

test("UI 저장은 기존 이야기 세션 데이터를 덮어쓰지 않는다", () => {
  const storage = storageDouble({ "alice-branching-mvp/session-v1": "story-session" });
  createUiPreferenceStore(storage).save("current");

  assert.equal(storage.getItem("alice-branching-mvp/session-v1"), "story-session");
  assert.equal(storage.getItem("alice-branching-mvp/ui-preference-v1"), "current");
});
