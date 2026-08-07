# Current Storybook UI Redesign

## Goal

Redesign the entire `current` variant to follow the supplied portrait story-game reference: a framed parchment book, strong story hierarchy, a large framed scene, centered prose, illustrated-feeling choice tiles, and compact game HUD elements. The result should feel like an Alice storybook game without copying branded artwork or controls.

## Scope

- Apply to setup, story scenes, chip response, endings, recovery, and vocabulary panel in the `current` renderer.
- Keep the visual-novel and minimal renderers unchanged.
- Keep all existing mock illustrations and story data unchanged.
- Preserve every existing action, persistence rule, accessibility label, and story transition.

## Structure

Each current screen receives a shared `storybook-shell` presentation:

1. A parchment-colored portrait book frame constrained to a comfortable desktop width and full-width mobile layout.
2. A compact masthead with an Alice profile medallion, title/subtitle, and a menu-like progress medallion. The medallion displays real scene progress rather than opening a nonexistent menu.
3. A framed scene-art region. Existing CSS mock art remains intact inside this frame.
4. A centered reading region containing prose, feedback, vocabulary, and choices.
5. A bottom book flourish/HUD using only real state: current scene, collected words, and ending count where available. It is informational, not a fake navigation bar.

Setup uses the same book frame, with the existing scene art as its cover image and the name/preferences rendered as compact parchment option tiles. Story and ending screens retain their existing content order. On desktop the current split layout is replaced by a centered portrait book so the reference composition remains recognizable; on mobile the frame loses heavy outer decoration and fills the viewport.

## Visual Language

- Warm parchment base with subtle CSS-only paper grain; dark cocoa text; muted antique-gold accents; forest green and mushroom red for choice differentiation.
- Thin ornamental borders, layered inset highlights, and soft shadows instead of heavy black outlines.
- Serif display headings and readable Korean body typography.
- Choice tiles use small CSS icon medallions derived from existing choice order; no new image assets are required.
- Motion is limited to a 1-2px hover/press response and disabled under reduced motion.

## Accessibility And Responsive Behavior

- Interactive targets remain at least 44px high.
- Keyboard focus remains clearly visible with a high-contrast 2px ring.
- Text remains selectable and reflows without horizontal scrolling from 320px upward.
- Decorative flourishes and mock art remain hidden from assistive technology.
- The layout must not introduce fake interactive controls.

## Verification

- Confirm all current renderer screen types contain the shared shell and preserve their existing actions.
- Inspect setup, story, chip response, ending, and recovery at mobile and desktop sizes.
- Confirm visual-novel, minimal, story data, and mock image assets have no diff.
- Run focused current-renderer tests plus syntax and diff checks; skip unrelated full-suite tests.
