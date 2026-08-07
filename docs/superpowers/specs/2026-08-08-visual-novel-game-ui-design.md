# Visual Novel Game UI Redesign

## Direction

Translate the supplied dark fantasy mobile-game reference into the full visual-novel variant without copying branded art. Use a deep indigo diamond-pattern shell, gold-edged title plaques, a compact player HUD, framed scene art, a dark dialogue deck, cyan and magenta choice cards, and a real-state progress footer.

## Scope

- Apply to visual-novel setup, scenes, chip responses, endings, recovery, and vocabulary panel.
- Keep current and minimal variants unchanged.
- Keep all mock artwork and asset mappings unchanged.
- Preserve story transitions, storage, action attributes, labels, and touch targets.
- Do not create fake currency, health, inventory, quest, or settings functionality. HUD values must come from scene progress, tapped vocabulary, and endings seen.

## Layout

All visual-novel screens use a shared portrait `vn-game-frame`. The top HUD shows an Alice avatar medallion, player name, current story level, and real collection counts. A gold-edged title plaque identifies the current screen. Story scenes place the existing background and sprite in an inset frame, with dialogue anchored beneath it and choices using alternating cyan/magenta game cards. The bottom status dock shows real progress, vocabulary, and ending counts.

Setup replaces the scenic split with a dark framed form panel. Ending screens retain the scene art and use the same frame while emphasizing ending progress. Mobile fills the viewport; desktop centers a portrait game panel.

## Verification

Run visual-novel focused tests, syntax/diff checks, and browser inspection at mobile and desktop sizes. Confirm no current, minimal, story-data, or asset diff.
