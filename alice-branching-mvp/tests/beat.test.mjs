import assert from "node:assert/strict";
import test from "node:test";
import {
  createBeats,
  createMinimalStateStore,
  normalizeMinimalState,
  splitSentences,
} from "../src/beat.js";

test("한국어 종결 부호와 인용문을 보존해 문장을 나눈다", () => {
  assert.deepEqual(splitSentences('토끼가 외쳤어요. "늦었어!" 아래로 떨어졌어요.'), [
    "토끼가 외쳤어요.",
    '"늦었어!"',
    "아래로 떨어졌어요.",
  ]);
});

test("한 beat에 최대 두 문장을 묶고 120자 초과 문장은 단독으로 둔다", () => {
  assert.deepEqual(createBeats("첫 문장이에요. 두 번째예요. 세 번째예요."), [
    "첫 문장이에요. 두 번째예요.",
    "세 번째예요.",
  ]);
  const long = `${"아주 ".repeat(35)}긴 문장이에요.`;
  assert.deepEqual(createBeats(`${long} 다음 문장이에요.`), [long, "다음 문장이에요."]);
});

test("빈 본문은 빈 배열이고 분리 불가능한 본문은 한 beat다", () => {
  assert.deepEqual(createBeats("   "), []);
  assert.deepEqual(createBeats("아래로 아래로"), ["아래로 아래로"]);
});

test("장면이 바뀌거나 범위를 벗어난 beat 상태는 처음으로 돌아간다", () => {
  assert.deepEqual(normalizeMinimalState({ sceneId: "S00", beatIndex: 2 }, "S00", 4), { sceneId: "S00", beatIndex: 2 });
  assert.deepEqual(normalizeMinimalState({ sceneId: "S00", beatIndex: 2 }, "S01", 3), { sceneId: "S01", beatIndex: 0 });
  assert.deepEqual(normalizeMinimalState({ sceneId: "S01", beatIndex: 99 }, "S01", 3), { sceneId: "S01", beatIndex: 0 });
});

test("sessionStorage 오류 시 현재 탭 메모리로 복구한다", () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  const store = createMinimalStateStore(broken);
  store.save({ sceneId: "S00", beatIndex: 1 });
  assert.deepEqual(store.load("S00", 3), { sceneId: "S00", beatIndex: 1 });
});

test("저장된 beat 뒤 JSON parse 오류는 현재 장면의 처음으로 돌아간다", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  const store = createMinimalStateStore(storage);

  store.save({ sceneId: "S00", beatIndex: 2 });
  values.set("alice-branching-mvp/minimal-ui-v1", "not json");

  assert.deepEqual(store.load("S00", 4), { sceneId: "S00", beatIndex: 0 });
});

test("sessionStorage getItem 오류 뒤에는 현재 탭의 beat를 유지한다", () => {
  const values = new Map();
  let blocked = false;
  const storage = {
    getItem(key) {
      if (blocked) throw new Error("blocked");
      return values.get(key) ?? null;
    },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  const store = createMinimalStateStore(storage);

  store.save({ sceneId: "S00", beatIndex: 1 });
  blocked = true;

  assert.deepEqual(store.load("S00", 3), { sceneId: "S00", beatIndex: 1 });
});
