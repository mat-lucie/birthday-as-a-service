# Design Specification — Birthday Week

## Vision
A curated exhibition, not a website. The Digital Archivist treats a 30th birthday week like a gallery catalog — editorial, physical, and intentional.

## Consumer
Primary consumer: **Human** (birthday guests receiving personalized invitations)

## Audience
Close friends and family, ages 25-35. Opening the link on their phone via WhatsApp or text. State of mind: curious, excited, possibly in transit. Must feel special immediately.

## Inspirations
- **Claude Design project "The Big 30 Focus" — Forest Edition** — the direct source
- **High-end gallery catalogs** — bespoke stationery, editorial typography as lead visual
- **Physical Layering philosophy** — depth through tone, not borders or shadows

## Aesthetic Direction
**The Archival Curator.** Moving away from rigid, "templated" web interfaces. Prioritizes white space as a functional element, treats typography as a lead visual. Designers must embrace **Intentional Asymmetry** — large-scale display typography offset from the main content grid, imagery bleeding off-edge or overlapping container boundaries.

## Typography
- **Display/Headlines:** Noto Serif (400 weight) — "Gallery Titles." Use sparingly to anchor a page. Display-lg at 3.5rem with -0.02em tracking.
- **Body:** Noto Serif — the brand's soul. Maintain line-height of 1.6 for the "Archival" feel. Use for almost everything except labels.
- **Labels:** Inter — all-caps with +0.05em letter-spacing. For metadata, dates, and small navigational cues to contrast the serif dominance.
- **Hierarchy rule:** Always pair a large serif headline with a significantly smaller sans-serif label. Extreme scale contrast creates the editorial look.

## Color System

### Surface & Background (Vellum)
- **Surface (base):** `#fcf9ef` — warm, breathable off-white ("Vellum")
- **Surface bright:** `#fcf9ef`
- **Surface dim:** `#dddad0` (past/inactive states)
- **Surface container lowest:** `#ffffff`
- **Surface container low:** `#f7f4e9`
- **Surface container:** `#f1eee4`
- **Surface container high:** `#ebe8de`
- **Surface container highest:** `#e5e2d9`
- **Surface variant:** `#e5e2d9`
- **Surface tint:** `#306859`

### Primary (Slate & Forest)
Deep, intellectual forest greens. For high-impact moments — hero backgrounds, heavy-set typography, primary CTAs.
- **Primary:** `#002e24` — deepest forest
- **Primary container:** `#034638` — the signature green
- **On primary:** `#ffffff`
- **On primary container:** `#7ab3a1` — light sage (text ON dark green backgrounds)
- **Primary fixed:** `#b4efdb` — light mint
- **Primary fixed dim:** `#98d2bf` — sage green

### Secondary (Slate Tones)
Sophisticated low-chroma tones bridging deep green and light vellum.
- **Secondary:** `#55615f`
- **Secondary container:** `#d5e2df` — greenish mist (for chips, tags)
- **On secondary:** `#ffffff`
- **On secondary container:** `#596563`

### Tertiary (Olive & Sage)
- **Tertiary:** `#242919`
- **Tertiary container:** `#3a3f2e`
- **Tertiary fixed:** `#e0e5cc` — sage (for accent chips, dress codes)
- **Tertiary fixed dim:** `#c4c9b1` — muted sage
- **On tertiary:** `#ffffff`
- **On tertiary container:** `#a5aa94`

### Utility
- **Outline:** `#707975`
- **Outline variant:** `#bfc9c4` (Ghost Borders at 20% opacity only)
- **Error:** `#ba1a1a`
- **On surface:** `#1c1c16`
- **On surface variant:** `#404945` — green-tinted gray
- **Inverse surface:** `#31312a`
- **Inverse on surface:** `#f4f1e7`
- **Inverse primary:** `#98d2bf`

## Spatial Philosophy
- **Density:** Spacious. The "Curator" theme thrives on the luxury of space. If a section needs more space, double the current value.
- **Content padding:** 2.75rem for major sections
- **Component gap:** 0.7rem (1.4rem between list items)
- **Editorial margin:** 5.5rem for page margins (desktop)
- **Grid:** 12-column editorial grid. UI controls on strict grid, display text can break across columns.

## Motion & Interaction
- **Personality:** Smooth, unhurried. Nothing snappy or bouncy.
- **Card hover:** Background transitions from `surface` to `surface-container-lowest` with Ghost Border appearing at 20% opacity
- **RSVP toggle:** Smooth state transition with primary-container fill
- **Loading:** Shimmer animation in forest green tones (`#034638` to `#306859`)
- **Shadows:** "Botanical Shadow" — `0px 20px 40px rgba(0, 46, 36, 0.06)`. Uses primary green tint rather than black.

## The "No-Line" Rule
**Explicit prohibition:** No 1px solid borders for sectioning or containment. Layout boundaries established through:
1. **Background color shifts:** `surface-container-low` to distinguish sections from `surface` body
2. **Negative space:** Use upper tiers of spacing scale to create voids signaling content transitions

Treat the interface as a stack of fine paper:
- Base: `surface` (#fcf9ef)
- Sectioning: `surface-container-low` (#f7f4e9)
- Interactive cards: `surface-container-highest` (#e5e2d9)

### Ghost Border Fallback
If accessibility requires a container outline: `outline-variant` (#bfc9c4) at **20% opacity**. It should be a whisper, not a statement. High-contrast borders are forbidden.

### Glassmorphism
For floating elements: `surface` at 80% opacity with `backdrop-filter: blur(12px)`. Allows warm vellum tones to bleed through.

## Anti-patterns
- **No pure black (#000000)** — use `primary` (#002e24) or `on-surface` (#1c1c16)
- **No rounded corners** — everything 0px radius. Sharp 90-degree corners reinforce the archival/paper aesthetic. Non-negotiable.
- **No loud icons** — hairline-thin (1pt) stroke icons only
- **No "SaaS template" feel** — no blue links, no card grids with drop shadows, no generic hero sections
- **No 1px grid lines** — use gutters (1.4rem) and tonal shifts instead
- **No high-contrast borders** — never use 100% opaque borders. It breaks the "Vellum" illusion.

## Component Guidelines

### Buttons
- **Primary CTA:** `#034638` (primary-container) background, white text, **0px radius**
- **Ghost/Tertiary:** No background. Text in `primary`. Subtle underline appears on hover.
- **CTA gradient:** Subtle linear gradient from `primary` (#002e24) to `primary-container` (#034638) at 45-degree angle

### Event Cards
- Glassmorphism surface (white at 80% opacity, backdrop-blur)
- No borders, no rounded corners
- Date label: all-caps Inter, letter-spaced
- Title: large Noto Serif
- Time + location: small, on-surface-variant color
- RSVP button integrated into card

### Selection Chips / Tags
- **Date chips:** `secondary-container` (#d5e2df) background with `on-secondary-container` (#596563) text
- **Dress code / accent chips:** `tertiary-fixed` (#e0e5cc) background with `on-tertiary-container` (#a5aa94) text
- **No rounded corners**

### Input Fields
- Bottom-border only (Ghost Border at 20% opacity)
- Labels: `label-md` (Inter) positioned above
