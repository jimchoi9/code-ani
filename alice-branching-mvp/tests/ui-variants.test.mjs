import assert from "node:assert/strict";
import test from "node:test";
import {
  SUPPORTED_UI_IDS,
  createCompareLinks,
  getUiRenderer,
  parseUiVariant,
} from "../src/ui-variant.js";

test("지원 UI와 잘못된 query 폴백을 결정한다", () => {
  assert.deepEqual(SUPPORTED_UI_IDS, ["current", "visual-novel", "minimal"]);
  assert.equal(parseUiVariant("?ui=visual-novel"), "visual-novel");
  assert.equal(parseUiVariant("?ui=minimal&compare=1"), "minimal");
  assert.equal(parseUiVariant("?ui=unknown"), "current");
  assert.equal(parseUiVariant(""), "current");
});

test("비교 링크는 compare=1과 다른 query를 보존한다", () => {
  assert.deepEqual(createCompareLinks("?ui=current&compare=1"), [
    { id: "current", href: "?ui=current&compare=1" },
    { id: "visual-novel", href: "?ui=visual-novel&compare=1" },
    { id: "minimal", href: "?ui=minimal&compare=1" },
  ]);
});

test("current renderer는 기존 UI export를 그대로 제공한다", () => {
  const renderer = getUiRenderer("current");
  assert.equal(renderer.id, "current");
  for (const key of ["renderSetup", "renderScene", "renderChipResponse", "renderEnding", "renderRecovery", "renderVocabularyPanel"]) {
    assert.equal(typeof renderer[key], "function", key);
  }
});

test("current chip response renderer는 기존 상태 계약으로 장면을 렌더링한다", () => {
  const renderer = getUiRenderer("current");
  const html = renderer.renderChipResponse({
    sceneId: "A1",
    chipResponse: { label: "질문", response: "대답" },
  });

  assert.match(html, /chip-response-screen/);
  assert.match(html, /scene-cheshire-tree/);
  assert.match(html, />질문<\/h1>/);
  assert.match(html, />대답<\/p>/);
});
