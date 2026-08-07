import assert from "node:assert/strict";
import test from "node:test";
import { getScene, story } from "../src/story-data.js";
import { getVocabulary, recordVocabulary } from "../src/vocabulary.js";

function destinations(scene) {
  return [
    ...[...(scene.choices ?? []), ...(scene.chips ?? [])].map(item => item.nextSceneId),
    ...(scene.nextSceneId ? [scene.nextSceneId] : []),
  ];
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
