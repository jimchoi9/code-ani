# Visual Novel POV Assets v2.1

The approved MVP art uses first-person point-of-view compositions. `{HERO}` and `{PET}` remain text-only and must not be added to scene illustrations, ending illustrations, reports, icons, or silhouettes. `{COLOR}` is not a supported personalization slot.

## Implemented Assets

| Group | Directory | Count | Format |
| --- | --- | ---: | --- |
| Main story scenes | `scenes/` | 12 | JPEG, 1376 x 768 |
| Endings | `endings/` | 6 | JPEG, 1376 x 768 |
| C2 variation spots | `spots/` | 3 | JPEG, 1376 x 768 |
| **Total** |  | **21** | 16:9 |

The exact filename-to-key mapping is maintained in `manifest.js`. Known keys render as decorative images with empty alt text because the adjacent authored prose describes each scene. Unknown keys retain the neutral placeholder fallback.

## Scene Rules

- `queen_garden_trial_small` is used for the A route and `queen_garden_trial_big` for the B route.
- `spot_truth`, `spot_shield`, and `spot_turn` are displayed as compact ending insets after the corresponding C2 choice.
- No scene character sprite is rendered over POV illustrations.
- Story, ending, and spot assets remain local; do not introduce external image URLs.
- Easy and advanced text levels share the same illustrations.

## Remaining v2.1 Production Assets

These are specified but not part of the current 21-image delivery:

- Four `{TREAT}` transparent overlays: cake, cookie, jelly, and bungeoppang.
- Nine UI/support assets: `cover_title`, `prologue_setup`, `frame_choice`, `frame_word`, `bust_cat`, `bust_caterpillar`, `bust_hatter`, `frame_parent_report`, and `frame_child_quote`.
- Four pre-production sheets: style A, style B, seven-character reference, and prohibited-elements reference.

Legacy SVG backgrounds and character files remain only for compatibility with non-story UI such as the onboarding rabbit avatar. They are not used as visual-novel scene art.
