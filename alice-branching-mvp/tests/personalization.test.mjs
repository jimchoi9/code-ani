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
  }), { HERO: "지민", TREAT: "젤리", PET: "토끼" });
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
  assert.equal(selectParticle("곰", "은/는"), "은");
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

test("폐기된 색상 슬롯은 기본값과 템플릿에 남지 않는다", () => {
  assert.deepEqual(Object.keys(DEFAULT_SLOTS), ["HERO", "TREAT", "PET"]);
  assert.equal(renderTemplate("{COLOR} 조끼", { COLOR: "분홍" }), "{COLOR} 조끼");
});

test("슬롯 바로 뒤의 고정 조사는 저작 오류로 거부한다", () => {
  for (const template of [
    "{HERO}는 출발했어요.",
    "{HERO}가 웃었어요.",
    "{HERO}를 불렀어요.",
    "{PET}은 기다렸어요.",
  ]) {
    assert.throws(
      () => renderTemplate(template, { HERO: "지민", PET: "토끼" }),
      /조사 토큰/,
      template,
    );
  }
});
