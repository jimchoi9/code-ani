import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { visualNovelAssets } from "../assets/visual-novel/manifest.js";
import {
  SUPPORTED_UI_IDS,
  createCompareLinks,
  getUiRenderer,
  parseUiVariant,
} from "../src/ui-variant.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

test("비주얼노벨 mock manifest의 로컬 SVG 파일과 장면 매핑이 유효하다", () => {
  const urls = [
    ...Object.values(visualNovelAssets.backgrounds),
    ...Object.values(visualNovelAssets.characters),
  ];

  assert.equal(urls.length, 10);
  for (const url of urls) {
    assert.match(url, /^\.\/assets\/visual-novel\/.+\.svg$/);
    assert.ok(fs.existsSync(path.join(root, url.replace(/^\.\//, ""))), url);
  }

  for (const [sceneId, backgroundKey] of Object.entries(visualNovelAssets.sceneBackgrounds)) {
    assert.ok(visualNovelAssets.backgrounds[backgroundKey], `${sceneId}: ${backgroundKey}`);
  }
  for (const [sceneId, characterKey] of Object.entries(visualNovelAssets.sceneCharacters)) {
    assert.ok(visualNovelAssets.characters[characterKey], `${sceneId}: ${characterKey}`);
  }
  assert.deepEqual(visualNovelAssets.sceneBackgrounds, {
    S00: "rabbitHole", S01: "tinyGarden", A1: "cheshireTree", A3: "teaParty",
    S02: "giantLand", B2: "giantMushroom", E1: "cheshireTree", E3: "teaParty", E5: "giantLand",
  });
  assert.deepEqual(visualNovelAssets.sceneCharacters, {
    S00: "rabbit", A1: "cat", A3: "hatter", B2: "caterpillar",
  });
  assert.deepEqual(visualNovelAssets.endingTones, {
    E1: "curiosity", E3: "joy", E5: "confidence",
  });
});

test("비주얼노벨 production asset requirements는 열 개의 최종 파일을 명시한다", () => {
  const requirements = fs.readFileSync(
    path.join(root, "assets/visual-novel/ASSET_REQUIREMENTS.md"),
    "utf8",
  );

  for (const filename of [
    "rabbit-hole.webp",
    "tiny-garden.webp",
    "cheshire-tree.webp",
    "tea-party.webp",
    "giant-land.webp",
    "giant-mushroom.webp",
    "white-rabbit.png",
    "cheshire-cat.png",
    "mad-hatter.png",
    "caterpillar.png",
  ]) {
    assert.match(requirements, new RegExp(`\\b${filename.replace(".", "\\.")}\\b`));
  }
});
