import assert from "node:assert/strict";
import test from "node:test";
import { renderTemplate } from "../src/personalization.js";
import { estimateRouteSeconds, getScene, story } from "../src/story-data.js";
import { getVocabulary, recordVocabulary } from "../src/vocabulary.js";

function destinations(scene) {
  return [
    ...[...(scene.choices ?? []), ...(scene.chips ?? [])].map(item => item.nextSceneId),
    ...(scene.nextSceneId ? [scene.nextSceneId] : []),
  ];
}

function endingRoutes(sceneId, scenes = [], chipResponseScreens = 0) {
  const scene = getScene(sceneId);
  const visitedScenes = [...scenes, scene];
  if (scene.type === "ending") return [{ scenes: visitedScenes, chipResponseScreens }];

  const transitions = [
    ...(scene.choices ?? []).map(item => ({ nextSceneId: item.nextSceneId, chipResponseScreens: 0 })),
    ...(scene.chips ?? []).map(item => ({ nextSceneId: item.nextSceneId, chipResponseScreens: story.screenCounts.chipResponse })),
    ...(scene.nextSceneId ? [{ nextSceneId: scene.nextSceneId, chipResponseScreens: 0 }] : []),
  ];
  return transitions.flatMap(item => endingRoutes(
    item.nextSceneId,
    visitedScenes,
    chipResponseScreens + item.chipResponseScreens,
  ));
}

test("모든 장면 연결은 존재하는 장면을 가리킨다", () => {
  for (const scene of Object.values(story.scenes)) {
    for (const id of destinations(scene)) assert.ok(getScene(id), `${scene.id} -> ${id}`);
  }
});

test("S00에서 세 MVP 결말에 도달할 수 있다", () => {
  const reached = new Set();
  const queue = ["S00"];
  while (queue.length) {
    const id = queue.shift();
    if (reached.has(id)) continue;
    reached.add(id);
    queue.push(...destinations(getScene(id)));
  }
  assert.deepEqual([...reached].filter(id => id.startsWith("E")).sort(), ["E1", "E3", "E5"]);
});

test("장면 순서와 모든 장면 낱말은 완전한 저작 데이터다", () => {
  assert.deepEqual(story.sceneOrder, ["S00", "S01", "A1", "A3", "S02", "B2", "E1", "E3", "E5"]);
  for (const scene of Object.values(story.scenes)) {
    for (const word of scene.vocab) assert.ok(getVocabulary(word), `${scene.id}: ${word}`);
  }
});

test("저작된 슬롯 조사는 받침 유무에 맞게 렌더링된다", () => {
  const batchimSlots = { HERO: "지민", TREAT: "붕어빵", PET: "토끼", COLOR: "파랑" };
  const openSlots = { HERO: "민서", TREAT: "젤리", PET: "고양이", COLOR: "노랑" };
  const batchimOpening = renderTemplate(story.scenes.S00.body, batchimSlots);
  const openOpening = renderTemplate(story.scenes.S00.body, openSlots);
  const batchimGiant = renderTemplate(story.scenes.S02.body, batchimSlots);
  const openGiant = renderTemplate(story.scenes.S02.body, openSlots);

  assert.match(batchimOpening, /지민은 정원/);
  assert.match(openOpening, /민서는 정원/);
  assert.match(batchimGiant, /토끼는 지민의 신발/);
  assert.match(openGiant, /고양이는 민서의 신발/);
});

test("모든 저작 문자열은 슬롯 조사 토큰 검증을 통과한다", () => {
  function validate(value, location = "story") {
    if (typeof value === "string") {
      assert.doesNotThrow(
        () => renderTemplate(value, { HERO: "지민", TREAT: "붕어빵", PET: "토끼", COLOR: "파랑" }),
        location,
      );
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) validate(child, `${location}.${key}`);
  }

  validate(story);
});

test("분기 안내는 실제 MVP 그래프에 있는 길만 소개한다", () => {
  assert.match(story.scenes.S01.body, /두 가지 소리/);
  assert.match(story.scenes.S01.body, /나무 위에서 나는 낮은 웃음소리/);
  assert.match(story.scenes.S01.body, /멀리서 들리는 시끌시끌한 찻잔 소리/);
  assert.doesNotMatch(story.scenes.S01.body, /버섯 쪽|콧노래|세 가지 소리/);

  assert.match(story.scenes.S02.body, /커다란 버섯/);
  assert.doesNotMatch(story.scenes.S02.body, /세 갈래|서로 다른 쪽/);
});

test("모든 결말 경로는 칩 응답 화면을 포함해 5~7개 화면이다", () => {
  assert.deepEqual(story.screenCounts, { setup: 1, chipResponse: 1 });
  for (const route of endingRoutes(story.startSceneId)) {
    const screenCount = story.screenCounts.setup + route.scenes.length + route.chipResponseScreens;
    assert.equal(route.chipResponseScreens, 1, route.scenes.map(scene => scene.id).join(" -> "));
    assert.ok(screenCount >= 5 && screenCount <= 7, `${route.scenes.map(scene => scene.id).join(" -> ")}: ${screenCount}`);
  }
});

test("모든 결말 경로의 읽기 추정은 5분 이내다", () => {
  assert.deepEqual(story.readingModel, {
    charactersPerMinute: 450,
    setupSeconds: 20,
    chipResponseSeconds: 15,
  });
  for (const route of endingRoutes(story.startSceneId)) {
    for (const scene of route.scenes) {
      const authoredCharacterCount = scene.body.replace(/\s/g, "").length;
      assert.equal(
        scene.estimatedReadSeconds,
        Math.ceil(authoredCharacterCount * 60 / story.readingModel.charactersPerMinute),
        scene.id,
      );
    }
    const estimatedSeconds = estimateRouteSeconds(route);
    assert.ok(estimatedSeconds <= 300, `${route.scenes.map(scene => scene.id).join(" -> ")}: ${estimatedSeconds} seconds`);
  }
});

test("모든 장면은 제목, 아트 키, 본문과 1~2개 낱말을 가진다", () => {
  for (const scene of Object.values(story.scenes)) {
    assert.ok(scene.title && scene.art && scene.body);
    assert.ok(scene.vocab.length >= 1 && scene.vocab.length <= 2, scene.id);
  }
});

test("낱말을 중복 없이 기록하고 모르는 낱말은 무시한다", () => {
  const session = { vocabTapped: ["황급히"] };
  assert.equal(getVocabulary("황급히"), "아주 급하게, 서둘러서");
  assert.deepEqual(recordVocabulary(session, "황급히").vocabTapped, ["황급히"]);
  assert.strictEqual(recordVocabulary(session, "없는말"), session);
});
