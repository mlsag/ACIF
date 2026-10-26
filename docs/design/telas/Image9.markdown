---
name: Modern Academic Pulse
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#5b403d'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#8f6f6c'
  outline-variant: '#e4beb9'
  surface-tint: '#b91c1c'
  primary: '#93000b'
  on-primary: '#ffffff'
  primary-container: '#b91c1c'
  on-primary-container: '#ffcdc7'
  inverse-primary: '#ffb4ab'
  secondary: '#4059aa'
  on-secondary: '#ffffff'
  secondary-container: '#8fa7fe'
  on-secondary-container: '#1d3989'
  tertiary: '#2e2dbe'
  on-tertiary: '#ffffff'
  tertiary-container: '#484ad6'
  on-tertiary-container: '#d5d4ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000b'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b6c4ff'
  on-secondary-fixed: '#00164e'
  on-secondary-fixed-variant: '#264191'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  margin-screen: 1rem
  gutter-inline: 0.75rem
---

## Brand & Style

The design system establishes an institutional yet approachable digital environment tailored for the daily academic communication of Fatec Garça. It balances the institutional gravitas of Centro Paula Souza with the dynamic, fast-paced nature of student and faculty life. 

The aesthetic is modern corporate-academic: sharp information architecture, crisp typographic hierarchies, generous white space, and micro-interactions that instill trust, clarity, and community cohesion. Surfaces feel tactile and organized without visual clutter, guiding students, faculty, and administrative staff through deadlines, notices, academic records, and real-time community interactions.

## Colors

The color palette anchors to the institutional heritage while supporting dynamic mobile workflows:

- **Primary (`#B91C1C`):** Institutional crimson. Dedicated to primary CTAs, critical institutional alerts, high-priority deadlines, and brand accents.
- **Secondary (`#1E3A8A`):** Deep academic navy. Used for structural navigation, app bars, key departmental badges, and formal scholarly records.
- **Tertiary (`#6366F1`):** Indigo aura. Dedicated to smart academic features, automated summaries, AI-assisted tutoring tools, and synthetic insights.
- **Support Green (`#25D366`):** Instant messaging and direct peer/secretariat WhatsApp-connected actions.
- **Neutral Core (`#0F172A` to `#F8FAFC`):** Deep slate for high-contrast legible text (`#0F172A`), balanced by muted secondary text (`#64748B`), delicate hair-thin borders (`#E2E8F0`), and soft canvas surfaces (`#F8FAFC`).

## Typography

The type scale combines **Plus Jakarta Sans** for prominent headers with **Inter** for sustained legibility across mobile displays.

- **Headlines (Plus Jakarta Sans):** Provide a contemporary, approachable, yet authoritative structural presence. Tight negative tracking (-0.01em to -0.02em) keeps headings cohesive on constrained mobile viewports.
- **Body & Labels (Inter):** Highly optimized for micro-screens, academic transcripts, schedule tables, and push notification feeds. Open apertures and balanced x-height guarantee readability under bright campus sunlight.

## Layout & Spacing

The layout is built for fluid touch ergonomics on smartphones, operating on an 8pt base grid with a secondary 4pt half-step for compact metadata tags.

- **Mobile Viewports (< 600px):** Single-column stack with `1rem` (16px) outer gutter margins and `0.75rem` (12px) horizontal card gaps. Critical interactive elements conform to minimum 48px touch targets.
- **Tablet / Responsive Extensions (≥ 600px):** 4 to 8 fluid columns maintaining a fixed maximum content container of 720px for high-density academic reading sheets.
- **Thumb Zone Hierarchy:** Primary navigation and actionable triggers reside within bottom app bars and floating sheets, leaving upper screen regions for scannable summaries and visual status metrics.

## Elevation & Depth

Visual hierarchy uses a refined layered approach combining clean tonal surfaces with ambient, colored micro-shadows:

- **Surface Base (`Level 0`):** `#F8FAFC` canvas. Flat, neutral, reducing eye fatigue during long study sessions.
- **Card Tier (`Level 1`):** `#FFFFFF` surface accompanied by a crisp low-opacity border (`1px solid #E2E8F0`) and subtle ambient dispersion: `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03)`.
- **Raised Interactive Elements (`Level 2`):** Dropdowns, action sheets, and active tabs feature extended vertical drop with a whisper of secondary navy tint: `box-shadow: 0 8px 24px rgba(30, 58, 138, 0.08)`.
- **Modals & Drawers (`Level 3`):** High-level overlay screens feature smooth backdrop filters (`backdrop-filter: blur(8px)`) paired with `rgba(15, 23, 42, 0.4)` scrims to keep focus concentrated.

## Shapes

The design system adopts a modern rounded visual language (`roundedness: 2`):

- **Inputs, Chips, and Buttons:** Standardized to `0.75rem` (12px) to `1rem` (16px) radii, presenting comfortable, tactile touch anchors.
- **Academic Cards & Feed Containers:** Standardized to `1rem` (16px) or `1.5rem` (24px) for grouped content, lending an elegant, modular appearance.
- **Avatars & Floating Badges:** Fully circular (`rounded-full`) to contrast against rectangular card layouts.

## Components

### Buttons
- **Primary:** Fatec institutional crimson background (`#B91C1C`), white label, `h-12`, `rounded-xl`, subtle tap-down scale transformation (`scale-[0.98]`).
- **Academic Secondary:** Academic navy (`#1E3A8A`) tint with `10%` fill, `#1E3A8A` label, suitable for course schedule toggles and departmental filters.
- **WhatsApp Action:** `#25D366` solid or bordered variant with dedicated messaging icon, linking directly to advisor and coordination channels.
- **AI Assist:** Linear gradient (`#6366F1` to `#4F46E5`), white text, and an indigo diffuse glow (`0 4px 14px rgba(99, 102, 241, 0.3)`).

### Cards & Academic Feeds
- Built on white surfaces with `rounded-2xl` corners and `1px` border in `#E2E8F0`.
- Includes an optional left-side accent band (3px) indicating notification category: Crimson for administrative deadlines, Navy for academic announcements, Indigo for AI study suggestions, and Green for social/direct messages.

### Input Fields
- Height `48px`, background `#FFFFFF`, border `1.5px` in `#CBD5E1`, text in `#0F172A`.
- Active focus transitions to `#1E3A8A` with a 2px outer ring offset in `#DBEAFE`.

### Chips & Badges
- Compact `h-7` pill structures (`rounded-full`), utilizing `label-sm` bold typography.
- Neutral states use `#F1F5F9` with `#475569` text; highlighted states adapt corresponding role colors (e.g., `#FEF2F2` bg with `#B91C1C` text for urgent notices).

### Checkboxes & Selection Controls
- Sized `20x20px`, corner radius `6px`. Checked state uses `#B91C1C` or `#1E3A8A` with crisp white SVG checkmarks.
- Radio buttons use a dual concentric circle with smooth `0.15s ease-out` expansion.

### Academic Timetable / Daily Agenda Card
- Specialized component featuring time markers in `#64748B`, classroom tags, professor status, and interactive location pills optimized for quick glances between lectures.