# Alice Branching MVP Design

## Goal

Build a child-playable branching story demo in a new `alice-branching-mvp` folder. The demo tests whether children feel interested in a choice-based fantasy story where their selections seem to shape the story.

This MVP prioritizes playability and quick observation over AI realism. It does not include free text input or live AI generation. The "my imagination came true" feeling comes from personalization slots, visible branch changes, and authored response chips.

## Target Test

The demo should answer these questions:

- Does a child want to continue after the first personalized setup?
- Does the child notice that their choices changed the story?
- Does the child want to replay to see another ending?
- Do vocabulary taps feel like a small reward rather than a reading interruption?

Success is qualitative first: the child finishes one run, talks about their choices, or asks to try another path. Quantitative signals are stored locally for later inspection.

## Scope

Included:

- Alice-inspired fantasy story using the provided L1 manuscript as source material.
- 5 to 7 playable screens per run, ending within about 5 minutes.
- Prologue personalization slots:
  - hero name
  - favorite treat
  - companion pet
  - favorite color
- Korean particle handling for simple personalized sentences.
- First branch:
  - open the small door and shrink
  - eat the treat and grow
- A second decision on the shrink path, while the grow path proceeds directly to one character encounter for the first MVP.
- Three MVP endings:
  - `E1` Wise Smile / curiosity
  - `E3` Cheerful Friend / playfulness
  - `E5` Confidence / self-assurance
- Authored choice chips at former `[AI]` insertion points.
- Tappable vocabulary words with inline definitions.
- Local session state in `localStorage`, including selected slots, path, ending seen, chip choices, and tapped vocabulary.
- Small ending collection display such as `1/3`.

Excluded:

- Free text input.
- Live AI API calls.
- AI guardrails, moderation, retries, and timeout fallback.
- Parent-note analytics beyond the authored ending note.
- Remote event tracking.
- Account login or cross-device persistence.

## Story Shape

The full manuscript supports six endings, but the MVP uses a focused subset to keep the first demo tight. The resulting branch shape is intentionally asymmetrical: the shrink path offers two encounters, and the grow path uses one encounter.

```text
Prologue
  -> S00 Rabbit Hole
      -> S01 Magic Door
          -> A1 Cheshire Cat -> E1 Wise Smile
          -> A3 Tea Party    -> E3 Cheerful Friend
      -> S02 Mysterious Treat
          -> B2 Caterpillar  -> E5 Confidence
```

The unused manuscript branches remain useful future expansion material:

- `A2` Caterpillar after shrinking
- `B1` Cat after growing
- `B3` Tea party after growing
- `E2`, `E4`, `E6`

## Interaction Design

### Prologue

The setup is presented as "story preparation" rather than a survey. Each slot gets one small screen or compact step:

- Name input accepts Korean names from 2 to 6 characters.
- Treat, pet, and color use large tap targets.
- Defaults are used quietly if a value is missing or invalid.

### Story Screens

Each screen includes:

- Scene title.
- Illustrated stage area using CSS/SVG shapes or simple authored visual layers.
- Story text with personalized slots already resolved.
- Tappable vocabulary words.
- 1 to 3 large choice buttons.
- A small progress indicator.

The demo should feel like a storybook first. Controls should be obvious but not crowded.

### Authored Response Chips

Former `[AI]` insertion points become deterministic chip choices.

Example for the Cheshire Cat:

- Prompt: `고양이가 물었어요. "너는 무엇이 제일 궁금해?"`
- Chips:
  - `이 길 끝에 뭐가 있어?`
  - `너는 왜 웃고 있어?`
  - `여기서 나갈 수 있어?`
- After choosing, an authored response appears and the scene continues.

The chosen chip is recorded as `child_choice_text` and shown again in the ending as:

```text
네가 고양이에게 고른 말
"이 길 끝에 뭐가 있어?"
```

This keeps the ownership loop without exposing unreviewed child text.

## Data Model

Use plain JavaScript modules so the project can run without a build step.

```js
story = {
  id,
  title,
  slots,
  scenes,
  endings,
  vocabulary,
};
```

Scene records:

```js
{
  id,
  type: "story" | "choice" | "chip" | "ending",
  title,
  art,
  body,
  vocab: ["황급히", "먹음직스러운"],
  choices: [
    { label, nextSceneId, trait }
  ],
  chips: [
    { label, response, nextSceneId }
  ]
}
```

Session records:

```js
{
  slots: { HERO, TREAT, PET, COLOR },
  path: ["S00", "S01", "A1", "E1"],
  chipChoices: [{ sceneId, label }],
  vocabTapped: ["황급히"],
  endingsSeen: ["E1"]
}
```

## Personalization Rules

- Slot replacement is string-based.
- Scene text should use at most two personalized slots per paragraph.
- Name validation accepts only Hangul names with 2 to 6 characters.
- Invalid names fall back to `앨리스`.
- Particle selection supports the common pairs needed in the manuscript:
  - `이/가`
  - `은/는`
  - `을/를`
  - `와/과`

## Vocabulary

Each implemented scene uses one or two vocabulary targets from the manuscript. A tapped word opens a small definition panel near the story text and adds the word to the local word pouch.

The MVP should include these words at minimum:

- 황급히
- 먹음직스러운
- 낯선
- 흐드러지게
- 의미심장하게
- 엄중하게
- 덤덤하게
- 굳이

## Architecture

Use an independent static web app:

```text
alice-branching-mvp/
├── index.html
├── package.json
├── README.md
├── styles.css
├── src/
│   ├── app.js
│   ├── story-data.js
│   ├── personalization.js
│   ├── session.js
│   ├── vocabulary.js
│   └── ui.js
└── tests/
    ├── personalization.test.mjs
    ├── story-data.test.mjs
    └── session.test.mjs
```

Responsibilities:

- `story-data.js`: authored scenes, choices, chips, endings, and vocabulary.
- `personalization.js`: slot validation, fallback defaults, particle helpers, template rendering.
- `session.js`: localStorage read/write and session updates.
- `vocabulary.js`: word lookup and tapped-word tracking.
- `ui.js`: DOM rendering helpers.
- `app.js`: route current state through render and interaction handlers.

## Error Handling

- If localStorage is unavailable, keep state in memory for the current run.
- If a scene id is missing, show a gentle restart screen.
- If a slot is invalid, use the default without stopping the child.
- If a vocabulary definition is missing, the word remains readable and no panel opens.

## Testing

Automated tests:

- Personalization replaces slots and selects Korean particles correctly.
- Invalid names fall back to `앨리스`.
- Story data has no dangling `nextSceneId` references.
- Every MVP ending is reachable.
- Session state records paths, endings, chip choices, and vocabulary taps.

Manual checks:

- One run can complete in about 5 minutes.
- Mobile width around 390px has no horizontal overflow.
- All choice buttons are easy to tap.
- Ending screen clearly repeats a previous chip choice.
- Replay starts cleanly while preserving endings seen.

## Future Expansion

After observing children with the branching demo:

- Add the remaining three endings from the manuscript.
- Add optional free text at one encounter.
- Replace authored chip responses with mock AI.
- Add real AI generation with input/output guardrails.
- Add local export or parent review of session notes.
