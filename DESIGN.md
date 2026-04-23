---
name: ShareAux
description: Self-hosted real-time music sharing platform — dark-only, music-centric UI
colors:
  primary: "#ff4081"
  primary-hover: "#ff6ba0"
  primary-light: "#ff80ab"
  cyan: "#00e5ff"
  bg-primary: "#000000"
  bg-secondary: "#121212"
  bg-tertiary: "#1a1a1a"
  bg-elevated: "#242424"
  text-primary: "#ffffff"
  text-secondary: "#b3b3b3"
  text-muted: "#6a6a6a"
  on-primary: "#ffffff"
typography:
  h1:
    fontFamily: Outfit
    fontSize: 2rem
    fontWeight: 700
  h2:
    fontFamily: Outfit
    fontSize: 1.5rem
    fontWeight: 700
  h3:
    fontFamily: Pretendard
    fontSize: 0.9375rem
    fontWeight: 600
  body-md:
    fontFamily: Pretendard
    fontSize: 0.875rem
    fontWeight: 400
  body-sm:
    fontFamily: Pretendard
    fontSize: 0.75rem
    fontWeight: 400
  caption:
    fontFamily: Pretendard
    fontSize: 0.6875rem
    fontWeight: 400
  micro:
    fontFamily: Pretendard
    fontSize: 0.5625rem
    fontWeight: 400
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  card:
    backgroundColor: "rgba(255,255,255,0.03)"
    rounded: "{rounded.2xl}"
    padding: 20px
  card-border:
    backgroundColor: "{colors.bg-secondary}"
    rounded: "{rounded.2xl}"
    padding: 20px
  glass-panel:
    backgroundColor: "{colors.bg-primary}"
    rounded: "{rounded.2xl}"
    padding: 20px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "rgba(255,255,255,0.3)"
    rounded: "{rounded.xl}"
    padding: 12px
  button-ghost-hover:
    backgroundColor: "rgba(255,255,255,0.08)"
    textColor: "rgba(255,255,255,0.7)"
  input:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: 12px
  badge:
    backgroundColor: "rgba(255,64,129,0.2)"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 4px
  badge-muted:
    backgroundColor: "{colors.bg-tertiary}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: 4px
  nav-item:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.xl}"
    padding: 12px
  nav-item-active:
    backgroundColor: "rgba(255,64,129,0.1)"
    textColor: "{colors.primary-light}"
    rounded: "{rounded.xl}"
    padding: 12px
  visualizer:
    backgroundColor: "{colors.cyan}"
    rounded: "{rounded.full}"
---

## Overview

ShareAux is a dark-only, music-centric UI. The visual language evokes a premium audio player — deep blacks, a vibrant pink accent, and subtle glass effects. Every surface is dark with layered transparency. The single accent color (pink) drives all interactive elements.

## Colors

The palette is built on layered blacks with a single vibrant accent.

- **Primary (#ff4081):** Brand pink — buttons, links, active states, progress indicators, glow effects.
- **Cyan (#00e5ff):** Secondary accent — audio visualizer, occasional highlights. Never for buttons.
- **Background layers:** Pure black → #121212 → #1a1a1a → #242424. Each step adds subtle elevation.
- **Text hierarchy:** White for headings → #b3b3b3 for body → #6a6a6a for muted/disabled.
- **Transparency patterns:** Use `rgba(255,255,255,0.05)` for surfaces, `rgba(255,255,255,0.10)` for borders. Never use opaque grays.

## Typography

Two font families with clear roles:

- **Outfit:** Hero headings and page titles only (login, setup, landing). Bold, modern geometric.
- **Pretendard:** Everything else — body, labels, buttons, navigation. Clean Korean/Latin support.
- **Monospace:** Invite codes, API keys, technical values.

Text sizes decrease sharply: 14px body → 12px caption → 11px small → 9px micro. Avoid sizes between 14px and 18px for body text.

## Layout & Spacing

- App shell: `fixed inset-0` (never `100vh` or `100dvh`).
- Section spacing: 24px between sections, 20px between fields within a section.
- Card padding: 20px. Modal padding: 16px.
- Inline form fields: label+description on left, control on right (`justify-between`).
- Minimum touch target: 40×40px on mobile.

## Elevation & Depth

Elevation is expressed through transparency layers, not shadows:

1. **Base:** `bg-black` (app background)
2. **Surface:** `bg-white/[0.03]` (cards, sections)
3. **Elevated:** `bg-white/5` (hover states, dropdowns)
4. **Overlay:** `bg-black/80 backdrop-blur-2xl` (glass panels, modals)

The only shadows are accent glows: `shadow-[0_0_16px_rgba(255,64,129,0.35)]` for active/focused elements.

## Shapes

- Cards, sections, modals: `rounded-2xl` (24px)
- Buttons, inputs: `rounded-xl` (16px)
- Badges, tags: `rounded` (4px) to `rounded-md` (8px)
- Avatars, circular elements: `rounded-full`

Border: `border border-white/5` (subtle) or `border-white/10` (visible). Never use opaque border colors.

## Components

- **Buttons:** Always use shadcn `<Button>`. Never inline `<button>`.
- **Inputs:** Always use shadcn `<Input>`. Never inline `<input>`.
- **Cards:** `rounded-2xl border border-white/5 bg-white/[0.03] p-5` with `space-y-5` for children.
- **Glass panels:** `rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl`.
- **Badges:** `rounded px-1.5 text-[9px] font-mono` with accent or status colors.
- **Form fields (inline):** Label+description left, control right, `justify-between gap-4`.

## Do's and Don'ts

**Do:**
- Use CSS variables (`sa-accent`, `sa-bg-primary`) for all colors
- Use shadcn primitives for all interactive elements
- Use `cn()` (clsx + tailwind-merge) for conditional classes
- Import animations from `motion/react`
- Keep touch targets ≥ 40px on mobile

**Don't:**
- Use hardcoded hex colors in components
- Use `100vh`, `100dvh` — use `fixed inset-0`
- Use `framer-motion` — use `motion/react`
- Create inline `<button>`, `<input>` elements
- Add light mode styles — dark only
- Use opaque gray backgrounds — use `white/` transparency
