import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseChip,
  completeRun,
  createSession,
  createSessionStore,
  restartRun,
  tapVocabulary,
  updateSlots,
  visitScene,
} from "../src/session.js";

const start = "2026-08-07T10:00:00.000Z";

test("경로, 칩, 낱말, 결말과 완료 시각을 기록한다", () => {
  let session = createSession({ HERO: "지민" }, start);
  session = visitScene(session, "S00");
  session = visitScene(session, "S01");
  session = visitScene(session, "A1");
  session = chooseChip(session, "A1", "이 길 끝에 뭐가 있어?");
  session = tapVocabulary(session, "황급히");
  session = completeRun(session, "E1", "2026-08-07T10:04:20.000Z");
  assert.deepEqual(session.path, ["S00", "S01", "A1", "E1"]);
  assert.deepEqual(session.endingsSeen, ["E1"]);
  assert.equal(session.runs[0].completedAt, "2026-08-07T10:04:20.000Z");
  assert.deepEqual(session.runs[0].chipChoices, [{ sceneId: "A1", label: "이 길 끝에 뭐가 있어?" }]);
});

test("다시 하기는 수집 기록을 유지하고 새 실행을 연다", () => {
  const completed = completeRun(createSession({}, start), "E1", start);
  const replay = restartRun(completed, "2026-08-07T10:05:00.000Z");
  assert.deepEqual(replay.endingsSeen, ["E1"]);
  assert.equal(replay.runs[0].replayed, true);
  assert.equal(replay.runs.length, 2);
  assert.deepEqual(replay.path, []);
});

test("저장소 오류 시 메모리 폴백으로 저장한다", () => {
  const brokenStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const store = createSessionStore(brokenStorage);
  const session = createSession({}, start);
  store.save(session);
  assert.deepEqual(store.load(), session);
});

test("업데이터는 이전 세션과 실행 기록을 바꾸지 않는다", () => {
  const original = createSession({ HERO: "지민" }, start);
  const updated = chooseChip(visitScene(original, "S00"), "S00", "문을 연다");

  assert.notStrictEqual(updated, original);
  assert.deepEqual(original.path, []);
  assert.deepEqual(original.runs[0].path, []);
  assert.deepEqual(original.runs[0].chipChoices, []);
  assert.deepEqual(updated.path, ["S00"]);
  assert.deepEqual(updated.runs[0].chipChoices, [{ sceneId: "S00", label: "문을 연다" }]);
});

test("슬롯 갱신은 정규화하고 관찰 기록을 보존한다", () => {
  const completed = completeRun(createSession({ HERO: "지민" }, start), "E1", start);
  const updated = updateSlots(completed, { HERO: "Alice", TREAT: "젤리" });

  assert.deepEqual(updated.slots, { HERO: "앨리스", TREAT: "젤리", PET: "강아지", COLOR: "파랑" });
  assert.deepEqual(updated.endingsSeen, ["E1"]);
  assert.deepEqual(updated.runs, completed.runs);
  assert.notStrictEqual(updated.runs, completed.runs);
});

test("완료한 결말과 낱말은 한 번만 기록한다", () => {
  const tapped = tapVocabulary(createSession({}, start), "황급히");
  const tappedAgain = tapVocabulary(tapped, "황급히");
  const session = completeRun(
    completeRun(tappedAgain, "E1", start),
    "E1",
    "2026-08-07T10:01:00.000Z",
  );

  assert.notStrictEqual(tappedAgain, tapped);
  assert.deepEqual(session.path, ["E1"]);
  assert.deepEqual(session.endingsSeen, ["E1"]);
  assert.deepEqual(session.vocabTapped, ["황급히"]);
  assert.deepEqual(session.runs[0].path, ["E1"]);
  assert.equal(session.runs[0].completedAt, "2026-08-07T10:01:00.000Z");
});

test("잘못된 저장 데이터는 무시하고 clear는 메모리도 비운다", () => {
  const values = new Map([["alice-branching-mvp/session-v1", "not json"]]);
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  const store = createSessionStore(storage);
  const session = createSession({}, start);

  assert.equal(store.load(), null);
  store.save(session);
  store.clear();
  assert.equal(store.load(), null);
});

test("삭제 오류 뒤에는 오래된 저장소 값 대신 메모리를 사용한다", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem() { throw new Error("blocked"); },
  };
  const store = createSessionStore(storage);

  store.save(createSession({}, start));
  store.clear();

  assert.equal(store.load(), null);
});

test("기본 저장소 접근이 막혀도 메모리 폴백을 만든다", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("SecurityError"); },
  });

  try {
    const store = createSessionStore();
    const session = createSession({}, start);
    store.save(session);
    assert.deepEqual(store.load(), session);
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    else delete globalThis.localStorage;
  }
});
