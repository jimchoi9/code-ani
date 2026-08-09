# Story Fragment Reward Design

## Trigger

Play the reward only when the visual-novel flow reaches an ending not already present in `session.endingsSeen`. Do not replay it for collected endings or restored/reloaded ending screens.

## Sequence

Use a full-screen dark-indigo overlay. Gold rays open behind a treasure card, twelve light fragments fly inward, the card rises and settles with a brief impact pulse, and the ending-specific fragment name and collection count appear. The final state offers `보물 확인하기`; dismissing it reveals the existing ending actions.

Fragments use existing ending semantics: curiosity is violet/gold, joy is magenta/gold, and confidence is emerald/gold. No new image asset or animation dependency is introduced.

## Motion

CSS provides the stable final composition and fallback. Web Animations API drives the ray, fragment, card, and impact timing. A tap on the overlay or confirmation control finishes all animations immediately. `prefers-reduced-motion` uses a short opacity transition only.

## Constraints

- Visual-novel endings only.
- First collection only.
- Animation must never block progress permanently.
- Existing test telemetry, ending replay, and normal variants remain unchanged.
