import assert from "node:assert/strict";
import test from "node:test";
import {
  createTestModeStore,
  isTestMode,
  normalizeParticipantId,
} from "../src/test-mode.js";

function storageDouble(initial = null, throws = false) {
  let value = initial;
  return {
    get value() { return value; },
    getItem() { if (throws) throw new Error("blocked"); return value; },
    setItem(_key, next) { if (throws) throw new Error("blocked"); value = next; },
    removeItem() { if (throws) throw new Error("blocked"); value = null; },
  };
}

test("test=1만 테스트 모드이고 참가자 코드를 안전하게 정규화한다", () => {
  assert.equal(isTestMode("?test=1"), true);
  assert.equal(isTestMode("?ui=current&test=1&compare=1"), true);
  assert.equal(isTestMode("?test=0"), false);
  assert.equal(normalizeParticipantId(" c-01_가 "), "C-01_");
  assert.equal(normalizeParticipantId("abcdefghijklmnop"), "ABCDEFGHIJKL");
});

test("새 참가자는 이전 기록을 교체하고 경과 시간과 장면 정보를 기록한다", () => {
  const times = [
    "2026-08-09T10:00:00.000Z",
    "2026-08-09T10:00:00.000Z",
    "2026-08-09T10:00:02.500Z",
  ];
  const storage = storageDouble();
  const store = createTestModeStore(storage, () => times.shift());

  store.start("c01");
  store.record("choice_selected", { sceneId: "S00", choice: "문을 연다" });
  const record = store.load();

  assert.equal(record.participantId, "C01");
  assert.equal(record.events.length, 2);
  assert.equal(record.events[0].type, "test_started");
  assert.equal(record.events[1].elapsedMs, 2500);
  assert.equal(record.events[1].sceneId, "S00");
  assert.equal(record.events[1].choice, "문을 연다");
  assert.deepEqual(record.onboarding, { step: "name", answers: {} });
});

test("테스트 이벤트는 설정에서 선택한 UI를 기록한다", () => {
  const store = createTestModeStore(
    storageDouble(),
    () => "2026-08-09T10:00:00.000Z",
    "minimal",
  );

  store.start("C06");

  assert.equal(store.load().events[0].ui, "minimal");
});

test("채팅 온보딩 답변과 현재 질문을 저장하고 복원한다", () => {
  const storage = storageDouble();
  const store = createTestModeStore(storage, () => "2026-08-09T10:00:00.000Z");
  store.start("C04");
  store.saveOnboarding({
    step: "friend",
    answers: { HERO: "지민", TREAT: "젤리" },
    age: 9,
    level: "easy",
  });

  const restored = createTestModeStore(storage, () => "2026-08-09T10:00:01.000Z").load();
  assert.deepEqual(restored.onboarding, {
    step: "friend",
    answers: { HERO: "지민", TREAT: "젤리" },
    age: 9,
    level: "easy",
  });
});

test("잘못된 나이 오류와 기존 나이대 데이터도 저장하고 복원한다", () => {
  const storage = storageDouble();
  const store = createTestModeStore(storage, () => "2026-08-09T10:00:00.000Z");
  store.start("C04");
  store.saveOnboarding({
    step: "age",
    answers: { HERO: "지민" },
    validationError: "나이는 1 이상의 숫자로 입력해 줘.",
  });
  assert.equal(store.load().onboarding.validationError, "나이는 1 이상의 숫자로 입력해 줘.");

  store.saveOnboarding({
    step: "confirm",
    answers: { HERO: "지민", TREAT: "젤리", PET: "토끼" },
    ageGroup: "9살 이하",
    level: "easy",
  });
  assert.equal(store.load().onboarding.ageGroup, "9살 이하");
});

test("내보내기 스냅샷은 테스트 기록과 이야기 세션을 복제한다", () => {
  const store = createTestModeStore(storageDouble(), () => "2026-08-09T10:00:00.000Z");
  store.start("C02");
  const session = { path: ["S00"], endingsSeen: ["E1"] };
  const exported = store.exportSnapshot(session);
  exported.storySession.path.push("BROKEN");

  assert.equal(exported.schemaVersion, 1);
  assert.equal(exported.participant.participantId, "C02");
  assert.deepEqual(session.path, ["S00"]);
});

test("저장소 접근이 막혀도 메모리로 기록하고 clear한다", () => {
  const store = createTestModeStore(storageDouble(null, true), () => "2026-08-09T10:00:00.000Z");
  store.start("C03");
  assert.equal(store.load().participantId, "C03");
  store.clear();
  assert.equal(store.load(), null);
});
