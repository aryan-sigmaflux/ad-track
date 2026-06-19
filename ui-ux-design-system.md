# UI/UX Design System Documentation
> Derived from a warm-minimal mobile app concept — clean interface, intuitive flow, delightful experience.

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Grid](#4-spacing--grid)
5. [Elevation & Shadows](#5-elevation--shadows)
6. [Border Radius](#6-border-radius)
7. [Iconography](#7-iconography)
8. [Components](#8-components)
9. [Patterns & Layouts](#9-patterns--layouts)
10. [Navigation](#10-navigation)
11. [Interaction & Motion](#11-interaction--motion)
12. [Accessibility Guidelines](#12-accessibility-guidelines)

---

## 1. Design Philosophy

This system is built around four core principles:

| Principle | Description |
|---|---|
| **Clean Interface** | Simple, minimal, and easy to navigate. Every element earns its space. |
| **Smart Planning** | Surfaces relevant information progressively; avoids cognitive overload. |
| **Secure Experience** | Visual trust signals (lock icons, confirmation text) at all transactional steps. |
| **Personalized** | Content adapts to user context — greetings, recommendations, history. |

**Tone:** Warm, modern, approachable. Not clinical. Not flashy.

---

## 2. Color System

### 2.1 Palette Overview

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-base` | `#FAF8F5` | App background, page canvas |
| `--color-bg-warm` | `#F3EDE5` | Section backgrounds, subtle contrast fills |
| `--color-surface` | `#FFFFFF` | Cards, modals, bottom sheets |
| `--color-text-primary` | `#1C1C1E` | Headings, key labels, important values |
| `--color-text-secondary` | `#6B6B6B` | Subtitles, meta text, placeholder copy |
| `--color-text-tertiary` | `#A8A8A8` | Inactive labels, disabled states |
| `--color-accent` | `#C4986A` | Script accents, decorative underlines, highlights |
| `--color-cta` | `#1C1C1E` | Primary buttons, strong actions |
| `--color-cta-text` | `#FFFFFF` | Text on dark CTA buttons |
| `--color-star` | `#F5A623` | Ratings, review scores |
| `--color-badge-dark` | `#1C1C1E` | Price badges, count overlays |
| `--color-badge-text` | `#FFFFFF` | Text within dark badges |
| `--color-border` | `#EBEBEB` | Card borders, dividers, separators |
| `--color-radio-active` | `#1C1C1E` | Selected radio button fill |
| `--color-tab-active` | `#1C1C1E` | Active segment/tab pill |
| `--color-tab-inactive-bg`| `transparent` | Inactive tab background |

### 2.2 Color Usage Rules

- **Backgrounds** are always warm neutrals — never pure white as the base canvas.
- **Cards** sit on `--color-surface` (white) to lift visually from the canvas.
- **CTAs** use the darkest token (`#1C1C1E`) so they anchor attention without aggressive color.
- **Accent** (`#C4986A`) is used sparingly — decorative script text, thin underlines, never on interactive buttons.
- **Do not** introduce saturated colors into the UI. The photography provides all color richness.

---

## 3. Typography

### 3.1 Type Scale

| Role | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `display-xl` | 32px | 700 (Bold) | 1.15 | Hero headings ("Where do you want to go?") |
| `display-lg` | 26px | 700 | 1.2 | Section titles, destination names |
| `display-md` | 22px | 700 | 1.25 | Card headings, screen titles |
| `heading` | 18px | 600 (Semi-bold) | 1.3 | Sub-section headers, modal titles |
| `subheading` | 15px | 600 | 1.4 | Category labels, tab items |
| `body-md` | 14px | 400 | 1.5 | Body text, descriptions |
| `body-sm` | 13px | 400 | 1.5 | Meta info, secondary context |
| `caption` | 12px | 400 | 1.4 | Timestamps, footnotes, help text |
| `label` | 11px | 500 | 1.3 | Icon labels, bottom nav labels |
| `stat` | 36px | 700 | 1.1 | Big numbers (120+, 2M+) |
| `script-accent` | 18px | 400 (Italic) | 1.4 | Brand taglines, decorative text only |

### 3.2 Font Families

```
Primary (UI): "Inter", "SF Pro Display", system-ui, sans-serif
Script Accent: "Playfair Display Italic" or "Cormorant Italic"
Numeric Heavy: same as Primary — weight does the work
```

### 3.3 Typography Rules

- **Headings** are always left-aligned within content areas; centered only in isolated stat blocks.
- **Greeting text** (e.g., "Hi, Olivia 👋") uses `body-md` weight-400 + an emoji for warmth.
- **Prices** use `display-md` bold with tighter letter spacing (`-0.3px`).
- **Never** mix more than two font families in a single screen.
- **Script/italic** font is decorative only — never used for UI labels or functional text.

---

## 4. Spacing & Grid

### 4.1 Spacing Scale (8pt base grid)

| Token | Value | Common Use |
|---|---|---|
| `space-2` | 2px | Fine dividers, icon-to-label gap |
| `space-4` | 4px | Tight inline gaps |
| `space-8` | 8px | Icon padding, tag internal padding |
| `space-12` | 12px | Between label and value pairs |
| `space-16` | 16px | Card internal padding, section gaps |
| `space-20` | 20px | Screen edge padding (left/right) |
| `space-24` | 24px | Between major card sections |
| `space-32` | 32px | Between distinct screen sections |
| `space-48` | 48px | Large vertical breathing room |

### 4.2 Layout Grid

- **Screen edge margin:** 20px left and right
- **Card internal padding:** 16px all sides
- **Column gutter (horizontal carousels):** 12px between cards
- **Horizontal carousel item width:** ~65–70% of screen width (peeks next card)
- **Section header row:** title left + "View all" link right, vertically centered

### 4.3 Safe Areas

- **Top:** Respect device status bar; content starts below it
- **Bottom:** Bottom navigation bar sits above device home indicator
- **Navigation bar height:** 64px (includes icon + label + padding)

---

## 5. Elevation & Shadows

Cards and surfaces use soft, warm shadows — never harsh or dark.

| Level | CSS Value | Use Case |
|---|---|---|
| `shadow-xs` | `0 1px 3px rgba(0,0,0,0.06)` | Input fields, inactive tabs |
| `shadow-sm` | `0 2px 8px rgba(0,0,0,0.08)` | Standard cards, list items |
| `shadow-md` | `0 4px 16px rgba(0,0,0,0.10)` | Floating modals, bottom sheets |
| `shadow-lg` | `0 8px 32px rgba(0,0,0,0.12)` | Full-screen overlays, drawers |

**Rule:** Shadows should feel like gentle depth, not dramatic elevation. Lean toward `shadow-sm` as the default card treatment.

---

## 6. Border Radius

| Token | Value | Use Case |
|---|---|---|
| `radius-xs` | 4px | Tags, small badges |
| `radius-sm` | 8px | Input fields, small buttons |
| `radius-md` | 12px | Standard cards, image thumbnails |
| `radius-lg` | 16px | Large cards, category buttons |
| `radius-xl` | 20px | Hero image cards, bottom sheets |
| `radius-full` | 9999px | Pills, avatar circles, toggle buttons |

**Rule:** Use larger radii (`radius-lg`, `radius-xl`) on image-bearing cards. Smaller radii on form elements and compact controls.

---

## 7. Iconography

### 7.1 Style

- **Stroke-based** outline icons — 1.5px stroke weight at 24x24px
- **No filled icons** except for active bottom-nav states (filled = selected)
- **Color:** `--color-text-secondary` for inactive; `--color-text-primary` for active/selected

### 7.2 Icon Sizes

| Context | Size |
|---|---|
| Bottom navigation | 24px |
| Section category tabs | 22px |
| Inline / meta info | 16px |
| Feature illustration circles | 40px |
| Stat section icons | 32px |

### 7.3 Icon + Label Pairing

- Label sits below icon with `space-4` gap
- Label uses `label` type style (11px, 500 weight)
- Icon and label share the same color state (both shift on active)

### 7.4 Emoji Usage

- Emoji allowed **only** in personalized greeting lines (e.g., `Hi, Aryan 👋`)
- Never used in navigation, buttons, or functional UI

---

## 8. Components

### 8.1 Search Bar

```
Height:         48px
Border radius:  radius-full (pill shape)
Background:     --color-surface
Border:         1px solid --color-border
Icon (left):    Search icon, --color-text-tertiary, 18px
Placeholder:    "Search destinations, hotels…" — caption style, tertiary color
Filter icon:    Right-aligned, separated by vertical divider, 18px
Padding:        16px horizontal, 12px vertical
```

### 8.2 Category Tab Row

```
Layout:         Horizontal scroll, no wrap
Item:           Icon above, label below, 16px min-width, centered
Spacing:        24–32px between items
Active state:   Icon and label shift to --color-text-primary
Inactive state: --color-text-tertiary
No pill/chip:   Tabs are just icon+label, no background highlight
```

### 8.3 Destination Card (Carousel)

```
Width:          ~160px (adapts to 2.3 cards visible)
Height:         ~200px
Image:          Full bleed, fills card, rounded corners radius-lg
Rating badge:   Bottom-left overlay — dark pill, star icon + score
Favorite icon:  Top-right overlay — white heart on translucent circle
Card label:     Below image — city name (body-md, bold), country (caption, secondary)
Corner radius:  radius-lg on image, radius-md on card container
```

### 8.4 Recommendation Card (Wide)

```
Width:          Full content width (screen - 2x edge margin)
Height:         ~180px
Image:          Full bleed top section (~60% of card height)
Price badge:    Bottom-right of image — dark pill ("$320 / night")
Favorite icon:  Top-right of image
Card body:      Name (subheading, bold), location (caption, secondary), rating
Border radius:  radius-xl
Shadow:         shadow-sm
```

### 8.5 Segmented Control (Tabs)

```
Container:      Pill-shaped, background --color-bg-warm
Active pill:    --color-tab-active background, white text, radius-full
Inactive:       Transparent background, secondary text
Height:         36px
Padding:        4px internal container padding
Transition:     Smooth slide on tab change
```

### 8.6 Primary CTA Button

```
Height:         54px
Border radius:  radius-full (pill) or radius-lg (block)
Background:     --color-cta (#1C1C1E)
Text:           --color-cta-text, 16px, semi-bold
Width:          Full width within content area
Padding:        20px horizontal
State — hover:  Slight opacity reduction (0.85)
State — press:  Scale down slightly (0.97)
```

### 8.7 Secondary / Ghost Button

```
Height:         44px
Border:         1px solid --color-border
Background:     transparent
Text:           --color-text-primary, 14px, medium
Border radius:  radius-md
```

### 8.8 Rating Badge

```
Shape:          Pill
Background:     --color-badge-dark or semi-transparent dark
Icon:           Filled star, --color-star (#F5A623), 12px
Score:          White, 12px, semi-bold
Padding:        4px 8px
```

### 8.9 Image Card Overlay Badge (Price / Count)

```
Position:       Absolute, bottom-right of image
Background:     --color-badge-dark
Text:           White, 12px, bold
Border radius:  radius-xs or radius-sm
Padding:        4px 8px
```

### 8.10 Info Row (Label + Value)

```
Layout:         Horizontal, space-between
Label:          caption, secondary color
Value:          body-sm or body-md, primary color (bold if key figure)
Divider:        Optional 1px --color-border below row
Padding:        12px 0 per row
```

### 8.11 Payment Method Selector

```
Item height:    64px
Layout:         Radio icon (left) + label+subtitle (center) + brand logo (right)
Radio active:   Filled circle, --color-radio-active
Radio inactive: Outline circle, --color-border
Background:     --color-surface
Border:         1px solid --color-border; active border-color: --color-cta
Border radius:  radius-md
Spacing:        space-12 between items
```

### 8.12 Price Summary Block

```
Layout:         Stack of info rows
Divider:        Full-width --color-border line above "Payable Amount" row
Total row:      display-md bold for final amount; stands out visually
Savings row:    Negative value shown in a distinct green or reduced opacity to signal discount
```

### 8.13 Trip Card (List Item)

```
Layout:         Image left (~100px square) + text right + "..." action right
Image:          radius-md, fixed square
Title:          subheading, bold, primary
Date range:     caption, secondary
Bottom row:     Duration badge ("12 days") overlaid on image, bottom-right
Separator:      --color-border between items
```

### 8.14 Stat Block (Footer)

```
Layout:         4-column horizontal row
Per stat:       Icon top (32px, outline) + large number + small label below
Number style:   `stat` type (36px, bold)
Label style:    caption, secondary
Alignment:      Center per column
Background:     --color-bg-base or --color-bg-warm
Padding:        space-32 vertical
```

### 8.15 Notification / Alert Bell

```
Icon:           Bell outline, 24px
Badge:          Small filled dot, --color-star, top-right of icon
Position:       Top-right of screen header
```

---

## 9. Patterns & Layouts

### 9.1 Screen Header

```
Pattern:        Left-aligned title text + right-aligned action icons
Greeting:       "Hi, [Name] 👋" in body-md + heading display-xl question below
Back navigation: Chevron/arrow icon left, share + favorite icons right (detail screens)
No persistent top bar needed on home — content acts as the header
```

### 9.2 Horizontal Scroll Carousel

```
Use for:        Destinations, categories, curated lists
Peek amount:    Show ~20px of next card to signal scrollability
Scroll snap:    Snap to each card start
Scroll bar:     Hidden (overflow: hidden on container visually)
Momentum:       Native scroll physics
```

### 9.3 Detail Screen Layout

```
Top:            Full-bleed hero image (~45% of screen height)
Overlay:        Gradient from transparent to dark at bottom edge of image
Back/actions:   Float above image (position: absolute, top-safe-area)
Content:        White bottom sheet rising from behind image, radius-xl top corners
Tab row:        Sticky below content header (Guide / Things to do / Hotels / Map)
Info:           Stack of info rows, then full-width CTA pinned to bottom
```

### 9.4 Booking Details Screen

```
Header:         Screen title + "..." overflow menu
Hero:           Compact image card with property name + rating
Details grid:   2-column grid for Check-in / Check-out, Guests / Nights
Price section:  Line-item list + total row (bold)
CTA:            Full-width pill button, pinned bottom
```

### 9.5 Payment Screen

```
Header:         Back arrow + title
Section:        "Payment Method" with radio list
Add card row:   Dashed border, "+" icon + "Add New Card" label
Section:        "Price Summary" with breakdown rows
Pinned CTA:     "Pay Securely" button
Trust signal:   Small lock icon + "Your payment is 100% secure" caption below CTA
```

### 9.6 My Trips Screen

```
Segmented control: "Upcoming" / "Completed" toggle at top
List:           Trip cards in vertical scroll
Each card:      Destination image, name, dates, trip duration badge
Action:         "..." per card for options (edit, cancel, share)
```

---

## 10. Navigation

### 10.1 Bottom Navigation Bar

```
Position:       Fixed bottom
Height:         64px (+ device safe area)
Background:     --color-surface
Top border:     1px solid --color-border
Items:          4 items — Home, Trips, Bookings, Profile
Active state:   Icon filled + label bold, --color-text-primary
Inactive state: Icon outline + label regular, --color-text-tertiary
Tap target:     Full height of bar per item (no smaller than 44x44px)
```

| Tab | Icon Style | Label |
|---|---|---|
| Home | House (filled when active) | Home |
| Trips | Map / Suitcase | Trips |
| Bookings | Calendar / Receipt | Bookings |
| Profile | Person circle | Profile |

### 10.2 Screen-to-Screen Transitions

- **Push (forward):** Slide in from right
- **Pop (back):** Slide out to right
- **Modal/Sheet:** Slide up from bottom
- **Tab switch:** Cross-fade, no slide

### 10.3 In-Screen Navigation

- **Segmented control** for content filters within a screen (e.g., Upcoming / Completed)
- **Tab row** for content-type switching on detail screens (Guide / Hotels / Map)
- **"View all"** links for section overflows — right-aligned, caption style, primary color

---

## 11. Interaction & Motion

### 11.1 Timing

| Type | Duration | Easing |
|---|---|---|
| Button press feedback | 80ms | ease-out |
| Card tap highlight | 100ms | ease-in-out |
| Modal open | 280ms | cubic-bezier(0.32, 0, 0.15, 1) |
| Tab switch | 200ms | ease-in-out |
| Carousel scroll | native | native momentum |
| Segmented tab pill | 180ms | ease-in-out |

### 11.2 Micro-interactions

- **Favorite button:** Heart icon "pops" on tap (scale 1 → 1.3 → 1), fills with color
- **Button press:** Scale down to 0.97 on `active` state, restores on release
- **Radio selection:** Fill animates inward from outer ring
- **Image load:** Skeleton shimmer (warm gray, animated) while image fetches
- **Carousel snap:** Subtle haptic on iOS / Android when card snaps into place

### 11.3 Loading States

- **Skeleton screens:** Use rounded rect placeholders matching component shapes
- **Skeleton color:** `#EBEBEB` → animated shimmer to `#F5F0EA`
- **Spinner:** Only for full-screen blocking operations (payment processing)
- **Inline loaders:** Small circular indicator inside button during async actions

---

## 12. Accessibility Guidelines

### 12.1 Color Contrast

| Pair | Contrast Ratio | Requirement |
|---|---|---|
| `#1C1C1E` on `#FAF8F5` | ≥ 15:1 | ✅ Exceeds AA & AAA |
| `#6B6B6B` on `#FFFFFF` | ≥ 5.7:1 | ✅ Passes AA |
| `#A8A8A8` on `#FFFFFF` | ≥ 3.1:1 | ⚠️ Decorative only — do not use for meaningful text |
| `#FFFFFF` on `#1C1C1E` | ≥ 15:1 | ✅ Passes — use for CTA button text |

### 12.2 Touch Targets

- **Minimum:** 44×44px for all interactive elements
- **Preferred:** 48×48px for primary actions
- **Bottom nav items:** Full-height tap zone regardless of icon size

### 12.3 Text Sizing

- Minimum body text: 14px (no meaningful text below 12px)
- Support dynamic type scaling (iOS) / font scale (Android)
- Avoid fixed-height containers that clip scaled text

### 12.4 Semantic Structure

- Screens should have a single `h1` equivalent (screen title)
- Cards are navigable as single interactive units
- Decorative images use empty alt text; content images use descriptive alt
- Ratings read as "4.8 out of 5 stars" in accessibility label, not just "4.8"

### 12.5 Focus & Keyboard

- Focus ring: 2px offset, `--color-accent` color
- Tab order: top-to-bottom, left-to-right; modals trap focus internally
- Bottom nav is always reachable in 1–2 tab presses from any screen position

---

## Appendix: Quick Reference Cheatsheet

```
COLORS
  Canvas:     #FAF8F5
  Card:       #FFFFFF
  Text:       #1C1C1E (primary) / #6B6B6B (secondary)
  Accent:     #C4986A
  CTA:        #1C1C1E bg / #FFFFFF text
  Border:     #EBEBEB
  Star:       #F5A623

TYPOGRAPHY
  Font:       Inter / SF Pro
  Sizes:      32 / 26 / 22 / 18 / 15 / 14 / 13 / 12 / 11px
  CTA label:  16px semi-bold

SPACING (8pt grid)
  Screen pad: 20px
  Card pad:   16px
  Section gap:32px

RADII
  Small:      8px   (inputs)
  Card:       12–16px
  Large card: 20px
  Pill:       9999px

SHADOWS
  Card:       0 2px 8px rgba(0,0,0,0.08)
  Modal:      0 4px 16px rgba(0,0,0,0.10)

MOTION
  Standard:   200–280ms, ease-in-out
  Micro:      80–100ms, ease-out
```

---

*Document version 1.0 — General-purpose mobile UI system derived from warm-minimal app design.*
