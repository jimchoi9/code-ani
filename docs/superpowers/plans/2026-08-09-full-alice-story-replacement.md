# Full Alice Story Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-ending Alice MVP with the complete attached 17-node story and render every illustration as a gray placeholder labeled with its image key.

**Architecture:** Keep the existing static ES-module app and three UI variants. Expand the authored graph in `story-data.js`, add explicit per-run story state to `session.js`, and materialize conditional scene text/art/transitions through one pure resolver before any renderer receives a scene. All renderers use one shared placeholder contract and no longer load visual-novel artwork.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Node.js built-in test runner, `localStorage`

## Global Constraints

- Implement all 17 nodes: `S00`, `S01`, `S02`, `A1`-`A3`, `B1`-`B3`, `C1`, `C2`, `E1`-`E6`.
- Preserve all attached master-copy story text, choices, chips, vocabulary, ending variation blocks, adjustment lines, and parent notes.
- Every encounter flows through `C1` and `C2` before its mapped ending.
- Support `SECRET/GUEST`, `TRUTH/SHIELD/TURN`, and Cheshire first-meeting/reunion copy.
- Remove the `COLOR` personalization slot and keep `{HERO}`, `{TREAT}`, and `{PET}`.
- Use only gray image placeholders; the centered label must be the exact authored image key.
- `C2` uses `queen_garden_trial_small` for A routes and `queen_garden_trial_big` for B routes.
- Keep all three UI variants and existing child-test mode behavior.
- Do not delete supplied artwork files; merely remove runtime references.
- Use test-driven development and keep the working tree green after each task.

---

## File Map

- Modify `alice-branching-mvp/src/story-data.js`: full authored graph, ending mappings, image keys, conditional scene resolver.
- Modify `alice-branching-mvp/src/vocabulary.js`: all 28 master vocabulary definitions.
- Modify `alice-branching-mvp/src/session.js`: per-run `storyState` and immutable state-effect updates.
- Modify `alice-branching-mvp/src/app.js`: choice identity/effects, dynamic ending transition, resolved scene dispatch.
- Modify `alice-branching-mvp/src/personalization.js`: remove `COLOR`.
- Modify `alice-branching-mvp/src/ui.js`: three-slot setup and shared gray placeholder markup.
- Modify `alice-branching-mvp/src/ui-variants/current.js`: consume the common resolved-scene renderer unchanged.
- Modify `alice-branching-mvp/src/ui-variants/minimal-text.js`: show the common placeholder for story and ending screens.
- Modify `alice-branching-mvp/src/ui-variants/visual-novel.js`: remove asset manifest use, update 7-stage progress and 6 fragments, show the common placeholder.
- Modify `alice-branching-mvp/styles.css`, `styles/minimal-text.css`, `styles/visual-novel.css`: shared gray visual contract and removal of generated/asset art presentation.
- Modify story, personalization, session, UI, UI-variant, and integration tests.

### Task 1: Personalization and full authored graph

**Files:**
- Modify: `alice-branching-mvp/src/personalization.js`
- Modify: `alice-branching-mvp/src/story-data.js`
- Modify: `alice-branching-mvp/src/vocabulary.js`
- Modify: `alice-branching-mvp/tests/personalization.test.mjs`
- Modify: `alice-branching-mvp/tests/story-data.test.mjs`

**Interfaces:**
- Produces `DEFAULT_SLOTS = { HERO, TREAT, PET }`.
- Produces `ENDING_BY_ENCOUNTER`, `ENDING_VARIATIONS`, `getScene(id)`, `resolveScene(id, session)`, and `estimateRouteSeconds(route)`.
- `resolveScene(id, session)` returns a scene copy with final `body`, `art`, `choices`, `parentNote`, and `returnAdjustment` for the current run.

- [ ] **Step 1: Replace the MVP graph expectations with failing full-graph tests**

```js
const ids = ["S00", "S01", "S02", "A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "E1", "E2", "E3", "E4", "E5", "E6"];
assert.deepEqual(story.sceneOrder, ids);
assert.deepEqual(Object.keys(story.scenes).sort(), [...ids].sort());
assert.deepEqual(ENDING_BY_ENCOUNTER, { A1: "E1", A2: "E2", A3: "E3", B1: "E4", B2: "E5", B3: "E6" });
assert.deepEqual(Object.keys(ENDING_VARIATIONS).sort(), ["SHIELD", "TRUTH", "TURN"]);
assert.deepEqual(DEFAULT_SLOTS, { HERO: "앨리스", TREAT: "케이크", PET: "강아지" });
```

Also assert that every encounter chip points to `C1`, both `C1` choices point to `C2`, all 28 words resolve, no authored value contains `{COLOR}`, and art keys match the design table exactly.

- [ ] **Step 2: Run the focused tests and confirm the old MVP fails**

Run: `cd alice-branching-mvp && node --test tests/personalization.test.mjs tests/story-data.test.mjs`

Expected: FAIL on the old nine-node graph, missing vocabulary, old art keys, and `COLOR`.

- [ ] **Step 3: Transcribe the complete attached master into `story-data.js`**

Use the attachment sections `[S00]` through `[E6]` verbatim, changing only slot grammar to supported forms such as `{HERO}{은/는}`. Each encounter has three authored chips and every chip uses `nextSceneId: "C1"`. Define:

```js
export const ENDING_BY_ENCOUNTER = Object.freeze({
  A1: "E1", A2: "E2", A3: "E3", B1: "E4", B2: "E5", B3: "E6",
});

export const ENDING_VARIATIONS = Object.freeze({
  TRUTH: {
    body: `"하얀 장미였어요." {HERO}{이/가} 서슴없이 말했어요.

카드들이 파닥거렸어요. 그런데 여왕은 화를 내지 않았어요.

"그래. 나도 알고 있었다." 여왕이 페인트 묻은 손가락을 내려다보았어요. "아무도 말해 주지 않았을 뿐이지."

여왕은 붓 하나를 집어 담장 밖으로 던졌어요. 정원사 카드들이 그제야 허리를 펴고 일어났어요.`,
    parentNote: "솔직하게 말하는 쪽을 택했어요.",
  },
  SHIELD: {
    body: `"제가 쏟았어요." {HERO}{이/가} 얼른 말했어요. "제가 페인트를 엎질러서 그렇게 됐어요."

카드 하나가 {HERO}{을/를} 올려다보았어요. 아무 말도 못 했어요.

여왕은 {HERO}{을/를} 한참 보았어요. 그러다 대수롭지 않게 고개를 돌렸어요.

"손이 큰 손님이로군." 여왕이 말했어요. "다음엔 조심하도록."

카드들이 아주 작게, 아주 여러 번 고개를 숙였어요.`,
    parentNote: "친구가 곤란할 때 대신 나서는 쪽을 택했어요.",
  },
  TURN: {
    body: `"여왕님은 어떤 색이었으면 좋겠어요?" {HERO}{이/가} 물었어요.

여왕이 눈을 크게 떴어요. 아무도 여왕에게 되물은 적이 없었거든요.

여왕은 장미를 한참 바라보았어요. 그리고 처음 듣는 목소리로 조용히 말했어요.

"…흰 것도, 나쁘지 않았지."

카드들이 서로를 쳐다봤어요. 붓을 든 손이 스르르 내려갔어요.`,
    parentNote: "어려운 상황을 질문으로 넘기는 쪽을 택했어요.",
  },
});
```

Represent conditional text as explicit fields, not hidden prose parsing:

```js
C1: {
  body,
  catMeeting: {
    reunion: "{HERO}{은/는} 그 미소를 알아보았어요.\n\n\"또 만났네.\" {HERO}{이/가} 말했어요.",
    first: "{HERO}{은/는} 그 미소를 처음 보았어요.\n\n\"너는 누구야?\" {HERO}{이/가} 물었어요.",
  },
  choices: [
    { id: "secret", label: "붓질 소리를 따라 담장 쪽으로 간다", nextSceneId: "C2", effect: { gardenEntry: "SECRET" } },
    { id: "guest", label: "나팔 소리를 따라 정문으로 간다", nextSceneId: "C2", effect: { gardenEntry: "GUEST" } },
  ],
}
C2: {
  body,
  gardenEntry: {
    SECRET: "{HERO}{은/는} 담장 뒤에 서 있었어요. 카드들은 {HERO}{이/가} 온 걸 아직 몰랐어요.",
    GUEST: "나팔이 울렸어요. 카드들이 붓을 등 뒤로 숨기며 {HERO}{을/를} 돌아봤어요.",
  },
  choices: [
  { id: "truth", label: "하얀 장미였다고 사실대로 말한다", effect: { endingVariation: "TRUTH" } },
  { id: "shield", label: "카드들을 감싸며 다르게 말한다", effect: { endingVariation: "SHIELD" } },
  { id: "turn", label: "웃으며 여왕의 질문을 돌려준다", effect: { endingVariation: "TURN" } },
] }
```

Implement `resolveScene` so C1 inserts the right cat sentence, C2 inserts the entry sentence and ending targets, C2 selects its small/big key, and endings prepend the variation block and append the adjustment sentence and parent-note suffix.

- [ ] **Step 4: Replace vocabulary definitions and remove `COLOR` personalization**

Copy all 28 word/definition pairs from section 10 of the attachment. Update the slot token regexes to exactly `HERO|TREAT|PET` and remove `COLOR` from defaults and allowed values.

- [ ] **Step 5: Run focused tests**

Run: `cd alice-branching-mvp && node --test tests/personalization.test.mjs tests/story-data.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add alice-branching-mvp/src/personalization.js alice-branching-mvp/src/story-data.js alice-branching-mvp/src/vocabulary.js alice-branching-mvp/tests/personalization.test.mjs alice-branching-mvp/tests/story-data.test.mjs
git commit -m "feat: replace alice story with full manuscript"
```

### Task 2: Per-run story state and full transition flow

**Files:**
- Modify: `alice-branching-mvp/src/session.js`
- Modify: `alice-branching-mvp/src/app.js`
- Modify: `alice-branching-mvp/tests/session.test.mjs`
- Modify: `alice-branching-mvp/tests/ui.test.mjs`
- Modify: `alice-branching-mvp/tests/app-integration.test.mjs`

**Interfaces:**
- Produces `applyStoryEffect(session, effect)`.
- Extends `choosePath(state, nextSceneId, selectedLabel, choiceId)`.
- Current session and current run both expose `storyState: { encounterId, gardenEntry, endingVariation }` as values are selected.

- [ ] **Step 1: Add failing state and six-route integration tests**

```js
let session = createSession({}, start);
session = applyStoryEffect(session, { encounterId: "A2" });
session = applyStoryEffect(session, { gardenEntry: "SECRET" });
session = applyStoryEffect(session, { endingVariation: "TURN" });
assert.deepEqual(session.storyState, { encounterId: "A2", gardenEntry: "SECRET", endingVariation: "TURN" });
assert.deepEqual(session.runs[0].storyState, session.storyState);
```

For each encounter, drive `S00 -> S01/S02 -> encounter -> chip response -> C1 -> C2 -> mapped ending`, assert the two condition choices set state, and assert restart clears `storyState` while preserving `endingsSeen`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `cd alice-branching-mvp && node --test tests/session.test.mjs tests/ui.test.mjs tests/app-integration.test.mjs`

Expected: FAIL because story state and the common convergence transitions do not exist.

- [ ] **Step 3: Add immutable story-state updates**

Initialize `{}` in both session and run records. Implement:

```js
export function applyStoryEffect(session, effect = {}) {
  const storyState = { ...session.storyState, ...effect };
  return updateCurrentRun({ ...session, storyState }, current => ({
    ...current,
    storyState: { ...current.storyState, ...effect },
  }));
}
```

Reset only current-run path, chip choices, vocabulary, and story state in `restartRun`.

- [ ] **Step 4: Apply authored choice effects and resolve dynamic endings**

Pass `data-choice-id` from every renderer. In `choosePath`, look up the current resolved choice by id, apply its effect, and reject mismatched target/id combinations. Before rendering, call `resolveScene(rawScene.id, session)` and pass the resolved copy to the selected UI.

- [ ] **Step 5: Run focused tests**

Run: `cd alice-branching-mvp && node --test tests/session.test.mjs tests/ui.test.mjs tests/app-integration.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add alice-branching-mvp/src/session.js alice-branching-mvp/src/app.js alice-branching-mvp/tests/session.test.mjs alice-branching-mvp/tests/ui.test.mjs alice-branching-mvp/tests/app-integration.test.mjs
git commit -m "feat: add full alice branching state"
```

### Task 3: Three-slot onboarding and common gray illustration placeholder

**Files:**
- Modify: `alice-branching-mvp/src/ui.js`
- Modify: `alice-branching-mvp/src/ui-variants/minimal-text.js`
- Modify: `alice-branching-mvp/src/ui-variants/visual-novel.js`
- Modify: `alice-branching-mvp/styles.css`
- Modify: `alice-branching-mvp/styles/minimal-text.css`
- Modify: `alice-branching-mvp/styles/visual-novel.css`
- Modify: `alice-branching-mvp/tests/ui.test.mjs`
- Modify: `alice-branching-mvp/tests/ui-variants.test.mjs`

**Interfaces:**
- Produces `renderArtPlaceholder(artKey, className = "story-art-placeholder")` from `ui.js`.
- All UI variants render `<div class="story-art-placeholder" role="img" aria-label="삽화: IMAGE_KEY"><span>IMAGE_KEY</span></div>`.

- [ ] **Step 1: Add failing placeholder and onboarding tests**

For current, minimal, and visual-novel renderers, render `S00`, `C2` on A/B state, and all endings. Assert the exact image key text, `role="img"`, accessible label, and shared class. Assert HTML contains no `.svg`, `background-image`, `vn-sprite`, or asset-manifest path. Assert setup/onboarding contains only `HERO`, `PET`, `TREAT` and no `COLOR`/색깔 question.

- [ ] **Step 2: Run UI tests and confirm failure**

Run: `cd alice-branching-mvp && node --test tests/ui.test.mjs tests/ui-variants.test.mjs`

Expected: FAIL because current CSS art and visual-novel assets are still rendered.

- [ ] **Step 3: Add the shared placeholder renderer and CSS**

```js
export function renderArtPlaceholder(artKey, className = "story-art-placeholder") {
  const key = escapeHtml(artKey);
  return `<div class="${escapeHtml(className)} story-art-placeholder" role="img" aria-label="삽화: ${key}"><span>${key}</span></div>`;
}
```

```css
.story-art-placeholder {
  display: grid;
  place-items: center;
  min-height: 240px;
  padding: 24px;
  color: #303030;
  background: #bdbdbd;
  border: 1px solid #8c8c8c;
  text-align: center;
}
.story-art-placeholder > span { overflow-wrap: anywhere; font: 700 1rem/1.4 ui-monospace, monospace; }
```

Use it in setup (`start_rabbit_hole`), scene, chip response, ending, minimal, and visual-novel screens. Remove the visual-novel manifest import and sprite/background markup.

- [ ] **Step 4: Reduce onboarding to three questions and update counters**

Remove color controls and the color rabbit question. Update story progress to seven narrative stages and ending collection counters from `/3` to `/6`. Add all six fragment names/tones/marks to the visual-novel reward map.

- [ ] **Step 5: Run focused UI tests**

Run: `cd alice-branching-mvp && node --test tests/ui.test.mjs tests/ui-variants.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add alice-branching-mvp/src/ui.js alice-branching-mvp/src/ui-variants/minimal-text.js alice-branching-mvp/src/ui-variants/visual-novel.js alice-branching-mvp/styles.css alice-branching-mvp/styles/minimal-text.css alice-branching-mvp/styles/visual-novel.css alice-branching-mvp/tests/ui.test.mjs alice-branching-mvp/tests/ui-variants.test.mjs
git commit -m "feat: use labeled art placeholders"
```

### Task 4: Full regression and documentation update

**Files:**
- Modify: `alice-branching-mvp/README.md`
- Modify: any failing test whose old assertion explicitly describes the superseded three-ending graph or four-slot onboarding

**Interfaces:**
- Consumes the full story graph, state resolver, and placeholder contract from Tasks 1-3.
- Produces a documented, fully passing app.

- [ ] **Step 1: Run the complete test suite**

Run: `cd alice-branching-mvp && npm test`

Expected: PASS. Any failure must be classified as an implementation defect or a superseded old-MVP assertion before changing code or tests.

- [ ] **Step 2: Update README runtime facts**

Document 17 nodes, six collected endings, three variations, the three personalization slots, and the placeholder replacement workflow. Remove claims about three endings, color selection, or supplied runtime SVG art.

- [ ] **Step 3: Run static completion audits**

Run: `rg -n 'COLOR|결말.{0,10}/3|endingCount.{0,20}3|visualNovelAssets|\.svg|background-image' alice-branching-mvp/src alice-branching-mvp/tests alice-branching-mvp/README.md`

Expected: no live-code/test/document reference that contradicts the new contract. CSS gradients unrelated to story images are allowed; runtime artwork URLs are not.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 4: Run final tests again**

Run: `cd alice-branching-mvp && npm test`

Expected: PASS with all test files and zero failures.

- [ ] **Step 5: Commit**

```bash
git add alice-branching-mvp/README.md alice-branching-mvp/tests alice-branching-mvp/src alice-branching-mvp/styles.css alice-branching-mvp/styles
git commit -m "docs: finalize full alice story workflow"
```
