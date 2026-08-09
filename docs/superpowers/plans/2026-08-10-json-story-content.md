# JSON Story Content Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the current Alice manuscript and vocabulary into validated `hard.json` content while keeping one shared branching graph and all existing runtime behavior.

**Architecture:** `story/graph.json` owns stable IDs, transitions, effects, art, selectors, and ending mappings. `story/content/hard.json` owns every displayed string, paragraph, conditional text block, vocabulary word, and definition. A Node generator validates both JSON files, emits a deterministic synchronous ES module, and a generic engine rebuilds the existing `story-data.js` and `vocabulary.js` APIs.

**Tech Stack:** ES modules, Node test runner, JSON Schema Draft 2020-12, Ajv as a development-only validator, static browser JavaScript.

## Global Constraints

- Preserve all 17 scene IDs, six ending IDs, existing choice IDs, session state keys, localStorage format, and three UI renderers.
- Keep `hard` as the only generated and default level; do not add `easy.json`, a level picker, or a URL parameter.
- Keep JSON files as the single source of authored story and vocabulary content; generated JavaScript must never be hand-edited.
- Do not change branching outcomes, existing visual asset keys, or current rendered manuscript text except the approved neutral C1 title/content representation required by the JSON block model.
- Keep the public exports of `story-data.js` and `vocabulary.js` compatible with current consumers.
- Every source JSON change must be reproducible with `npm run story:build` and verified with `npm run story:check` and `npm test`.

---

## File Structure

- Create `alice-branching-mvp/story/graph.json`: shared structural graph, state effects, content selectors, presentation selectors, ending mappings, and reading model.
- Create `alice-branching-mvp/story/content/hard.json`: complete current manuscript, display labels, conditional blocks, parent notes, vocabulary lists, and definitions.
- Create `alice-branching-mvp/story/schemas/graph.schema.json`: JSON Schema for graph-local structure.
- Create `alice-branching-mvp/story/schemas/content.schema.json`: JSON Schema for level content and paragraph/block entries.
- Create `alice-branching-mvp/scripts/story-content.mjs`: parsing, Ajv schema validation, cross-file validation, bundle serialization, CLI build/check entry point.
- Create `alice-branching-mvp/src/generated/story-bundle.js`: committed deterministic output of the two source JSON files.
- Create `alice-branching-mvp/src/story-engine.js`: pure graph/content composition and conditional resolution.
- Replace `alice-branching-mvp/src/story-data.js`: compatibility exports backed by the engine and generated bundle.
- Replace `alice-branching-mvp/src/vocabulary.js`: compatibility exports backed by generated hard-level vocabulary.
- Create `alice-branching-mvp/tests/story-content.test.mjs`: generator, schema, cross-file, bundle freshness, and engine tests.
- Modify `alice-branching-mvp/tests/story-data.test.mjs`: retain graph/route assertions against generated data and assert C1 first/reunion text.
- Modify `alice-branching-mvp/package.json`: add `story:build`, `story:check`, pretest validation, and Ajv dev dependency.
- Create `alice-branching-mvp/package-lock.json`: lock Ajv and development dependencies.
- Modify `alice-branching-mvp/README.md`: document the hard JSON editing and verification workflow.

---

### Task 1: Define and validate the JSON authoring contract

**Files:**
- Create: `alice-branching-mvp/story/schemas/graph.schema.json`
- Create: `alice-branching-mvp/story/schemas/content.schema.json`
- Create: `alice-branching-mvp/scripts/story-content.mjs`
- Create: `alice-branching-mvp/tests/story-content.test.mjs`
- Modify: `alice-branching-mvp/package.json`
- Create: `alice-branching-mvp/package-lock.json`

**Interfaces:**
- Consumes: JSON objects loaded from graph, content, and schema paths.
- Produces: `loadStorySources(rootDir)`, `validateStorySources({ graph, levels, schemas, assetKeys })`, `serializeStoryBundle({ graph, levels })`, `buildStoryBundle({ rootDir, check })`, plus CLI commands `story:build` and `story:check`.

- [ ] **Step 1: Add failing schema and validator tests**

Test valid minimal graph/content fixtures and explicit failures for a missing scene, unknown `nextSceneId`, missing choice label, missing block variant, unsupported template token, undefined vocabulary word, orphan vocabulary definition, and missing art key. Assert errors include a JSON path and actionable reason.

```js
test("교차 파일 검증은 누락된 선택 문구를 경로와 함께 거부한다", () => {
  const fixture = validFixture();
  delete fixture.levels.hard.scenes.S00.choices.shrink;
  assert.throws(
    () => validateStorySources(fixture),
    /hard\.scenes\.S00\.choices\.shrink/,
  );
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests/story-content.test.mjs`
Expected: FAIL because `scripts/story-content.mjs` and schemas do not exist.

- [ ] **Step 3: Add Ajv and package scripts**

Add development dependency `ajv`, scripts `story:build` and `story:check`, and change `test` to run `story:check` before `node --test tests/*.test.mjs`. Generate and commit the lockfile.

```json
{
  "scripts": {
    "story:build": "node scripts/story-content.mjs build",
    "story:check": "node scripts/story-content.mjs check",
    "test": "npm run story:check && node --test tests/*.test.mjs"
  },
  "devDependencies": {
    "ajv": "^8.17.1"
  }
}
```

- [ ] **Step 4: Implement schemas and reusable validation functions**

Use Draft 2020-12 schemas for local shapes. Add cross-file validation for exact scene ID parity, exact choice/chip ID parity, destinations, terminal reachability, selectors and variants, template tokens `HERO`, `TREAT`, `PET` plus supported Korean particle tokens, vocabulary coverage, and art manifest keys.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/story-content.test.mjs`
Expected: PASS for all validator fixture tests introduced in Task 1.

- [ ] **Step 6: Commit**

```bash
git add alice-branching-mvp/package.json alice-branching-mvp/package-lock.json alice-branching-mvp/story/schemas alice-branching-mvp/scripts/story-content.mjs alice-branching-mvp/tests/story-content.test.mjs
git commit -m "feat: validate JSON story sources"
```

### Task 2: Migrate the current graph and hard manuscript

**Files:**
- Create: `alice-branching-mvp/story/graph.json`
- Create: `alice-branching-mvp/story/content/hard.json`
- Modify: `alice-branching-mvp/tests/story-content.test.mjs`

**Interfaces:**
- Consumes: the authored scenes, mappings, reading model, and vocabulary currently in `src/story-data.js` and `src/vocabulary.js`.
- Produces: validated source objects with `graph.defaultLevel === "hard"`, exact 17-node parity, stable IDs, `hard.scenes`, and `hard.vocabulary`.

- [ ] **Step 1: Add failing full-source parity tests**

Assert 17 graph scenes, six ending mappings, one hard level, 28 vocabulary definitions, every current choice/chip ID, and C1/C2/ending content selectors.

```js
test("저장소의 hard 원고는 공통 그래프를 완전히 채운다", async () => {
  const sources = await loadStorySources(projectRoot);
  assert.equal(Object.keys(sources.graph.scenes).length, 17);
  assert.deepEqual(Object.keys(sources.levels), ["hard"]);
  assert.equal(Object.keys(sources.levels.hard.vocabulary).length, 28);
  assert.doesNotThrow(() => validateStorySources(sources));
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests/story-content.test.mjs`
Expected: FAIL because `story/graph.json` and `story/content/hard.json` do not exist.

- [ ] **Step 3: Write `graph.json`**

Move `ENDING_BY_ENCOUNTER`, reading model, scene order, scene types, art keys, transitions, choice/chip IDs, effects, content selectors, and presentation selectors. Add stable IDs to every chip that currently lacks one. Preserve existing choice IDs and session effect values.

- [ ] **Step 4: Write `hard.json`**

Move every current title, body paragraph, prompt, label, response, vocabulary entry, trait, choice recall, parent note, and ending variation string. Convert body strings to paragraph arrays. Represent C1 `catMeeting`, C2 `gardenEntry`, ending variation bodies, return adjustments, and variation parent notes as named blocks. Use the neutral C1 title `안개 언덕 — 안개 속의 웃음` so first-meeting routes do not claim a reunion.

- [ ] **Step 5: Run source validation**

Run: `node --test tests/story-content.test.mjs`
Expected: PASS including full repository source validation.

- [ ] **Step 6: Commit**

```bash
git add alice-branching-mvp/story/graph.json alice-branching-mvp/story/content/hard.json alice-branching-mvp/tests/story-content.test.mjs
git commit -m "feat: migrate hard story to JSON"
```

### Task 3: Generate a deterministic synchronous story bundle

**Files:**
- Modify: `alice-branching-mvp/scripts/story-content.mjs`
- Create: `alice-branching-mvp/src/generated/story-bundle.js`
- Modify: `alice-branching-mvp/tests/story-content.test.mjs`

**Interfaces:**
- Consumes: validated `graph.json` and every `content/*.json` sorted by level ID.
- Produces: `export const storyGraph = Object.freeze(...)` and `export const storyLevels = Object.freeze(...)` in a deterministic ES module; `story:check` compares bytes without writing.

- [ ] **Step 1: Add failing serialization and freshness tests**

Assert two serializations are byte-identical, build output imports as an ES module, `storyLevels.hard` exists, and modifying an in-memory source makes check mode report the generated file as stale.

```js
test("생성 번들은 결정적이고 저장소 JSON과 동기화된다", async () => {
  const sources = await loadStorySources(projectRoot);
  const first = serializeStoryBundle(sources);
  const second = serializeStoryBundle(sources);
  assert.equal(first, second);
  assert.doesNotThrow(() => assertBundleFresh(first, generatedPath));
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests/story-content.test.mjs`
Expected: FAIL because serialization, freshness checking, and generated output do not exist.

- [ ] **Step 3: Implement deterministic serialization and CLI modes**

Use `JSON.stringify(value, null, 2)` on source objects whose level keys are sorted. Build mode writes the exact module using a trailing newline. Check mode reads the committed bundle and exits nonzero with `Run npm run story:build` if bytes differ.

- [ ] **Step 4: Generate and verify the bundle**

Run: `npm run story:build`
Expected: creates `src/generated/story-bundle.js`.

Run: `npm run story:check`
Expected: PASS without modifying files.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/story-content.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add alice-branching-mvp/scripts/story-content.mjs alice-branching-mvp/src/generated/story-bundle.js alice-branching-mvp/tests/story-content.test.mjs
git commit -m "feat: generate synchronous story bundle"
```

### Task 4: Replace authored JavaScript with a generic story engine

**Files:**
- Create: `alice-branching-mvp/src/story-engine.js`
- Replace: `alice-branching-mvp/src/story-data.js`
- Replace: `alice-branching-mvp/src/vocabulary.js`
- Modify: `alice-branching-mvp/tests/story-content.test.mjs`
- Modify: `alice-branching-mvp/tests/story-data.test.mjs`

**Interfaces:**
- Consumes: `storyGraph`, `storyLevels`, and session `storyState`.
- Produces: `createStoryRuntime(graph, levelContent)` returning `{ story, getScene, resolveScene, estimateRouteSeconds, vocabulary, getVocabulary }`; compatibility files preserve current named exports and `recordVocabulary(session, word)`.

- [ ] **Step 1: Add failing engine and compatibility tests**

Assert paragraph joining, choice/chip label merging by ID, dynamic read-time calculation, selector resolution, C1 first/reunion behavior, C2 entry/art behavior, ending variation body/spot/parent note behavior, immutable source data, and all current public exports.

```js
test("C1은 고양이 경로에서만 재회 원고를 선택한다", () => {
  const first = runtime.resolveScene("C1", { storyState: { encounterId: "A2" } });
  const reunion = runtime.resolveScene("C1", { storyState: { encounterId: "A1" } });
  assert.match(first.body, /처음 보았어요/);
  assert.doesNotMatch(first.body, /또 만났네/);
  assert.match(reunion.body, /알아보았어요/);
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test tests/story-content.test.mjs tests/story-data.test.mjs`
Expected: FAIL because `story-engine.js` does not exist and old compatibility files still own authored data.

- [ ] **Step 3: Implement `createStoryRuntime`**

Merge structural graph records with hard-level labels by stable ID. Resolve paragraph arrays and block entries through graph selectors. Apply presentation selectors to art and spot art. Combine ending block variants and parent notes. Compute `estimatedReadSeconds` from resolved base body text with the existing 450 characters/minute model.

- [ ] **Step 4: Replace compatibility entry points**

Instantiate the runtime with generated `hard` content in `story-data.js`. Export the existing names. In `vocabulary.js`, export the generated frozen vocabulary, compatible lookup, and the unchanged immutable `recordVocabulary()` behavior.

- [ ] **Step 5: Run focused and integration tests**

Run: `node --test tests/story-content.test.mjs tests/story-data.test.mjs tests/session.test.mjs tests/ui.test.mjs tests/app-integration.test.mjs tests/ui-variants.test.mjs`
Expected: PASS.

- [ ] **Step 6: Confirm authored prose is gone from JavaScript**

Run: `rg -n "따스한 오후였어요|고양이가 물었어요|여왕님은 어떤 색" src --glob '*.js' --glob '!generated/story-bundle.js'`
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add alice-branching-mvp/src/story-engine.js alice-branching-mvp/src/story-data.js alice-branching-mvp/src/vocabulary.js alice-branching-mvp/tests/story-content.test.mjs alice-branching-mvp/tests/story-data.test.mjs
git commit -m "refactor: load story through generic engine"
```

### Task 5: Document editing workflow and perform completion audit

**Files:**
- Modify: `alice-branching-mvp/README.md`

**Interfaces:**
- Consumes: completed JSON source, generator, engine, and test commands.
- Produces: developer/external-agent workflow with exact editable files and validation commands.

- [ ] **Step 1: Add the authoring documentation**

Document that ordinary manuscript edits touch `story/content/hard.json`, graph changes touch `story/graph.json`, generated files must not be edited, current default is hard, easy is absent by design, and every edit runs:

```bash
npm run story:build
npm test
```

- [ ] **Step 2: Run formatting and source-of-truth checks**

Run: `git diff --check`
Expected: PASS.

Run: `npm run story:check`
Expected: PASS.

Run: `rg -n "따스한 오후였어요|고양이가 물었어요|여왕님은 어떤 색" src --glob '*.js' --glob '!generated/story-bundle.js'`
Expected: no matches.

- [ ] **Step 3: Run the complete automated suite**

Run: `npm test`
Expected: all existing 126 tests plus new story-content tests PASS.

- [ ] **Step 4: Audit every design requirement**

Confirm from current files and command output: only hard content exists; graph and prose are separate; C1 first/reunion text is data-driven; vocabulary definitions are in hard JSON; generated bundle is current; public APIs, session format, routes, six endings, three variations, and three UIs remain covered; README describes the external-agent workflow.

- [ ] **Step 5: Commit**

```bash
git add alice-branching-mvp/README.md alice-branching-mvp/tests/story-content.test.mjs
git commit -m "docs: explain JSON story authoring"
```
