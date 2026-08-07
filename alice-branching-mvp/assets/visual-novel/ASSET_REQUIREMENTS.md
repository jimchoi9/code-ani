# Visual Novel Production Asset Requirements

These local SVGs are intentionally lightweight comparison mocks. Replace each mock URL in `manifest.js` with the final raster filename below only after the production asset has been approved. Keep the manifest keys and scene mappings unchanged.

## Backgrounds

| Final filename | Intended scene / use | Dimensions / ratio | Composition | Style continuity / replacement notes |
| --- | --- | --- | --- | --- |
| `rabbit-hole.webp` | `rabbitHole`; S00 opening garden | 1920 x 1200, 16:10 | Sunny garden and round rabbit hole in the lower-middle distance; leave lower center open for the rabbit sprite and dialogue. | Soft watercolor storybook, bright and safe for ages 7-9; include pocket-watch and map hints, no character, text, logo, or watermark. Replace `backgrounds/rabbit-hole.svg`. |
| `tiny-garden.webp` | `tinyGarden`; S01 discovery scene | 1920 x 1200, 16:10 | Giant flowers frame a tiny ornate door; reserve lower center for dialogue and sprite placement. | Match the shared sky blue, leaf green, cherry red, warm yellow palette with restrained violet accents; dewy, inviting, no characters. Replace `backgrounds/tiny-garden.svg`. |
| `cheshire-tree.webp` | `cheshireTree`; A1, E1 | 1920 x 1200, 16:10 | Curving old tree on a wide clearing; friendly floating crescent smile in the upper-side area; lower center remains readable. | Continue painterly paper texture and clear silhouettes; purple-green accents, whimsical rather than eerie, no character body or text. Replace `backgrounds/cheshire-tree.svg`. |
| `tea-party.webp` | `teaParty`; A3, E3 | 1920 x 1200, 16:10 | Long outdoor tea table receding across the scene, mismatched cups, clocks, and hats; maintain a clean lower-center overlay zone. | Preserve the same warm children's-book watercolor treatment and bright daylight; props only, no characters or text. Replace `backgrounds/tea-party.svg`. |
| `giant-land.webp` | `giantLand`; S02, E5 | 1920 x 1200, 16:10 | Elevated view toward winding river, white castle, and colorful garden; side and upper detail with a calm lower center. | Keep broad painterly shapes and saturated but gentle color; welcoming adventure mood, no characters or text. Replace `backgrounds/giant-land.svg`. |
| `giant-mushroom.webp` | `giantMushroom`; B2 | 1920 x 1200, 16:10 | Enormous mushroom grove, mist rings, and a broad cap; preserve the lower center for the caterpillar sprite and dialogue. | Maintain shared watercolor/paper texture and legible silhouettes; soft magical mist, no frightening elements, text, or character. Replace `backgrounds/giant-mushroom.svg`. |

## Character Sprites

| Final filename | Intended scene / use | Dimensions / ratio | Composition | Style continuity / replacement notes |
| --- | --- | --- | --- | --- |
| `white-rabbit.png` | `rabbit`; S00 | 900 x 1400 transparent PNG, 9:14 | Full-body white rabbit, centered, front three-quarter view, with generous transparent padding. | Use the same watercolor line and color language as the backgrounds; friendly, expressive, no ground shadow, text, logo, or watermark. Replace `characters/white-rabbit.svg`; retain alpha. |
| `cheshire-cat.png` | `cat`; A1 | 900 x 1400 transparent PNG, 9:14 | Full-body friendly Cheshire cat, centered, front three-quarter view, with generous transparent padding. | Use a playful violet-green accent range consistent with the tree scene; preserve clean silhouette and full transparency outside the subject. Replace `characters/cheshire-cat.svg`; retain alpha. |
| `mad-hatter.png` | `hatter`; A3 | 900 x 1400 transparent PNG, 9:14 | Full-body whimsical Mad Hatter, centered, front three-quarter view, with generous transparent padding. | Continue the warm, painterly storybook treatment; expressive and kind for ages 7-9, transparent canvas only. Replace `characters/mad-hatter.svg`; retain alpha. |
| `caterpillar.png` | `caterpillar`; B2 | 900 x 1400 transparent PNG, 9:14 | Full-body calm blue caterpillar, centered, front three-quarter view, with generous transparent padding. | Match the soft mushroom-grove palette and approachable visual language; no floor, shadow, background, text, logo, or watermark. Replace `characters/caterpillar.svg`; retain alpha. |

## Delivery Notes

- Final backgrounds must be browser-safe WebP files at a 16:10 aspect ratio; final sprites must be transparent PNG files with no baked backdrop.
- Keep all ten final images self-contained and locally hosted. Do not introduce external image URLs.
- The final set should share a soft watercolor children's-storybook medium, painterly paper texture, clear silhouettes, and bright, safe fantasy lighting.
