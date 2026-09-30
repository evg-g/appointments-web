---
name: Aurora Clinic
description: Appointment scheduling and live medication-fridge monitoring, drawn like a calm clinical instrument.
colors:
  clinical-teal: "#0d7071"
  clinical-teal-hover: "#0b595b"
  clinical-teal-active: "#0b4547"
  clinical-teal-wash: "#e6f6f6"
  clinical-teal-wash-ink: "#0b595b"
  clinical-teal-night: "#2ca6a6"
  focus-teal: "#2ca6a6"
  clinic-canvas: "#f6f8fa"
  paper-white: "#ffffff"
  sunken-slate: "#eceff3"
  hairline-slate: "#dfe3ea"
  hairline-slate-strong: "#c7cedb"
  ink-slate: "#161c26"
  ink-slate-muted: "#4d5769"
  ink-slate-subtle: "#6b7688"
  night-canvas: "#0d121b"
  night-surface: "#161c26"
  night-raised: "#232b38"
  night-ink: "#eceff3"
  safe-green: "#178048"
  safe-green-wash: "#d6f2df"
  caution-amber: "#a97c12"
  caution-amber-wash: "#fbeecb"
  alarm-red: "#b52a2a"
  alarm-red-wash: "#fbdcdc"
  notice-blue: "#2358ad"
  notice-blue-wash: "#d8e6fb"
typography:
  readout:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.014em"
    fontFeature: '"tnum" 1'
  headline:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.014em"
  title:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.014em"
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.02em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
  "9": "96px"
components:
  button-primary:
    backgroundColor: "{colors.clinical-teal}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.clinical-teal-hover}"
  button-primary-active:
    backgroundColor: "{colors.clinical-teal-active}"
  button-secondary:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-slate}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.sunken-slate}"
  button-ghost:
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.alarm-red}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-slate}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge-neutral:
    backgroundColor: "{colors.sunken-slate}"
    textColor: "{colors.ink-slate-muted}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-accent:
    backgroundColor: "{colors.clinical-teal-wash}"
    textColor: "{colors.clinical-teal-wash-ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  nav-link:
    textColor: "{colors.ink-slate-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-link-active:
    backgroundColor: "{colors.clinical-teal-wash}"
    textColor: "{colors.clinical-teal-wash-ink}"
---

# Design System: Aurora Clinic

## Overview

**Creative North Star: "The Clinical Instrument"**

Aurora Clinic looks and behaves like a well-made medical monitor: calm, precise, and trustworthy,
readable at a glance by someone busy. Surfaces are quiet cool slate so the few things that carry
meaning stand out: the single teal action on a screen, a status badge, a temperature line leaving
its safe band. Nothing is decorative; every mark on the screen is either data, a control, or the
structure that separates them.

Density is moderate. Screens hold one clear job each (book, monitor, administer), with generous but
not airy spacing on an 8px rhythm and a single content column capped at 1280px. The same system
serves light and dark themes through semantic tokens that flip at runtime; dark mode is a first-class
theme, not an inverted afterthought.

Color is reserved. Teal marks what you can do and where you are; green, amber, red, and blue mark
state and nothing else. The signature surface is the cold-chain temperature chart, where the whole
system's restraint pays off: a pale green safe band, one teal line, and an excursion that is obvious
without any extra decoration.

**Key Characteristics:**

- One accent (Clinical Teal) over cool slate neutrals; status colors only for meaning.
- Flat surfaces separated by hairline borders and tone; shadows almost absent at rest.
- Inter throughout, semibold for structure, tabular figures for every number.
- Gentle, consistent corners (8px controls, 12px containers, full pills for status).
- Light, dark, and system themes from one semantic token layer.
- Every async surface has four designed states: loading, empty, error, success.

## Colors

A single clinical teal over cool slate, with a separate, meaning-only status palette.

### Primary

- **Clinical Teal** (`clinical-teal`): the one accent. Primary buttons, the active nav item and tab,
  links, the temperature line and its live dot, and the selected device card border. Darkens on hover
  (`clinical-teal-hover`) and press (`clinical-teal-active`).
- **Clinical Teal Wash** (`clinical-teal-wash` with `clinical-teal-wash-ink` text): the quiet
  background for "you are here": the active nav link, the selected device, accent badges.
- **Clinical Teal, night** (`clinical-teal-night`): the accent in dark theme, one step lighter so it
  keeps contrast on dark slate. It is also the focus-ring color in both themes (`focus-teal`).

### Neutral

- **Clinic Canvas** (`clinic-canvas`): the page background behind all surfaces.
- **Paper White** (`paper-white`): cards, tables, inputs, the header.
- **Sunken Slate** (`sunken-slate`): table header rows, hover fills, the theme-toggle track, neutral
  badges, skeleton base.
- **Hairline Slate** (`hairline-slate`, `hairline-slate-strong`): 1px borders that do the work
  shadows would do elsewhere.
- **Ink Slate** (`ink-slate`, `ink-slate-muted`, `ink-slate-subtle`): primary text, secondary text
  and inactive nav, then placeholders and chart axis labels.
- **Night set** (`night-canvas`, `night-surface`, `night-raised`, `night-ink`): the dark theme's
  canvas, surfaces, raised menus, and text.

### Status (meaning only)

- **Safe Green** (`safe-green`, wash `safe-green-wash`): success, "Completed", and the temperature
  chart's safe band (drawn at 12% opacity).
- **Caution Amber** (`caution-amber`, wash `caution-amber-wash`): warnings, "No-show", open-excursion
  counts.
- **Alarm Red** (`alarm-red`, wash `alarm-red-wash`): errors, destructive actions, required-field
  marks, invalid inputs.
- **Notice Blue** (`notice-blue`, wash `notice-blue-wash`): informational alerts and "Requested".

In dark theme each status keeps its hue: the text uses the 300 step and the wash is the 500 step
mixed to about 22–24% over the surface.

### Named Rules

**The One Accent Rule.** Clinical Teal is the only brand color. A screen has at most one filled teal
button; everything else that is teal is a state (active, selected, focused) or the chart line.

**The Meaning-Only Rule.** Green, amber, red, and blue never decorate. If a color appears, it must
answer "what state is this in?".

**The Semantic-Token Rule.** Components consume semantic tokens (`--color-accent`,
`--color-text-muted`, …), never the primitive ramps or raw hex, so both themes stay correct.

## Typography

**Display Font:** Inter Variable (self-hosted via `@fontsource-variable/inter`, falling back to
`system-ui`)
**Body Font:** Inter Variable
**Label/Mono Font:** JetBrains Mono is declared in `--font-mono` but not self-hosted, so it falls back
to `ui-monospace` / SF Mono / Menlo; it appears only in inline `<code>`.

**Character:** One neutral, highly legible family carries the whole product; hierarchy comes from
size and weight, not from mixing typefaces. Numbers use tabular figures so times and temperatures
line up.

### Hierarchy

- **Readout** (600, 36px, 1.2, tabular): the live temperature value on the cold-chain dashboard. The
  largest type in the product, and it is a number.
- **Headline** (600, 28px, 1.2, −0.014em): the page title (`h1`) in every page header.
- **Title** (600, 18px, 1.2): card titles and section headings.
- **Body** (400, 16px, 1.55): base text; long copy is capped at 68ch.
- **Body small** (400–500, 14px, 1.55): the working size of the UI: nav links, buttons, inputs,
  table cells, descriptions.
- **Label** (600, 12px, 0.02em, uppercase): table column headers only; also badges at 12px, 500,
  sentence case.

### Named Rules

**The Tabular Rule.** Every number that can be compared (times, dates in tables, temperatures,
counts, prices) uses tabular figures.

**The Weight-Not-Font Rule.** Hierarchy is built with size and weight inside Inter. Do not add a
second display face.

## Layout

A single centered column, max 1280px (`max-w-7xl`) with 16px side padding, under a sticky 56px
header. Page content starts with a page header (title, one-line description, actions on the right),
then cards in a simple grid: two equal columns for the dashboard from 768px, and a
240px-list-plus-content split for the cold-chain device list from 1024px.

Spacing follows a 4px base and 8px rhythm (4, 8, 12, 16, 24, 32, 48, 64, 96). Cards pad 20px;
controls are 40px tall (32px small, 44px large). Gaps between cards are 16–24px.

Responsive behavior: from 1280px the primary nav sits in the header row; below that it moves to its
own full-width row under the header, and on phones that row scrolls sideways. The brand name hides
below 640px. Tables scroll horizontally inside their bordered frame rather than squeezing columns.

## Elevation & Depth

Flat with hairline borders. Surfaces are separated by 1px borders and by tone (canvas, paper,
sunken), not by lift. Resting cards carry only the faintest shadow; real shadows are reserved for
things that float above the page.

### Shadow Vocabulary

- **Whisper** (`--shadow-sm`: `0 1px 2px rgb(13 18 27 / 0.06)`): resting cards and the selected
  segment of the theme toggle.
- **Lift** (`--shadow-md`: `0 2px 4px … 0.06, 0 4px 12px … 0.08`): available for hover lift; not
  used at rest.
- **Float** (`--shadow-lg`: `0 8px 24px … 0.12, 0 2px 6px … 0.08`): menus and popovers (the account
  menu).

Dark theme uses the same three steps with black at 40–60%.

### Named Rules

**The Hairline-First Rule.** Separate with a 1px border or a tone change before reaching for a
shadow. A shadow means "this floats above the page", so resting content never gets more than
Whisper.

## Shapes

Gentle, consistent corners. Controls (buttons, inputs, selects, nav links, alerts) use 8px;
containers (cards, tables, the selected device card, empty states) use 12px; status badges, the
theme toggle, and avatars are full pills or circles. Focus rings use a 4px radius. Borders are
always 1px; empty states use a dashed 1px border to read as "nothing here yet". No clipping, no
diagonal or organic shapes.

## Components

### Buttons

Quiet and exact: a clear label, no decoration, one filled button per view.

- **Shape:** gently curved (8px), height 40px, 16px side padding, 14px medium text, 8px icon gap.
- **Primary:** Clinical Teal fill with white text; darker teal on hover and press.
- **Secondary:** paper-white with a hairline border and ink text; sunken-slate on hover.
- **Ghost:** transparent with ink text; sunken-slate on hover. Used for Back and low-priority actions.
- **Danger:** Alarm Red fill with inverse text; 90% opacity on hover. Destructive actions only.
- **States:** a 2px teal focus ring offset 2px; disabled at 60% opacity; loading shows a small
  spinner and sets `aria-busy`.

### Chips / Badges

- **Style:** full pill, 12px medium text, 2px × 8px padding, wash background with its own ink.
- **Variants:** neutral, accent, success, warning, danger, info; each maps to exactly one meaning
  (for example Confirmed = accent, Completed = success, No-show = warning, Requested = info,
  Cancelled = neutral).

### Cards / Containers

- **Corner Style:** 12px.
- **Background:** paper-white on the canvas.
- **Shadow Strategy:** Whisper only (see Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** 20px; the header has a 4px gap between title and description.

### Inputs / Fields

- **Style:** 40px tall, 8px corners, 1px hairline border, paper-white fill, 14px text, subtle
  placeholder.
- **Label:** 14px medium ink above the control, 6px gap; a required mark in alarm red.
- **Focus:** border turns teal plus the global teal focus ring.
- **Error / Disabled:** border turns alarm red with a message below; disabled at 60% opacity with a
  not-allowed cursor.

### Navigation

- **Primary nav:** 14px medium links with a 16px icon, 8px × 12px padding, 8px corners; inactive in
  muted ink with a sunken hover; active in the teal wash with teal-ink text. Labels never wrap.
- **Section tabs (admin):** text tabs over a hairline rule; the active tab has a 2px teal underline
  and teal text.
- **Theme toggle:** a sunken pill track with three icon segments; the selected segment is
  paper-white with Whisper.

### Tables

A 12px-rounded hairline frame, sunken header row with uppercase 12px labels, 14px cells with 8px ×
12px padding, hairline row dividers, numeric columns right-aligned and tabular.

### Temperature Chart (signature component)

The product's centerpiece, an SVG instrument exposed as one `role="img"` with a text summary. A
safe band in Safe Green at 12% opacity marks the threshold policy; the reading is a single 2px
Clinical Teal line with a 3.5px dot at the latest value; axes are 1px hairlines with min/max and
start/end time labels in subtle ink. The live value sits above it as a Readout. No gradients, no
fills under the line, no animation.

### Empty States

A dashed 12px frame, a 44px sunken circle with a muted icon, a title, one line of help, and always a
next action, so no surface is a dead end.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens (`--color-*`, `--space-*`, `--radius-*`) in every component; the
  frontmatter values are the light-theme resolutions of those tokens.
- **Do** keep one filled Clinical Teal button per view, and use the teal wash for "selected" or
  "you are here".
- **Do** map each status to exactly one badge or alert color, and keep that mapping consistent
  across pages.
- **Do** use tabular figures for times, dates in tables, temperatures, and counts.
- **Do** give every async surface its four states: skeleton loading, an empty state with a next
  action, an error with retry, and success.
- **Do** keep labels in the header and nav on one line (`whitespace-nowrap`); move the nav to its
  own row rather than letting it squeeze.
- **Do** keep text at WCAG 2.2 AA contrast in both themes; use `text-muted`, not `text-subtle`, for
  any text a user must read (subtle is for placeholders and chart axes).

### Don't:

- **Don't** use raw hex, arbitrary pixel values, or primitive ramps (`--slate-500`, `--accent-600`)
  inside components.
- **Don't** use status colors as decoration or brand color, and don't introduce a second accent hue.
- **Don't** add more than Whisper to resting cards; don't use heavy drop shadows, glows, or
  gradients.
- **Don't** add a second typeface for display text.
- **Don't** animate the temperature chart or add fills or gradients under its line.
- **Don't** rely on JetBrains Mono being present; it is declared but not self-hosted.
