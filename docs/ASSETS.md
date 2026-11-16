# Free game assets: where to find them, how to make them, how to use them safely

Use this guide when you want artwork, icons, sounds, music, fonts or animation for stock-ex.

Three rules from the spec come first:

1. **Original look.** Take ideas from other games, but never copy their assets, branding or code (spec section 10). No logos of real brands or companies except to label a sign-in button. No look-alike of any existing board game.
2. **Clear licences only.** If you can't find the licence in writing, don't use the asset. Sound effects must be **CC0** (spec section 10).
3. **Record everything.** Every third-party asset gets a row in `THIRD_PARTY_NOTICES.md` in the same PR that adds it.

---

## 1. Licences in one table

| Licence | Can we use it? | What we must do |
|---|---|---|
| **CC0 / Public domain** | Yes, the best choice | Nothing legally; we still record it |
| **MIT, ISC, Apache-2.0** (icon sets, code) | Yes | Keep the notice (a row in `THIRD_PARTY_NOTICES.md` does it) |
| **SIL Open Font License** (fonts) | Yes | Don't sell the font file on its own; record it |
| **CC BY 3.0 / 4.0** | Yes | Credit the author **visibly** (the footer credits plus `THIRD_PARTY_NOTICES.md`) |
| **CC BY-SA** | Avoid | Share-alike: our edited versions would have to use the same licence |
| **CC BY-NC** / "non-commercial" / "personal use only" | **No** | Blocks any future commercial use |
| **CC BY-ND** / "no derivatives" | **No** | We couldn't recolour or edit it |
| A site's own licence (Pixabay, unDraw, LottieFiles) | Usually yes | Read it each time; most ban reselling the asset unchanged |
| No licence stated / "free download" | **No** | Free to download doesn't mean free to use |

**AI-generated images:** only from a tool whose terms grant you commercial rights. Never prompt "in the style of" a living artist or an existing game. Record the tool and date in `THIRD_PARTY_NOTICES.md`. When unsure, ask before using one.

---

## 2. Where to find free assets

### Board-game pieces, cards, dice, tokens (start here)

| Source | Licence | Good for |
|---|---|---|
| **Kenney**: https://kenney.nl/assets (try "Board Game Pack", "Playing Cards Pack", "Boardgame Icons") | CC0 | Dice, chips, pawns, cards, coins, UI panels; very consistent style |
| **OpenGameArt**: https://opengameart.org (filter by licence) | Mixed: pick CC0 or CC BY | Cards, tiles, sounds, music |
| **itch.io free assets**: https://itch.io/game-assets/free | Mixed: read each page | Stylised packs; many are CC0 |

### Icons

| Source | Licence | Notes |
|---|---|---|
| **Lucide**: https://lucide.dev | ISC | Already installed (`lucide-react`); check here first |
| **Tabler Icons**: https://tabler.io/icons | MIT | Many finance icons; matches Lucide's line style |
| **Phosphor**: https://phosphoricons.com | MIT | Has a "fill" weight for chunkier, game-like icons |
| **game-icons.net**: https://game-icons.net | CC BY 3.0 | Thousands of bold game icons (bull, bear, crown, coins); **credit required** |
| **Simple Icons**: https://simpleicons.org | CC0 files; logos are trademarks | Sign-in buttons only, already installed |

### Illustrations and backgrounds

| Source | Licence | Notes |
|---|---|---|
| **unDraw**: https://undraw.co | unDraw licence (free, commercial OK, no credit) | Set the colour picker on the site to our green or yellow before downloading |
| **Open Peeps**: https://www.openpeeps.com | CC0 | Hand-drawn people for avatars or empty states |
| **Haikei**: https://haikei.app | Free generator; you own the output | Waves, blobs and layered hills like our hero background |
| **Hero Patterns**: https://heropatterns.com | CC BY 4.0 | Repeating SVG patterns for a felt-table texture; credit required |
| **SVG Repo**: https://www.svgrepo.com | Mixed per icon | Check the licence line on every single file |

### Sound effects (CC0 only)

| Source | How to stay CC0 |
|---|---|
| **Kenney audio** (UI Audio, Casino Audio, Interface Sounds) | All CC0: dice rolls, chips, card flips, clicks |
| **Freesound**: https://freesound.org | Search, then filter **License → Creative Commons 0**; there's also a CC0 filter on the advanced search |
| **OpenGameArt** | Filter by CC0 |
| **Make your own** | see section 3: jsfxr, ChipTone, Audacity |

### Music

| Source | Licence |
|---|---|
| **Kenney music jingles** | CC0 |
| **OpenGameArt**, filtered to CC0 | CC0 |
| **Pixabay Music**: https://pixabay.com/music | Pixabay Content License (free, commercial OK, no credit; can't resell the track alone) |

### Fonts

**Google Fonts** (https://fonts.google.com) are all open-licensed (mostly OFL). Load them with `next/font/google` in `apps/web/app/layout.tsx` (like Fredoka and Nunito), never from a `<link>` to Google. `next/font` copies them to our own server, which the CSP's `font-src 'self'` requires. Keep it to two families.

### Animations

- **Prefer CSS animations** in `apps/web/app/globals.css` (dice roll, tile pop and card flip already live there). They need no library and respect the motion toggle.
- **LottieFiles** (https://lottiefiles.com) free animations use the Lottie Simple License (commercial OK). Playing them needs a player library: that's a new dependency (DECISIONS.md row) and a CSP check, so ask first.

---

## 3. Making or editing your own (all free)

| Tool | Type | Use it for |
|---|---|---|
| **Figma** (free plan): https://figma.com | Browser vector design | Mock up screens; recolour and combine SVG icons; export SVG |
| **Penpot**: https://penpot.app | Open-source Figma alternative | Same, self-hostable |
| **Inkscape**: https://inkscape.org | Desktop vector editor | Edit downloaded SVGs: recolour, merge, simplify paths |
| **Krita**: https://krita.org | Painting | Hand-drawn card art, textures |
| **GIMP** / **Photopea** (https://photopea.com, browser) | Raster editing | Crop, resize, remove backgrounds from PNGs |
| **Blender**: https://blender.org | 3D | Render dice, coins or tokens to PNG at any angle |
| **jsfxr**: https://sfxr.me · **ChipTone**: https://sfbgames.itch.io/chiptone | Sound generators | Click, coin, success and fail blips; you own the output |
| **Audacity**: https://audacityteam.org | Audio editor | Trim, fade, normalise loudness, export `.ogg`/`.mp3` |
| **BeepBox**: https://beepbox.co | Chiptune composer | Short menu loops |
| **SVGOMG**: https://jakearchibald.github.io/svgomg/ | SVG optimiser (in the browser) | Shrink SVGs before committing |
| **Squoosh**: https://squoosh.app | Image compressor (in the browser) | Convert PNG/JPG to WebP/AVIF |

### Make it look like stock-ex

Use only the theme colours from `packages/config/tailwind/theme.css`, so new art matches:

| Role | Colour |
|---|---|
| Felt green (backgrounds) | `#0e3b24`, `#072a19`, `#154b2f` |
| Cream (text, outlines) | `#fbf8ef` |
| Bull green / bear red | `#3da84a` / `#d32f2f` |
| Tile blue / orange / yellow | `#1f6fd6` / `#f5821f` / `#f8c12c` |

Style tips: thick dark outlines (2–3 px at icon size), rounded corners, flat fills with at most one highlight, no gradients on small icons. Recolouring a Kenney or game-icons SVG to this palette is usually enough to make it fit.

---

## 4. Adding an asset to the project

1. **Check the licence** against section 1, and save the licence page URL.
2. **Edit and optimise.** SVGs through SVGOMG; photos and renders to WebP (or AVIF) under about 200 KB; sounds to `.ogg` (with an `.mp3` fallback), mono, under about 50 KB per effect.
3. **Put it in the right place:**
   - Static files the browser fetches: `apps/web/public/assets/<images|sounds|music>/` (create the folder). They're served from our own origin, as the CSP needs (`img-src 'self'`, media from `'self'`).
   - Small SVG icons or art that should follow theme colours: a React component in `apps/web/src/components/` using `currentColor` or the Tailwind tokens (see `board-art.tsx`).
   - Never hotlink from another site or a CDN. The CSP blocks it, and the file could change under us.
4. **No inline `style="..."` attributes in SVG markup.** The production CSP blocks them. Use SVG attributes (`fill`, `stroke`) or CSS classes.
5. **Record it** in `THIRD_PARTY_NOTICES.md` → "Fonts, sounds and images": asset name, licence, source URL, the files it became, and what you changed (e.g. "recoloured to theme palette").
6. **CC BY assets:** also add the author to the footer credits in `apps/web/src/components/site-chrome.tsx`.
7. **Accessibility:** decorative images get `alt=""` or `aria-hidden="true"`; meaningful ones get a short `alt`. Sounds must respect the mute toggle and never carry information that isn't also shown on screen.

### Example notices row

```markdown
| Dice roll sound (Kenney "Casino Audio", `dice-throw-1`) | CC0-1.0 | https://kenney.nl/assets/casino-audio | web: `public/assets/sounds/dice-roll.ogg` (trimmed, normalised) |
```

---

## 5. What we still need (wish list)

- Sound effects: dice roll, card deal, card flip, coin/buy, sell, price up, price down, your-turn chime, game-over fanfare.
- Avatar set: about 12 friendly characters or tokens (Open Peeps, Kenney, or drawn in our palette).
- Screenshots for the manual: "Creating a room", "The lobby", "The game board" (placeholders in `apps/web/app/how-to-play/page.tsx`), once those screens exist.
- A social-share image (1200×630) for link previews.
