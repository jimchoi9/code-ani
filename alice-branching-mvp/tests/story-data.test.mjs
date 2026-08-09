import assert from "node:assert/strict";
import test from "node:test";
import { renderTemplate } from "../src/personalization.js";
import {
  ENDING_BY_ENCOUNTER,
  ENDING_VARIATIONS,
  estimateRouteSeconds,
  getScene,
  resolveScene,
  story,
} from "../src/story-data.js";
import { getVocabulary, recordVocabulary, vocabulary } from "../src/vocabulary.js";

function destinations(scene) {
  return [
    ...[...(scene.choices ?? []), ...(scene.chips ?? [])].map(item => item.nextSceneId),
    ...(scene.nextSceneId ? [scene.nextSceneId] : []),
  ].filter(Boolean);
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

test("마스터 원고의 17개 노드와 여섯 결말 매핑을 가진다", () => {
  const ids = ["S00", "S01", "S02", "A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "E1", "E2", "E3", "E4", "E5", "E6"];
  assert.deepEqual(story.sceneOrder, ids);
  assert.deepEqual(Object.keys(story.scenes).sort(), [...ids].sort());
  assert.deepEqual(ENDING_BY_ENCOUNTER, {
    A1: "E1", A2: "E2", A3: "E3", B1: "E4", B2: "E5", B3: "E6",
  });
  assert.deepEqual(Object.keys(ENDING_VARIATIONS).sort(), ["SHIELD", "TRUTH", "TURN"]);
});

test("장면 순서와 모든 장면 낱말은 완전한 저작 데이터다", () => {
  for (const scene of Object.values(story.scenes)) {
    for (const word of scene.vocab) assert.ok(getVocabulary(word), `${scene.id}: ${word}`);
  }
  assert.equal(Object.keys(vocabulary).length, 28);
});

test("저작된 슬롯 조사는 받침 유무에 맞게 렌더링된다", () => {
  const batchimSlots = { HERO: "지민", TREAT: "붕어빵", PET: "토끼" };
  const openSlots = { HERO: "민서", TREAT: "젤리", PET: "고양이" };
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
        () => renderTemplate(value, { HERO: "지민", TREAT: "붕어빵", PET: "토끼" }),
        location,
      );
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) validate(child, `${location}.${key}`);
  }

  validate(story);
});

test("작아진 길과 커진 길은 각각 세 만남을 제공한다", () => {
  assert.match(story.scenes.S01.body, /세 가지 소리/);
  assert.match(story.scenes.S01.body, /나무 위에서 나는 낮은 웃음소리/);
  assert.match(story.scenes.S01.body, /버섯 쪽에서 들리는 느릿한 콧노래/);
  assert.match(story.scenes.S01.body, /멀리서 들리는 시끌시끌한 찻잔 소리/);
  assert.deepEqual(story.scenes.S01.choices.map(choice => choice.nextSceneId), ["A1", "A2", "A3"]);
  assert.deepEqual(story.scenes.S02.choices.map(choice => choice.nextSceneId), ["B1", "B2", "B3"]);
});

test("여섯 만남은 칩 응답 뒤 공통 수렴부로 이동한다", () => {
  for (const id of Object.keys(ENDING_BY_ENCOUNTER)) {
    assert.equal(story.scenes[id].type, "chip");
    assert.deepEqual(new Set(story.scenes[id].chips.map(chip => chip.nextSceneId)), new Set(["C1"]));
  }
  assert.deepEqual(story.scenes.C1.choices.map(choice => choice.nextSceneId), ["C2", "C2"]);
});

test("조건부 장면은 현재 경로 상태에 맞는 본문과 삽화를 만든다", () => {
  const reunion = resolveScene("C1", { path: ["S00", "S01", "A1", "C1"], storyState: { encounterId: "A1" } });
  const first = resolveScene("C1", { path: ["S00", "S01", "A2", "C1"], storyState: { encounterId: "A2" } });
  const secret = resolveScene("C2", { storyState: { encounterId: "A2", gardenEntry: "SECRET" } });
  const guest = resolveScene("C2", { storyState: { encounterId: "B3", gardenEntry: "GUEST" } });

  assert.match(reunion.body, /그 미소를 알아보았어요/);
  assert.match(first.body, /그 미소를 처음 보았어요/);
  assert.match(secret.body, /담장 뒤에 서 있었어요/);
  assert.equal(secret.art, "queen_garden_trial_small");
  assert.match(guest.body, /나팔이 울렸어요/);
  assert.equal(guest.art, "queen_garden_trial_big");
  assert.deepEqual(guest.choices.map(choice => choice.nextSceneId), ["E6", "E6", "E6"]);
});

test("모든 결말은 세 변주와 결말별 조정 문장을 결합한다", () => {
  for (const [encounterId, endingId] of Object.entries(ENDING_BY_ENCOUNTER)) {
    for (const endingVariation of ["TRUTH", "SHIELD", "TURN"]) {
      const scene = resolveScene(endingId, { storyState: { encounterId, endingVariation } });
      assert.match(scene.body, new RegExp(ENDING_VARIATIONS[endingVariation].body.slice(0, 8)));
      assert.ok(scene.returnAdjustment);
      assert.match(scene.parentNote, new RegExp(ENDING_VARIATIONS[endingVariation].parentNote));
    }
  }
});

test("모든 장면은 제목, 아트 키, 본문과 1~2개 낱말을 가진다", () => {
  for (const scene of Object.values(story.scenes)) {
    assert.ok(scene.title && scene.art && scene.body);
    assert.ok(scene.vocab.length >= 1 && scene.vocab.length <= 2, scene.id);
  }
});

test("모든 장면은 원고의 이미지 키를 사용하고 색상 슬롯이 없다", () => {
  const expectedArt = {
    S00: "start_rabbit_hole", S01: "door_shrink", S02: "cake_grow",
    A1: "door_cat_meet", A2: "door_caterpillar_meet", A3: "door_hatter_meet",
    B1: "cake_cat_meet", B2: "cake_caterpillar_meet", B3: "cake_hatter_meet",
    C1: "mist_hill_grin", C2: "queen_garden_trial_small",
    E1: "end_curiosity", E2: "end_prudence", E3: "end_cheer",
    E4: "end_composure", E5: "end_selftrust", E6: "end_warmth",
  };
  assert.deepEqual(Object.fromEntries(Object.values(story.scenes).map(scene => [scene.id, scene.art])), expectedArt);
  assert.doesNotMatch(JSON.stringify(story), /\{COLOR\}/);
});

test("낱말을 중복 없이 기록하고 모르는 낱말은 무시한다", () => {
  const session = { vocabTapped: ["황급히"] };
  assert.equal(getVocabulary("황급히"), "아주 급하게, 서둘러서");
  assert.deepEqual(recordVocabulary(session, "황급히").vocabTapped, ["황급히"]);
  assert.strictEqual(recordVocabulary(session, "없는말"), session);
});
