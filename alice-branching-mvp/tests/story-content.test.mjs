import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertBundleFresh,
  loadStorySources,
  serializeStoryBundle,
  validateStorySources,
} from "../scripts/story-content.mjs";
import { storyGraph, storyLevels } from "../src/generated/story-bundle.js";
import { createStoryRuntime } from "../src/story-engine.js";
import { getStoryRuntime } from "../src/story-data.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("스토리 데이터는 선택 레벨의 런타임을 반환하고 잘못된 값은 hard로 복구한다", () => {
  const easy = getStoryRuntime("easy");
  const hard = getStoryRuntime("hard");

  assert.match(easy.getScene("S00").body, /그림도 없고 말도 없는 책/);
  assert.notEqual(easy.getScene("S00").body, hard.getScene("S00").body);
  assert.strictEqual(getStoryRuntime("unknown"), hard);
});

function validFixture() {
  return {
    graph: {
      id: "test-story",
      defaultLevel: "hard",
      startSceneId: "S00",
      sceneOrder: ["S00", "E1"],
      readingModel: { charactersPerMinute: 450, setupSeconds: 20, chipResponseSeconds: 15 },
      screenCounts: { setup: 1, chipResponse: 1 },
      endingByEncounter: {},
      contentSelectors: {},
      presentationSelectors: {},
      scenes: {
        S00: {
          type: "choice",
          art: "start",
          choices: [{ id: "go", nextSceneId: "E1" }],
        },
        E1: { type: "ending", art: "end" },
      },
    },
    levels: {
      hard: {
        storyId: "test-story",
        level: "hard",
        title: "시험 이야기",
        vocabulary: { "낱말": "뜻" },
        scenes: {
          S00: {
            title: "시작",
            body: ["이야기가 시작돼요."],
            vocab: ["낱말"],
            choices: { go: "계속 간다" },
          },
          E1: {
            title: "끝",
            body: ["이야기가 끝났어요."],
            vocab: ["낱말"],
            trait: "용기",
            choiceRecall: "네 선택",
            parentNote: "끝까지 읽었어요.",
          },
        },
      },
    },
    assetKeys: new Set(["start", "end"]),
  };
}

test("교차 파일 검증은 누락된 선택 문구를 경로와 함께 거부한다", () => {
  const fixture = validFixture();
  delete fixture.levels.hard.scenes.S00.choices.go;

  assert.throws(
    () => validateStorySources(fixture),
    /hard\.scenes\.S00\.choices\.go/,
  );
});

test("교차 파일 검증은 끊어진 장면 연결을 거부한다", () => {
  const fixture = validFixture();
  fixture.graph.scenes.S00.choices[0].nextSceneId = "MISSING";

  assert.throws(
    () => validateStorySources(fixture),
    /graph\.scenes\.S00\.choices\.go\.nextSceneId.*MISSING/,
  );
});

test("교차 파일 검증은 정의되지 않은 낱말과 고아 뜻풀이를 거부한다", () => {
  const missing = validFixture();
  missing.levels.hard.scenes.S00.vocab = ["없는말"];
  assert.throws(
    () => validateStorySources(missing),
    /hard\.scenes\.S00\.vocab.*없는말/,
  );

  const orphan = validFixture();
  orphan.levels.hard.vocabulary["고아"] = "사용되지 않는 뜻";
  assert.throws(
    () => validateStorySources(orphan),
    /hard\.vocabulary\.고아.*사용하는 장면이 없습니다/,
  );
});

test("교차 파일 검증은 지원하지 않는 개인화 토큰과 삽화 키를 거부한다", () => {
  const token = validFixture();
  token.levels.hard.scenes.S00.body = ["{COLOR} 문을 열어요."];
  assert.throws(
    () => validateStorySources(token),
    /hard\.scenes\.S00\.body.*COLOR/,
  );

  const art = validFixture();
  art.graph.scenes.S00.art = "missing-art";
  assert.throws(
    () => validateStorySources(art),
    /graph\.scenes\.S00\.art.*missing-art/,
  );
});

test("교차 파일 검증은 조건부 블록 변형 누락을 거부한다", () => {
  const fixture = validFixture();
  fixture.graph.contentSelectors.S00 = {
    greeting: {
      stateKey: "mood",
      cases: { HAPPY: "happy" },
      default: "calm",
    },
  };
  fixture.levels.hard.scenes.S00.body.push({ block: "greeting" });
  fixture.levels.hard.scenes.S00.blocks = {
    greeting: { happy: ["반가워요."] },
  };

  assert.throws(
    () => validateStorySources(fixture),
    /hard\.scenes\.S00\.blocks\.greeting\.calm/,
  );
});

test("교차 파일 검증은 분기 밖의 선택 문구를 거부한다", () => {
  const fixture = validFixture();
  fixture.levels.hard.scenes.S00.choices.extra = "그래프에 없는 선택";

  assert.throws(
    () => validateStorySources(fixture),
    /hard\.scenes\.S00\.choices\.extra.*그래프에 없는 선택 ID/,
  );
});

test("교차 파일 검증은 잘못된 결말 매핑과 조건부 삽화를 거부한다", () => {
  const ending = validFixture();
  ending.graph.endingByEncounter.A1 = "MISSING";
  assert.throws(
    () => validateStorySources(ending),
    /graph\.endingByEncounter\.A1.*MISSING/,
  );

  const art = validFixture();
  art.graph.presentationSelectors.S00 = {
    art: { stateKey: "size", cases: { BIG: "missing-art" }, default: "start" },
  };
  assert.throws(
    () => validateStorySources(art),
    /graph\.presentationSelectors\.S00\.art\.cases\.BIG.*missing-art/,
  );
});

test("저장소의 easy와 hard 원고는 같은 공통 그래프를 완전히 채운다", async () => {
  const sources = await loadStorySources(projectRoot);

  assert.equal(Object.keys(sources.graph.scenes).length, 18);
  assert.deepEqual(Object.keys(sources.levels), ["easy", "hard"]);
  assert.equal(Object.keys(sources.levels.easy.scenes).length, 18);
  assert.equal(Object.keys(sources.levels.easy.vocabulary).length, 18);
  assert.equal(Object.keys(sources.levels.hard.vocabulary).length, 28);
  assert.doesNotThrow(() => validateStorySources(sources));
});

test("easy 원고는 같은 분기를 유지하면서 더 짧은 문장으로 렌더링된다", () => {
  const easy = createStoryRuntime(storyGraph, storyLevels.easy);
  const hard = createStoryRuntime(storyGraph, storyLevels.hard);

  assert.deepEqual(easy.story.sceneOrder, hard.story.sceneOrder);
  assert.match(easy.getScene("S00").body, /그림도 없고 말도 없는 책/);
  assert.ok(easy.getScene("S00").body.length < hard.getScene("S00").body.length);
  assert.match(easy.resolveScene("FRAGMENT", {
    storyState: { encounterId: "A2" },
  }).body, /신중함의 조각/);
});

test("생성 번들은 결정적이고 저장소 JSON과 동기화된다", async () => {
  const sources = await loadStorySources(projectRoot);
  const first = serializeStoryBundle(sources);
  const second = serializeStoryBundle(sources);

  assert.equal(first, second);
  await assert.doesNotReject(() => assertBundleFresh(
    first,
    path.join(projectRoot, "src/generated/story-bundle.js"),
  ));
});

test("생성 번들 검사는 오래된 파일을 구체적인 명령으로 거부한다", async () => {
  await assert.rejects(
    () => assertBundleFresh("새 데이터", path.join(projectRoot, "package.json")),
    /npm run story:build/,
  );
});

test("스토리 엔진은 그래프와 hard 원고를 기존 장면 계약으로 결합한다", () => {
  const runtime = createStoryRuntime(storyGraph, storyLevels.hard);
  const opening = runtime.getScene("S00");

  assert.equal(runtime.story.title, "너의 선택으로 열리는 앨리스의 이상한 나라");
  assert.equal(opening.title, "토끼굴 — 이야기의 시작");
  assert.match(opening.body, /따스한 오후였어요/);
  assert.deepEqual(opening.choices.map(choice => choice.label), [
    "작은 문을 열어 본다",
    "{TREAT}{을/를} 먹어 본다",
  ]);
  assert.ok(opening.estimatedReadSeconds > 0);
});

test("C1은 고양이 경로에서만 재회 원고를 선택한다", () => {
  const runtime = createStoryRuntime(storyGraph, storyLevels.hard);
  const first = runtime.resolveScene("C1", { storyState: { encounterId: "A2" } });
  const reunion = runtime.resolveScene("C1", { storyState: { encounterId: "A1" } });

  assert.equal(first.title, "안개 언덕 — 안개 속의 웃음");
  assert.match(first.body, /그 미소를 처음 보았어요/);
  assert.doesNotMatch(first.body, /또 만났네/);
  assert.match(reunion.body, /그 미소를 알아보았어요/);
  assert.match(reunion.body, /또 만났네/);
});

test("조건부 장면은 진입 상태와 만남에 맞는 삽화와 결말을 만든다", () => {
  const runtime = createStoryRuntime(storyGraph, storyLevels.hard);
  const scene = runtime.resolveScene("C2", {
    storyState: { encounterId: "B3", gardenEntry: "GUEST" },
  });

  assert.match(scene.body, /나팔이 울렸어요/);
  assert.equal(scene.art, "queen_garden_trial_big");
  assert.deepEqual(scene.choices.map(choice => choice.nextSceneId), ["E6", "E6", "E6"]);
});

test("결말은 여왕 답변 변주와 결말별 회상 문장을 결합한다", () => {
  const runtime = createStoryRuntime(storyGraph, storyLevels.hard);
  const ending = runtime.resolveScene("E5", {
    storyState: { encounterId: "B2", endingVariation: "TURN" },
  });

  assert.match(ending.body, /여왕님은 어떤 색이었으면 좋겠어요/);
  assert.match(ending.body, /여왕님에게도 물어볼 수 있다고 생각했어요/);
  assert.equal(ending.spotArt, "spot_turn");
  assert.match(ending.parentNote, /질문으로 넘기는 쪽을 택했어요/);
});
