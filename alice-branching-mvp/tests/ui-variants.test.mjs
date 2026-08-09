import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getVisualNovelArtUrl } from "../assets/visual-novel/manifest.js";
import { renderCompareMenu } from "../src/app.js";
import { createSession } from "../src/session.js";
import { resolveScene, story } from "../src/story-data.js";
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
  ...createSession({ HERO: "지민", TREAT: "젤리", PET: "토끼" }),
  path: ["S00", "S01", "A1"],
  storyState: { encounterId: "A1", gardenEntry: "SECRET", endingVariation: "TRUTH" },
};
const visualNovelEndingSession = {
  ...visualNovelSession,
  path: ["S00", "S01", "A1", "E1"],
  chipChoices: [{ sceneId: "A1", label: "이 길 끝에 뭐가 있어?" }],
  endingsSeen: ["E1"],
};

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

test("삽화 플레이스홀더는 회색 화면 중앙에 이미지 키만 표시한다", () => {
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const rule = styles.match(/\.story-art-placeholder\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(rule, /display:\s*grid/);
  assert.match(rule, /place-items:\s*center/);
  assert.match(rule, /background:\s*#bdbdbd/);
  assert.match(rule, /text-align:\s*center/);
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
  assert.match(html, /scene-door_cat_meet/);
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
  assert.match(view.text, /먹음직스러운 젤리/);
  assert.doesNotMatch(html, /data-reader-action="next-beat"/);
  assert.doesNotMatch(html, /data-action="next-beat"/);
  assert.match(html, /data-action="vocab"/);
  assert.match(html, /data-action="choose"/);
});

test("미니멀 결말은 N\/6 텍스트와 마지막 beat 이후 다시 시작을 제공한다", () => {
  const html = getUiRenderer("minimal").renderEnding(
    story.scenes.E1,
    visualNovelEndingSession,
    { minimalState: { sceneId: "E1", beatIndex: 999 } },
  );

  assert.match(html, /지금까지 만난 결말 1\/6/);
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

test("비주얼노벨은 POV 삽화, 이름표, 선택 카드와 7단계 트레일을 렌더링한다", () => {
  const renderer = getUiRenderer("visual-novel");
  const html = renderer.renderScene(story.scenes.A1, visualNovelSession, "나무 위 웃음소리로 간다");

  assert.equal(renderer.id, "visual-novel");
  assert.match(html, /data-ui="visual-novel"/);
  assert.match(html, /<img class="vn-art-placeholder story-art-placeholder story-art-image"/);
  assert.match(html, /src="\.\/assets\/visual-novel\/scenes\/door_cat_meet\.jpg"/);
  assert.match(html, /data-art-key="door_cat_meet"/);
  assert.doesNotMatch(html, /aria-label="삽화:/);
  assert.match(html, /체셔 고양이/);
  assert.match(html, /class="vn-choice/);
  assert.equal((html.match(/class="vn-trail-card/g) ?? []).length, 7);
  assert.match(html, /aria-label="진행 3\/7"/);
  assert.match(html, /data-action="choose-chip"/);
  assert.match(html, /data-chip-label="이 길 끝에 뭐가 있어\?"/);
});

test("비주얼노벨 전체 화면은 실제 모험 상태를 표시하는 게임 프레임을 사용한다", () => {
  const renderer = getUiRenderer("visual-novel");
  const setupHtml = renderer.renderSetup(visualNovelSession.slots);
  const sceneHtml = renderer.renderScene(story.scenes.S00, visualNovelSession);
  const endingHtml = renderer.renderEnding(story.scenes.E1, visualNovelEndingSession);
  const recoveryHtml = renderer.renderRecovery();

  for (const html of [setupHtml, sceneHtml, endingHtml, recoveryHtml]) {
    assert.match(html, /class="vn-game-frame"/);
    assert.match(html, /class="vn-game-hud"/);
    assert.match(html, /class="vn-title-plaque"/);
    assert.match(html, /class="vn-game-footer"/);
  }
  assert.match(sceneHtml, /STORY Lv\. 3/);
  assert.match(sceneHtml, /진행 <strong>1\/7<\/strong>/);
  assert.match(endingHtml, /결말 <strong>1\/6<\/strong>/);
  assert.doesNotMatch(sceneHtml, /data-action="(?:inventory|quest|settings|currency)"/);
});

test("테스트 모드 비주얼노벨만 참가자 코드와 진행자 도구와 결말 재도전을 제공한다", () => {
  const renderer = getUiRenderer("visual-novel");
  const context = { testMode: true, participantId: "C01", eventCount: 7 };
  const setup = renderer.renderSetup(visualNovelSession.slots, context);
  const ending = renderer.renderEnding(story.scenes.E1, visualNovelEndingSession, context);
  const tools = renderer.renderTestTools(context);
  const normalSetup = renderer.renderSetup(visualNovelSession.slots);
  const normalEnding = renderer.renderEnding(story.scenes.E1, visualNovelEndingSession);

  assert.match(setup, /name="PARTICIPANT_ID"/);
  assert.match(setup, /pattern="\[A-Za-z0-9_-\]\+"/);
  assert.match(setup, /data-action="start-onboarding"/);
  assert.doesNotMatch(setup, /name="HERO"|data-slot="PET"/);
  assert.match(ending, /data-action="other-ending"/);
  assert.match(ending, /다른 결말도 찾아볼래!/);
  assert.match(ending, /data-action="finish-adventure"/);
  assert.match(tools, />C01</);
  assert.match(tools, /이벤트 7개/);
  assert.match(tools, /data-action="test-download"/);
  assert.match(tools, /data-action="test-reset"/);
  assert.doesNotMatch(normalSetup, /PARTICIPANT_ID/);
  assert.doesNotMatch(normalEnding, /other-ending|finish-adventure/);
});

test("시계토끼 온보딩은 누적 대화와 추천 답장과 직접 입력을 제공한다", () => {
  const renderer = getUiRenderer("visual-novel");
  const chat = renderer.renderOnboarding({
    testMode: true,
    onboarding: { step: "friend", answers: { HERO: "지민", TREAT: "젤리" } },
  });
  const typing = renderer.renderOnboarding({
    testMode: true,
    onboardingTyping: true,
    onboarding: { step: "snack", answers: { HERO: "지민" } },
  });
  const confirm = renderer.renderOnboarding({
    testMode: true,
    onboarding: { step: "confirm", answers: { HERO: "지민", PET: "토끼", TREAT: "젤리" } },
  });

  assert.match(chat, /시계토끼/);
  assert.match(chat, /지민.*어떤 간식을 넣을까.*젤리.*마지막 질문.*함께 모험할 친구/s);
  assert.match(chat, /data-value="토끼"/);
  assert.doesNotMatch(chat, /좋아하는 색|data-value="파랑"/);
  assert.match(chat, /data-action="onboarding-answer"/);
  assert.match(typing, /vn-chat-typing/);
  assert.doesNotMatch(typing, /추천 답장/);
  assert.match(confirm, /지민.*젤리.*토끼/s);
  assert.match(confirm, /data-action="onboarding-confirm"/);
});

test("비주얼노벨 테스트 완료 화면은 아이의 성취와 진행자 작업을 분리한다", () => {
  const renderer = getUiRenderer("visual-novel");
  const complete = renderer.renderComplete(visualNovelEndingSession, story.scenes.E1, {
    testMode: true,
    participantId: "C01",
    testCompleted: false,
  });
  const saved = renderer.renderComplete(visualNovelEndingSession, story.scenes.E1, {
    testMode: true,
    participantId: "C01",
    testCompleted: true,
  });

  assert.match(complete, /모험 완료!/);
  assert.match(complete, /오늘의 모험/);
  assert.match(complete, /호기심의 조각/);
  assert.match(complete, /진행자용 테스트 도구/);
  assert.match(complete, /data-action="complete-test"/);
  assert.match(complete, /data-action="back-to-ending"/);
  assert.match(saved, /테스트 기록을 저장했어요/);
  assert.match(saved, /data-action="new-participant"/);
  assert.doesNotMatch(saved, /data-action="complete-test"/);
});

test("새 결말 보상은 결말별 이야기 조각 카드와 열두 개의 빛 조각을 렌더링한다", () => {
  const renderer = getUiRenderer("visual-novel");
  const rewarded = renderer.renderEnding(story.scenes.E1, visualNovelEndingSession, {
    storyReward: { endingId: "E1", count: 1 },
  });
  const restored = renderer.renderEnding(story.scenes.E1, visualNovelEndingSession);

  assert.match(rewarded, /class="vn-reward-overlay"[^>]*data-reward-tone="curiosity"/);
  assert.match(rewarded, /호기심의 조각/);
  assert.match(rewarded, /이야기 조각 <strong>1\/6<\/strong>/);
  assert.equal((rewarded.match(/class="vn-reward-particle"/g) ?? []).length, 12);
  assert.match(rewarded, /data-action="dismiss-reward"/);
  assert.doesNotMatch(restored, /vn-reward-overlay/);
});

test("비주얼노벨 결말은 실제 삽화와 결말 톤과 7\/7을 표시한다", () => {
  const html = getUiRenderer("visual-novel").renderEnding(story.scenes.E1, visualNovelEndingSession);

  assert.match(html, /src="\.\/assets\/visual-novel\/endings\/end_curiosity\.jpg"/);
  assert.match(html, /data-art-key="end_curiosity"/);
  assert.match(html, /data-ending-tone="curiosity"/);
  assert.match(html, /aria-label="진행 7\/7"/);
  assert.match(html, /data-action="restart"/);
});

test("비주얼노벨 진행과 화자는 장면 계약에 맞춘다", () => {
  assert.equal(getVisualNovelProgress(visualNovelSession, story.scenes.S00), 1);
  assert.equal(getVisualNovelProgress(visualNovelSession, story.scenes.A1), 3);
  assert.equal(getVisualNovelProgress(visualNovelSession, story.scenes.C1), 5);
  assert.equal(getVisualNovelProgress(visualNovelSession, story.scenes.C2), 6);
  assert.equal(getVisualNovelProgress(visualNovelEndingSession, story.scenes.E1), 7);
  assert.equal(getVisualNovelProgress(visualNovelSession, null), 0);
  assert.deepEqual(getVisualNovelSpeaker(story.scenes.S00), { id: "rabbit", label: "하얀 토끼" });
  assert.deepEqual(getVisualNovelSpeaker(story.scenes.A1), { id: "cat", label: "체셔 고양이" });
  assert.deepEqual(getVisualNovelSpeaker(story.scenes.S02), { id: "narrator", label: "서술자" });
  assert.deepEqual(getVisualNovelSpeaker(story.scenes.E1), { id: "ending", label: "결말" });
});

test("비주얼노벨 스타일은 게임 프레임, 화자 색상, ending overlay를 제공한다", () => {
  const styles = fs.readFileSync(path.join(root, "styles/visual-novel.css"), "utf8");

  assert.match(styles, /\[data-ui="visual-novel"\][^{]*\{[^}]*min-height:\s*100svh/);
  assert.match(styles, /\.vn-stage\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*58svh\)\s+minmax\(0,\s*42svh\)/);
  assert.match(styles, /\.vn-sprite\s*\{[^}]*max-height:\s*88%/);
  assert.match(styles, /\.vn-game-frame\s*\{[^}]*width:\s*min\(100%,\s*620px\)/);
  assert.match(styles, /\.vn-title-plaque\s*\{[^}]*--vn-gold|\.vn-title-plaque\s*\{[^}]*border:\s*1px solid var\(--vn-gold\)/);
  assert.match(styles, /\.vn-game-frame\s+\.vn-dialogue\s*\{[^}]*background:\s*linear-gradient/);
  assert.match(styles, /\.vn-game-frame\s+\.vn-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
  assert.match(styles, /\.vn-game-frame\s+\.vn-choice\s*\{[^}]*border:\s*1px solid #5bd6ed[^}]*background:\s*linear-gradient\(180deg,\s*#179dd0,\s*#0872aa\)/);
  assert.doesNotMatch(styles, /\.vn-game-frame\s+\.vn-choice:nth-child\(even\)/);
  assert.match(styles, /\.vn-nameplate--rabbit\s*\{[^}]*#c9364f/);
  assert.match(styles, /\.vn-nameplate--cat\s*\{[^}]*#7350a2/);
  assert.match(styles, /\.vn-nameplate--hatter\s*\{[^}]*#147aa0/);
  assert.match(styles, /\.vn-nameplate--caterpillar\s*\{[^}]*#327347/);
  assert.match(styles, /\[data-ending-tone="curiosity"\]\s+\.vn-background::after/);
  assert.match(styles, /@media\s*\(min-width:\s*900px\)/);
  assert.match(styles, /@media\s*\(hover:\s*hover\)/);
  assert.doesNotMatch(styles, /assets\/visual-novel/);
});

test("세 UI는 모든 장면에서 같은 실제 POV 이미지 계약을 사용한다", () => {
  const samples = story.sceneOrder.map(sceneId => {
    const scene = story.scenes[sceneId];
    const session = scene.type === "ending"
      ? { ...visualNovelEndingSession, endingsSeen: [scene.id] }
      : visualNovelSession;
    return { scene, session, key: scene.art };
  });
  samples.push({
    scene: resolveScene("C2", {
      ...visualNovelSession,
      storyState: { encounterId: "B3", gardenEntry: "GUEST" },
    }),
    session: visualNovelSession,
    key: "queen_garden_trial_big",
  });

  assert.deepEqual(
    new Set(samples.map(sample => sample.key)),
    new Set([
      "start_rabbit_hole",
      "door_shrink",
      "cake_grow",
      "door_cat_meet",
      "door_caterpillar_meet",
      "door_hatter_meet",
      "cake_cat_meet",
      "cake_caterpillar_meet",
      "cake_hatter_meet",
      "mist_hill_grin",
      "queen_garden_trial_small",
      "queen_garden_trial_big",
      "end_curiosity",
      "end_prudence",
      "end_cheer",
      "end_composure",
      "end_selftrust",
      "end_warmth",
    ]),
  );

  for (const rendererId of ["current", "minimal", "visual-novel"]) {
    const renderer = getUiRenderer(rendererId);
    for (const sample of samples) {
      const html = sample.scene.type === "ending"
        ? renderer.renderEnding(sample.scene, sample.session, { minimalState: { sceneId: sample.scene.id, beatIndex: 0 } })
        : renderer.renderScene(sample.scene, sample.session, null, { minimalState: { sceneId: sample.scene.id, beatIndex: 0 } });
      const url = getVisualNovelArtUrl(sample.key);
      assert.ok(url?.endsWith(".jpg"), sample.key);
      assert.equal(fs.existsSync(path.resolve(root, url.replace(/^\.\//, ""))), true, url);
      assert.match(html, /<img[^>]*class="[^"]*story-art-image/);
      assert.match(html, new RegExp(`src="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
      assert.match(html, new RegExp(`data-art-key="${sample.key}"`));
      assert.match(html, /alt=""/);
      assert.doesNotMatch(html, /aria-label="삽화:/);
    }
  }
});

test("결말 변주는 선택에 맞는 실제 스폿 이미지를 렌더링한다", () => {
  const renderer = getUiRenderer("visual-novel");
  for (const [variation, spotArt] of Object.entries({ TRUTH: "spot_truth", SHIELD: "spot_shield", TURN: "spot_turn" })) {
    const scene = resolveScene("E1", { storyState: { encounterId: "A1", endingVariation: variation } });
    const html = renderer.renderEnding(scene, visualNovelEndingSession, { testMode: true });
    const url = getVisualNovelArtUrl(spotArt);
    assert.equal(scene.spotArt, spotArt);
    assert.equal(fs.existsSync(path.resolve(root, url.replace(/^\.\//, ""))), true);
    assert.match(html, new RegExp(`data-art-key="${spotArt}"`));
    assert.match(html, /class="[^"]*vn-variation-spot-image/);
  }
});
