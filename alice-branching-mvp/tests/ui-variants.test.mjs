import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { visualNovelAssets } from "../assets/visual-novel/manifest.js";
import { renderCompareMenu } from "../src/app.js";
import { createSession } from "../src/session.js";
import { story } from "../src/story-data.js";
import {
  SUPPORTED_UI_IDS,
  createCompareLinks,
  getVisualNovelProgress,
  getVisualNovelSpeaker,
  getUiRenderer,
  parseUiVariant,
} from "../src/ui-variant.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const visualNovelSession = {
  ...createSession({ HERO: "지민", TREAT: "젤리", PET: "토끼", COLOR: "파랑" }),
  path: ["S00", "S01", "A1"],
};
const visualNovelEndingSession = {
  ...visualNovelSession,
  path: ["S00", "S01", "A1", "E1"],
  chipChoices: [{ sceneId: "A1", label: "이 길 끝에 뭐가 있어?" }],
  endingsSeen: ["E1"],
};

const visualNovelAssetUrls = {
  backgrounds: {
    rabbitHole: [
      "./assets/visual-novel/backgrounds/rabbit-hole.svg",
      "./assets/visual-novel/backgrounds/rabbit-hole.webp",
    ],
    tinyGarden: [
      "./assets/visual-novel/backgrounds/tiny-garden.svg",
      "./assets/visual-novel/backgrounds/tiny-garden.webp",
    ],
    cheshireTree: [
      "./assets/visual-novel/backgrounds/cheshire-tree.svg",
      "./assets/visual-novel/backgrounds/cheshire-tree.webp",
    ],
    teaParty: [
      "./assets/visual-novel/backgrounds/tea-party.svg",
      "./assets/visual-novel/backgrounds/tea-party.webp",
    ],
    giantLand: [
      "./assets/visual-novel/backgrounds/giant-land.svg",
      "./assets/visual-novel/backgrounds/giant-land.webp",
    ],
    giantMushroom: [
      "./assets/visual-novel/backgrounds/giant-mushroom.svg",
      "./assets/visual-novel/backgrounds/giant-mushroom.webp",
    ],
  },
  characters: {
    rabbit: [
      "./assets/visual-novel/characters/white-rabbit.svg",
      "./assets/visual-novel/characters/white-rabbit.png",
    ],
    cat: [
      "./assets/visual-novel/characters/cheshire-cat.svg",
      "./assets/visual-novel/characters/cheshire-cat.png",
    ],
    hatter: [
      "./assets/visual-novel/characters/mad-hatter.svg",
      "./assets/visual-novel/characters/mad-hatter.png",
    ],
    caterpillar: [
      "./assets/visual-novel/characters/caterpillar.svg",
      "./assets/visual-novel/characters/caterpillar.png",
    ],
  },
};

function assertVisualNovelAssetUrls(assets) {
  assert.deepEqual(Object.keys(assets.backgrounds), Object.keys(visualNovelAssetUrls.backgrounds));
  assert.deepEqual(Object.keys(assets.characters), Object.keys(visualNovelAssetUrls.characters));

  const urls = [
    ...Object.values(assets.backgrounds),
    ...Object.values(assets.characters),
  ];
  assert.equal(urls.length, 10);
  assert.equal(new Set(urls).size, 10);

  for (const [category, assetUrls] of Object.entries(visualNovelAssetUrls)) {
    for (const [assetKey, allowedUrls] of Object.entries(assetUrls)) {
      assert.ok(allowedUrls.includes(assets[category][assetKey]), `${category}.${assetKey}`);
    }
  }
}

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

test("비교 메뉴는 compare=1에서만 현재 UI를 표시한다", () => {
  assert.equal(renderCompareMenu("?ui=minimal", "minimal"), "");

  const html = renderCompareMenu("?ui=minimal&compare=1&session=keep", "minimal");
  assert.match(html, /<nav class="compare-menu" aria-label="UI 비교">/);
  assert.match(html, /href="\?ui=current&amp;compare=1&amp;session=keep"/);
  assert.match(html, /href="\?ui=minimal&amp;compare=1&amp;session=keep"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /href="\?ui=current[^>]*aria-current="page"/);
});

test("비교 메뉴 스타일은 고정 44px 높이와 UI root 여백을 제공한다", () => {
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

  assert.match(styles, /\.compare-menu\s*\{[^}]*position:\s*fixed/);
  assert.match(styles, /\.compare-menu\s*\{[^}]*height:\s*44px/);
  assert.match(styles, /#app\[data-compare="true"\]\s*\{[^}]*padding-top:\s*44px/);
});

test("current 변형 스타일은 current UI root를 정의한다", () => {
  const styles = fs.readFileSync(path.join(root, "styles/current.css"), "utf8");

  assert.match(styles, /\[data-ui="current"\]\s*\{[^}]*min-height:\s*100svh/);
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

test("미니멀 UI는 중간 beat에서 다음 표시만 보여준다", () => {
  const renderer = getUiRenderer("minimal");
  const html = renderer.renderScene(
    story.scenes.S00,
    visualNovelSession,
    null,
    { minimalState: { sceneId: "S00", beatIndex: 0 } },
  );

  assert.match(html, /data-ui="minimal"/);
  assert.match(html, /data-reader-action="next-beat"/);
  assert.match(html, /class="minimal-beat"[^>]*data-focus-target[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /data-action="next-beat"/);
  assert.doesNotMatch(html, /data-action="choose"/);
  assert.doesNotMatch(html, /낱말 살펴보기/);
});

test("미니멀 UI는 마지막 beat에서만 낱말과 선택지를 보여준다", () => {
  const renderer = getUiRenderer("minimal");
  const view = renderer.createView(story.scenes.S00, visualNovelSession, {
    sceneId: "S00",
    beatIndex: 999,
  });
  const html = renderer.renderScene(
    story.scenes.S00,
    visualNovelSession,
    null,
    { minimalState: { sceneId: "S00", beatIndex: view.beats.length - 1 } },
  );

  assert.equal(view.beatIndex, view.beats.length - 1);
  assert.equal(view.isLastBeat, true);
  assert.match(view.text, /지민 앞에는/);
  assert.doesNotMatch(html, /data-reader-action="next-beat"/);
  assert.doesNotMatch(html, /data-action="next-beat"/);
  assert.match(html, /data-action="vocab"/);
  assert.match(html, /data-action="choose"/);
});

test("미니멀 결말은 N\/3 텍스트와 마지막 beat 이후 다시 시작을 제공한다", () => {
  const html = getUiRenderer("minimal").renderEnding(
    story.scenes.E1,
    visualNovelEndingSession,
    { minimalState: { sceneId: "E1", beatIndex: 999 } },
  );

  assert.match(html, /지금까지 만난 결말 1\/3/);
  assert.match(html, /data-action="restart"/);
});

test("미니멀 스타일은 읽기 열, 장면 색조, 선택지와 motion 접근성을 제공한다", () => {
  const styles = fs.readFileSync(path.join(root, "styles/minimal-text.css"), "utf8");

  assert.match(styles, /\[data-ui="minimal"\][^{]*\{[^}]*min-height:\s*100svh/);
  assert.match(styles, /\.minimal-reader\s*\{[^}]*width:\s*min\(68vw,\s*44rem\)/);
  assert.match(styles, /\.minimal-reader\s*\{[^}]*padding-block:\s*20svh/);
  assert.match(styles, /\.minimal-beat\s*\{[^}]*font:\s*400\s+clamp\(18px,\s*2\.1vw,\s*20px\)\/1\.95/);
  assert.match(styles, /\.minimal-choice\s*\{[^}]*min-height:\s*48px/);
  assert.match(styles, /\.minimal-next\s*\{[^}]*width:\s*48px/);
  assert.match(styles, /\[data-ui="minimal"\]\[data-scene-id="S00"\][^{]*\{[^}]*--minimal-bg/);
  assert.match(styles, /@media\s*\(max-width:\s*600px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(styles, /url\(|assets\//);
});

test("비주얼노벨은 manifest 배경, 이름표, 캐릭터, 선택 카드와 5단계 트레일을 렌더링한다", () => {
  const renderer = getUiRenderer("visual-novel");
  const html = renderer.renderScene(story.scenes.A1, visualNovelSession, "나무 위 웃음소리로 간다");

  assert.equal(renderer.id, "visual-novel");
  assert.match(html, /data-ui="visual-novel"/);
  assert.match(html, new RegExp(visualNovelAssets.backgrounds.cheshireTree.replace(".", "\\.")));
  assert.match(html, new RegExp(visualNovelAssets.characters.cat.replace(".", "\\.")));
  assert.match(html, /alt=""/);
  assert.match(html, /체셔 고양이/);
  assert.match(html, /class="vn-choice/);
  assert.equal((html.match(/class="vn-trail-card/g) ?? []).length, 5);
  assert.match(html, /aria-label="진행 3\/5"/);
  assert.match(html, /data-action="choose-chip"/);
  assert.match(html, /data-chip-label="이 길 끝에 뭐가 있어\?"/);
});

test("비주얼노벨 결말은 manifest 배경을 재사용하고 결말 톤과 5\/5를 표시한다", () => {
  const html = getUiRenderer("visual-novel").renderEnding(story.scenes.E1, visualNovelEndingSession);

  assert.match(html, new RegExp(visualNovelAssets.backgrounds.cheshireTree.replace(".", "\\.")));
  assert.match(html, /data-ending-tone="curiosity"/);
  assert.match(html, /aria-label="진행 5\/5"/);
  assert.match(html, /data-action="restart"/);
});

test("비주얼노벨 진행과 화자는 장면 계약에 맞춘다", () => {
  assert.equal(getVisualNovelProgress(visualNovelSession, story.scenes.S00), 1);
  assert.equal(getVisualNovelProgress(visualNovelSession, story.scenes.A1), 3);
  assert.equal(getVisualNovelProgress(visualNovelEndingSession, story.scenes.E1), 5);
  assert.equal(getVisualNovelProgress(visualNovelSession, null), 0);
  assert.deepEqual(getVisualNovelSpeaker(story.scenes.S00), { id: "rabbit", label: "하얀 토끼" });
  assert.deepEqual(getVisualNovelSpeaker(story.scenes.A1), { id: "cat", label: "체셔 고양이" });
  assert.deepEqual(getVisualNovelSpeaker(story.scenes.S02), { id: "narrator", label: "서술자" });
  assert.deepEqual(getVisualNovelSpeaker(story.scenes.E1), { id: "ending", label: "결말" });
});

test("비주얼노벨 스타일은 반응형 무대, 화자 색상, ending overlay를 제공한다", () => {
  const styles = fs.readFileSync(path.join(root, "styles/visual-novel.css"), "utf8");

  assert.match(styles, /\[data-ui="visual-novel"\][^{]*\{[^}]*min-height:\s*100svh/);
  assert.match(styles, /\.vn-stage\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*58svh\)\s+minmax\(0,\s*42svh\)/);
  assert.match(styles, /\.vn-sprite\s*\{[^}]*max-height:\s*88%/);
  assert.match(styles, /\.vn-dialogue\s*\{[^}]*background:\s*rgba\(20,\s*24,\s*31,\s*\.94\)/);
  assert.match(styles, /\.vn-nameplate--rabbit\s*\{[^}]*#c9364f/);
  assert.match(styles, /\.vn-nameplate--cat\s*\{[^}]*#7350a2/);
  assert.match(styles, /\.vn-nameplate--hatter\s*\{[^}]*#147aa0/);
  assert.match(styles, /\.vn-nameplate--caterpillar\s*\{[^}]*#327347/);
  assert.match(styles, /\[data-ending-tone="curiosity"\]\s+\.vn-background::after/);
  assert.match(styles, /@media\s*\(min-width:\s*900px\)/);
  assert.match(styles, /@media\s*\(hover:\s*hover\)/);
  assert.doesNotMatch(styles, /assets\/visual-novel/);
});

test("비주얼노벨 manifest의 로컬 파일과 장면 매핑이 유효하다", () => {
  assertVisualNovelAssetUrls(visualNovelAssets);

  const urls = [...Object.values(visualNovelAssets.backgrounds), ...Object.values(visualNovelAssets.characters)];
  for (const url of urls) {
    assert.match(url, /^\.\/assets\/visual-novel\//);
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

test("비주얼노벨 manifest는 정확한 WebP/PNG production replacement URL을 허용한다", () => {
  const productionAssets = {
    ...visualNovelAssets,
    backgrounds: Object.fromEntries(
      Object.entries(visualNovelAssetUrls.backgrounds).map(([key, [, productionUrl]]) => [key, productionUrl]),
    ),
    characters: Object.fromEntries(
      Object.entries(visualNovelAssetUrls.characters).map(([key, [, productionUrl]]) => [key, productionUrl]),
    ),
  };

  assertVisualNovelAssetUrls(productionAssets);
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
