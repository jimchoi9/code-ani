# Alice Branching MVP Final Fix Report

## Scope

This wave resolves every final-review finding for the complete Alice branching MVP. Changes remain inside `alice-branching-mvp/` except for this report.

## TDD Evidence

### Baseline

Command:

```text
cd alice-branching-mvp && npm test
```

Result: PASS, 40 tests, 0 failures.

### RED

Tests were added before production changes, then run with:

```text
node --test tests/personalization.test.mjs tests/story-data.test.mjs tests/ui.test.mjs
```

Result: expected FAIL, 39 tests total, 31 passed, 8 failed.

The failures reproduced these missing behaviors:

1. Bare particles after slot tokens were not rejected.
2. Authored text rendered `지민는` instead of `지민은`.
3. S01 still advertised three sounds and S02 still advertised three paths.
4. The setup name input still had `required`.
5. S02 rendered `data-action="choose"` instead of a mandatory continuation action.
6. No pure `continueStory` transition existed.
7. S00 rendered as `2번째 장면`.
8. No delegated submit/click binding boundary was available to smoke-test.

### First GREEN Attempt

The same focused command produced 38/40 passing tests and identified two incomplete details:

- `E1.body` still contained one bare `{HERO}는` occurrence.
- Particle-token source length and rewritten prose made the declared reading estimates stale.

The remaining occurrence was converted and every affected `estimatedReadSeconds` value was recalculated with the existing 450-character-per-minute model.

### GREEN

The focused command then passed: 40 tests, 0 failures.

Final full command:

```text
npm test && node --check src/app.js && git -C .. diff --check
```

Result: PASS. `npm test` reported 49 tests, 49 passed, 0 failed; syntax and whitespace checks exited 0 with no output.

## Fixes

### Particle Authoring and Rendering

- Replaced every variable Korean particle adjacent to a slot in `story-data.js` with one of `{은/는}`, `{이/가}`, or `{을/를}`.
- Reworded the E5 copula sentence so it also renders naturally for names with and without a final consonant.
- `renderTemplate` now rejects bare supported particles immediately after any slot token and tells authors to use a particle token.
- Added rejection tests, recursive validation of every authored story string, and rendered checks for `지민/민서`, `토끼/고양이`, plus final-consonant particle selection with `곰`.

### Empty Name Contract

- Removed native `required` from the name input.
- Added a renderer/form contract proving the empty value can submit and `normalizeSlots` supplies `앨리스`.

### Graph-Accurate Prose and Continuation

- S01 now introduces only the implemented cat laughter and tea-cup sounds.
- S02 now leads directly and naturally toward the single giant-mushroom route without advertising three choices.
- Mandatory continuation renders as `data-action="continue"`.
- Added `continueStory`, which navigates with `feedback: null`, so B2 never renders `네가 고른 길: 계속 읽기`.
- Added pure renderer/transition coverage and delegated click coverage for this branch.

### Ordinal and Data Integrity

- Scene ordinal now uses `session.path.length`; S00 is scene 1 and a restored S01 is scene 2.
- Added an exact `story.sceneOrder` assertion.
- Added validation that every `scene.vocab` item resolves through `getVocabulary`.
- Existing route checks remain green: every ending route is 6 screens including setup and chip response. Estimated route times remain below five minutes: E1 224 seconds, E3 227 seconds, E5 238 seconds.

### Delegated Event/Form Smoke

- Extracted `bindAppEvents` without changing browser behavior.
- A dependency-free fake event host mounts the actual delegated `submit` and `click` listeners, verifies `preventDefault`, empty-name fallback, S00 start, mandatory continuation to B2, and null feedback.

## Residual Concern

No external DOM package was added. The smoke test covers this app's delegated listener and transition boundary, but it does not execute browser-native `FormData`, `Element.closest`, focus, or actual DOM replacement semantics. The existing final browser QA recorded in `progress.md` remains the end-to-end browser evidence; a future browser regression suite could automate that layer if the project adopts one.
