import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SLOTS,
  normalizeSlots,
  renderTemplate,
  selectParticle,
} from "../src/personalization.js";

test("한글 2~6자 이름과 허용된 슬롯을 유지한다", () => {
  assert.deepEqual(normalizeSlots({
    HERO: "지민",
    TREAT: "젤리",
    PET: "토끼",
    COLOR: "분홍",
  }), { HERO: "지민", TREAT: "젤리", PET: "토끼", COLOR: "분홍" });
});

test("유효하지 않은 값은 기본값으로 바꾼다", () => {
  assert.deepEqual(normalizeSlots({
    HERO: "Alice",
    TREAT: "초콜릿",
    PET: "용",
    COLOR: "보라",
  }), DEFAULT_SLOTS);
});

test("받침 유무에 맞는 조사를 고른다", () => {
  assert.equal(selectParticle("붕어빵", "을/를"), "을");
  assert.equal(selectParticle("젤리", "을/를"), "를");
  assert.equal(selectParticle("강아지", "와/과"), "와");
  assert.equal(selectParticle("토끼", "이/가"), "가");
});

test("슬롯과 조사 토큰을 함께 치환한다", () => {
  const slots = normalizeSlots({ HERO: "지민", TREAT: "붕어빵" });
  assert.equal(
    renderTemplate("{HERO}{은/는} {TREAT}{을/를} 골랐어요.", slots),
    "지민은 붕어빵을 골랐어요.",
  );
});
