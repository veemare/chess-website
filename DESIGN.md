---
name: "Vesper64"
description: "Precision dark-slate tournament chess studio anchored by variable-weight countdown specimens, hairline-ruled coordinates, and an invisible operator drawer."
world: "variable-font-specimen"
colors:
  foundry-crimson: "#d91642"
  foundry-crimson-deep: "#b81137"
  crimson-signal: "#ff4d73"
  void-slate: "#101216"
  rail-slate: "#151921"
  elevated-slate: "#1c222d"
  hover-slate: "#242b38"
  hairline-slate: "#262c38"
  hairline-strong: "#343d4d"
  alabaster-ink: "#f3f4f6"
  muted-slate-ink: "#94a3b8"
  board-light: "#e5e7ec"
  board-dark: "#343c4a"
  live-emerald: "#22c55e"
  waiting-amber: "#f59e0b"
typography:
  display:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "3.35rem"
    fontWeight: 780
    lineHeight: 0.96
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
    fontVariation: "'wght' 780"
  headline:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.45
    letterSpacing: "-0.03em"
  body:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  label:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0em"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0em"
    fontFeature: "tnum"
rounded:
  sm: "2px"
  md: "3px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.foundry-crimson}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.foundry-crimson-deep}"
  button-secondary:
    backgroundColor: "{colors.elevated-slate}"
    textColor: "{colors.alabaster-ink}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-slate}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate-ink}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  input-field:
    backgroundColor: "{colors.void-slate}"
    textColor: "{colors.alabaster-ink}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  nav-tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate-ink}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  nav-tab-active:
    backgroundColor: "{colors.elevated-slate}"
    textColor: "{colors.alabaster-ink}"
  clock-specimen:
    backgroundColor: "{colors.rail-slate}"
    textColor: "{colors.muted-slate-ink}"
    padding: "16px 24px"
  clock-specimen-active:
    backgroundColor: "{colors.elevated-slate}"
    textColor: "{colors.alabaster-ink}"
  modal-panel:
    backgroundColor: "{colors.rail-slate}"
    textColor: "{colors.alabaster-ink}"
    rounded: "{rounded.md}"
    padding: "20px"
    width: "460px"
---

# Design System: Vesper64

## Overview

**Creative North Star: "The Tournament Type Specimen"**

Vesper64 treats a competitive online chessboard like a calibrated Swiss foundry specimen rendered onto matte dark slate. Rather than surrounding the 64 squares with noisy chess-portal sidebars, drop shadows, or novelty gag chrome, every interface surface relies on crisp tonal steps (`#101216` through `#242b38`), `1px` structural hairlines, and oversized variable-weight countdown clocks whose stroke weight shifts live with turn ownership and low-time urgency.

Cover credibility is the aesthetic's first duty: guests and invited friends experience a focused, tournament-grade match room with zero onboarding friction and zero trace of concealed tooling. Authorized operator accounts unlock a structurally native right-hand drawer (`Operator Console`) that shares the exact same `1px`-ruled dark slate grammar, keeping tactical manipulation silent until summoned by hotkey or brand gesture.

**Key Characteristics:**
- Matte dark-slate tonal layering (`#101216` void ground, `#151921` rails, `#1c222d` active specimens) with zero drop shadows across the entire application.
- Variable-weight display countdown specimens in self-hosted `Figtree` shifting smoothly across `'wght' 520` (standby), `'wght' 780` (active turn), and `'wght' 880` (`<20s` urgency).
- Hairline-ruled `1px` structural grid framing a central `1:1` alabaster-and-slate chessboard (`#e5e7ec` / `#343c4a`) with external `22px` coordinate rails.
- Single foundry crimson accent (`#d91642`) reserved strictly for primary room creation, active turn telemetry, focus rings, capture targets, and armed operator states.
- Self-hosted variable typography (`Figtree` `300–900` and `JetBrains Mono` `400–700`) with tabular numerals across clocks, algebraic move ledgers, and room codes.

## Colors

A disciplined nocturnal slate scale creates effortless contrast for long matches, punctuated by a high-chroma crimson turn signal and high-clarity neutral chessboard squares.

### Primary
- **Foundry Crimson** (`#d91642`): Primary action fills (`Create Invite Link`, `Panic (Esc)`), brand crown mark, `:focus-visible` `2px` outlines, caret tint, capture target rings (`0.65` opacity), and active-state borders on match banners and armed operator tiles.
- **Foundry Crimson Deep** (`#b81137`): Hover fill for primary buttons, darkening cleanly without shifting hue or introducing glow.
- **Crimson Signal** (`#ff4d73`): High-luminance ink reserved for urgent `<20s` countdown digits, active turn tags, active clock axis dots, and the `Operator Console` header label.

### Neutral
- **Void Slate** (`#101216`): Primary arena canvas, board stage ground, inset form inputs, move ledger wells, and room telemetry pills.
- **Rail Slate** (`#151921`): Top navigation bar, left telemetry rail, standby clock specimens, coordinate rail gutter, concealed operator drawer, and modal dialog panels.
- **Elevated Slate** (`#1c222d`): Active player clock specimen surface, secondary buttons, active navigation tabs, active segmented switches, and inline copy buttons.
- **Hover Slate** (`#242b38`): Hover state across secondary buttons, icon buttons, and inline copy controls.
- **Hairline Slate** (`#262c38`): `1px` structural dividers separating the top bar, telemetry rail, clock bands, coordinate rails, and drawer headers.
- **Hairline Strong** (`#343d4d`): `1px` borders on inputs, buttons, board frame, modal panels, and `1px` gutter fills inside the `preset-grid`.
- **Alabaster Ink** (`#f3f4f6`): Primary readable text, active clock numerals, SVG line highlights, and selected state labels.
- **Muted Slate Ink** (`#94a3b8`): Secondary labels, standby clock digits, coordinate rail glyphs, move numbers, and inactive navigation tabs.
- **Board Light Square** (`#e5e7ec`): Cool alabaster light chess squares paired with `#fafbfd` / `#151922` light pieces and `#11151d` / `#657289` dark pieces.
- **Board Dark Square** (`#343c4a`): Matte slate dark chess squares maintaining clear edge separation against dark pieces (`#11151d` fill with `#657289` stroke and `#8592a8` interior detail).

### Semantic & Board States
- **Live Emerald** (`#22c55e`): Connected room status dot (`is-live`) and info alert accent (`rgba(34, 197, 94, 0.12)` with `#2f5e42` border and `#dcfce7` text).
- **Waiting Amber** (`#f59e0b`): Connecting/waiting status dot (`is-wait`) in the room telemetry pill.
- **Board Interaction Tints**: Last-move squares shift to `#cdd9ea` (light) and `#42536b` (dark); selected squares shift to `#f4c6d1` (light) and `#6b2b3e` (dark). *(Note: `.sq-check` radial highlight and the SVG best-move arrow currently retain hardcoded `rgba(225, 29, 72, ...)` `#e11d48` values from the initial world spec rather than `var(--accent)` `#d91642`.)*

### Named Rules
**The Crimson Signal Rule.** `Foundry Crimson` (`#d91642`) and `Crimson Signal` (`#ff4d73`) are strictly reserved for active turn ownership, primary commitment actions, focus outlines, check/capture pressure, and armed operator states; standby surfaces and passive chrome remain strictly achromatic slate.

**The Dual-Ink Piece Contrast Rule.** Light and dark SVG chess pieces never rely on bare monochrome silhouettes alone: dark pieces layer `#11151d` fills with `#657289` outer strokes and `#8592a8` interior lines so pieces remain crisp over `#343c4a` dark squares.

## Typography

**Display Font:** `Figtree` (variable `300–900`, fallback `system-ui, -apple-system, sans-serif`)
**Body Font:** `Figtree` (variable `300–900`, fallback `system-ui, -apple-system, sans-serif`)
**Label/Mono Font:** `JetBrains Mono` (variable `400–700`, fallback `ui-monospace, monospace`)

**Character:** Self-hosted variable `Figtree` anchors both architectural UI clarity and dramatic display weight modulation on countdown clocks, while `JetBrains Mono` enforces strict tabular alignment across algebraic move notation, telemetry strips, room codes, and coordinate rails.

### Hierarchy
- **Display** (`Figtree`, `'wght' 520` standby / `'wght' 780` active / `'wght' 880` urgent, `3.35rem` [`46.9px` at `14px` root; `1.5rem` on `<=900px`], `0.96` line-height, `-0.04em` letter-spacing, `tabular-nums`): Player countdown clock specimens (`05:00`, switching to tenths `00:19.8` under 20 seconds).
- **Headline** (`Figtree`, `700`, `1.25rem` [`17.5px`; `1.05rem` on `<=900px`], `1.45` line-height, `-0.02em` letter-spacing): Left-rail lobby heading (`Online Match Room`).
- **Title** (`Figtree`, `800` brand / `700` modal, `16px`, `1.45` line-height, `-0.03em` brand letter-spacing): `Vesper64` top-bar wordmark and modal headers.
- **Body** (`Figtree`, `400` / `600` interactive controls, `14px` base / `13px` buttons, nav tabs, inputs, player names, `1.45` line-height): Primary reading prose, empty ledger states, and interactive controls.
- **Label** (`Figtree`, `600`, `12px`, `1.45` line-height): Form field labels, segmented tabs, secondary small buttons, and operator action tiles.
- **Mono** (`JetBrains Mono`, `600` [notation `500`, coords `700`], `12px` ledger & presets / `11px` turn tags, badges & telemetry / `10px` board coordinates, `tabular-nums`): Algebraic move columns, room codes (`ROOM XXXXXX`), `PLY` telemetry strip, time-control grid buttons, and external rank/file coordinates.

### Named Rules
**The Variable Axis Turn Rule.** Turn state on clocks is communicated through `Figtree`'s live `wght` variable axis (`'wght' 520` standby → `'wght' 780` active → `'wght' 880` urgent) paired with `tabular-nums`, preventing digit jitter during tenth-of-a-second countdown ticks.

**The Tabular Telemetry Rule.** Every numeric readout that updates during play—clocks, ply counters, move pairs, material advantage (`+3`), and room codes—uses `font-variant-numeric: tabular-nums` so columns never shift horizontally mid-match.

## Layout

The arena occupies a full-viewport `100dvh` CSS grid divided into a `52px` top bar (`padding: 0 24px`, `gap: 16px`) above a `380px 1fr` asymmetric workspace (`360px 1fr 330px` when the concealed `Operator Console` is open on desktop). The left `.telemetry-rail` stacks the opponent clock specimen (`auto`), a flexible center slot (`1fr`) that swaps seamlessly between pre-match room setup and the live move/chat ledger, and the local player clock specimen (`auto`), preserving identical spatial framing across idle practice, online matches, and bot games.

The central `.board-stage` (`padding: 20px 28px`) centers a constrained `.stage-inner` column (`max-width: min(680px, calc(100dvh - 138px))`) holding any active `.match-banner`, the `1:1` `.board-frame` (with `22px` left rank rail and `22px` bottom file rail), and the equal-flex `.board-actions-bar` below.

**Responsive Breakpoints:**
- **`<= 1140px`:** Grid narrows to `320px 1fr`; `.operator-drawer` detaches into a `position: fixed` right-edge sheet (`top: 52px; width: min(340px, 100vw); z-index: 30`).
- **`<= 900px`:** Top bar wraps cleanly (`min-height: 46px; padding: 6px 12px`). `.arena-grid` converts to a single-column flex stack using `display: contents` on `.telemetry-rail` to order opponent clock (`order: 1`), `520px`-capped board stage (`order: 2`, `18px` coord rails), local clock (`order: 3`), and room setup/ledger (`order: 4`) vertically; clock specimens compact into single-row headers (`1.5rem` digits, hiding `.clock-axis` and `.captures-strip`).

### Named Rules
**The Fixed Board Registration Rule.** Switching between pre-game lobby setup, live friend match, bot play, or an open operator drawer never unmounts or shifts the primary chessboard column structure unnecessarily; center stage remains anchored on the `1:1` coordinate-framed board.

## Elevation & Depth

This system uses **zero CSS `box-shadow` declarations**. Depth and hierarchy are conveyed exclusively through stepped dark-slate tonal surfaces (`#101216` ground → `#151921` rails and modals → `#1c222d` active controls → `#242b38` hover) separated by crisp `1px` borders (`#262c38` structural hairlines, `#343d4d` interactive strokes). Overlay states (pawn promotion dialog, fake arbiter reconnect scrim, and account modal backdrop) use translucent void scrims (`rgba(16, 18, 22, 0.78)` and `rgba(8, 10, 14, 0.76)`) over flat `1px`-bordered `#151921` panels.

### Named Rules
**The Flat-By-Architecture Rule.** Surfaces never cast ambient or drop shadows; interactive elevation is communicated strictly through surface-step luminance (`#151921` → `#1c222d` → `#242b38`) and `1px` hairline contrast.

## Shapes

Vesper64 uses tight, technical micro-radii derived from architectural print specimens: `--radius-sm` (`2px`) for compact navigation tabs, `1px`-joined preset grids, board frame perimeter, telemetry strips, inline badges, and alerts; and `--radius-md` (`3px`) for buttons, text inputs, segmented tracks, room pills, move ledgers, operator cells, and modal containers.

Individual chessboard squares inside `.chess-board` are strictly orthogonal (`0px` radius) and butt flush against `1px`-divided `22px` rank/file coordinate gutters (`rgba(38, 44, 56, 0.55)` internal cell dividers). Circular (`50%`) geometry is isolated to telemetry status dots (`.status-dot`, `.clock-axis-dot`), board legal-move/capture indicators (`.legal-dot`, `.sq-capture::after`), and the reconnect spinner ring.

### Named Rules
**The Chamfered Precision Rule.** Interactive chrome uses tight `2px` (`--radius-sm`) or `3px` (`--radius-md`) corners while board squares remain `0px`; `50%` circles are reserved solely for status dots, legal-move indicators, capture rings, and spinners.

## Components

Controls feel machined, dense, and immediate—built with crisp `1px` borders, `150ms ease` state transitions, `1px` active press feedback (`translateY(1px)`), and `2px` crimson `:focus-visible` outlines.

### Buttons
- **Shape:** Tight chamfer (`3px` via `--radius-md`; `2px` via `--radius-sm` for `.btn-xs` and `.copy-inline-btn`).
- **Primary (`.btn-primary`):** `Foundry Crimson` (`#d91642`) fill and border, `#ffffff` ink, `8px 14px` padding, `13px` / `600` typography.
- **Hover / Focus:** Shifts to `Foundry Crimson Deep` (`#b81137`); `:active` translates `1px` downward; `:focus-visible` shows a `2px solid #d91642` outline offset `2px`.
- **Secondary & Ghost:** Secondary uses `Elevated Slate` (`#1c222d`), `1px solid #343d4d`, `Alabaster Ink` (`#f3f4f6`), hovering to `Hover Slate` (`#242b38`). Ghost uses `transparent` fill/border with `Muted Slate Ink` (`#94a3b8`), filling to `#1c222d` on hover.

### Chips
- **Style (`.room-pill` / `.mono-badge`):** `Void Slate` (`#101216`) background, `1px solid #343d4d`, `3px` radius, `JetBrains Mono` `12px` (`11px` for `.mono-badge`), paired with a `7px` circular status dot (`#22c55e` live / `#f59e0b` waiting) and `1px` vertical divider before an inline `Copy Link` button.
- **State:** `.mono-badge.is-accent` shifts border to `#d91642`, fill to `rgba(217, 22, 66, 0.18)`, and text to `#fecdd3` to denote active operator grants.

### Cards / Containers
- **Corner Style:** `0px` on structural rail/drawer regions, `3px` (`--radius-md`) on inset ledgers, modals, operator tiles, and eval readout cards.
- **Background:** `Rail Slate` (`#151921`) for rails, drawers, and modals; `Void Slate` (`#101216`) for recessed wells (`.moves-scroll`, `.chat-scroll`, `.op-subpanel`, `.eval-readout-card`); `Elevated Slate` (`#1c222d`) for active clock specimens.
- **Shadow Strategy:** None (`Elevation & Depth` tonal layering + `1px` borders only).
- **Border:** `1px solid #262c38` for structural regions and resting subpanels; `1px solid #343d4d` for interactive frames and modals.
- **Internal Padding:** `16px 24px` on clock specimens, `20px 24px` on rail center, `20px` on modal panels, `10px–16px` inside operator drawer cells and panels.

### Inputs / Fields
- **Style (`.text-input`):** `36px` height, `0 10px` padding, `Void Slate` (`#101216`) fill, `1px solid #343d4d`, `3px` radius, `13px` `Figtree` (`JetBrains Mono` for `.duration-input`), `#d91642` caret.
- **Focus:** Border shifts cleanly to `#d91642` (`outline: none` replaced by crisp border shift; keyboard navigation on non-text controls retains `2px solid #d91642` outline).
- **Error / Disabled:** Validation errors render in `.inline-alert.is-error` (`#d91642` border, `rgba(217, 22, 66, 0.14)` fill, `#fecdd3` ink); disabled buttons drop to `0.45` opacity with `not-allowed` cursor.

### Navigation
- **Style & States:** `52px` `.top-bar` (`#151921`, `1px` bottom `#262c38`) housing the `Vesper64` brand mark (which doubles as a concealed triple-click trigger strictly for authorized troll sessions) and horizontal `.nav-tab` buttons (`6px 12px`, `2px` radius, `13px` / `600`, active state `#1c222d` with `#343d4d` border). Segmented controls (`.segmented-tabs`) use `Void Slate` (`#101216`) tracks (`3px` padding, `1px solid #262c38`) with `Elevated Slate` (`#1c222d`) active tabs.

### Clock Specimen
Oversized foundry countdown band pairing player identity, a full-width `1px` axis rule with a sliding `5px` circular turn indicator dot (`left: 0` standby → `left: calc(100% - 5px)` active), variable-weight `3.35rem` tabular digits (`'wght' 520` → `780` → `880`), and a `16px` captured-piece SVG strip with material delta.

### Coordinate-Framed Chessboard & Concealed Operator Drawer
`.board-frame` wraps the `8x8` orthogonal board inside `1px`-divided `22px` rank (`8–1`) and file (`a–h`) coordinate rails. The concealed `.operator-drawer` (`330px` inline column, toggling via `Ctrl+Shift+T` / `Cmd+Shift+T` and panic-hiding on `Esc`) renders exclusively for authorized sessions (`canTroll`) and organizes rule breakers, clock manipulation, mind games, and Arbiter hints into `2-column` `.op-cell` action tiles and `24px` square `.mini-pill` piece selectors.

### Named Rules
**The Concealed Parity Rule.** The `Operator Console` drawer shares the exact same slate palette, `1px` borders, `segmented-tabs`, and `2px`/`3px` radii as the public arena so authorized operators experience zero visual seam—while unauthorized clients never render its DOM or styles.

## Do's and Don'ts

### Do:
- **Do** keep `1px` structural hairlines (`#262c38` / `#343d4d`) and stepped dark-slate tonal layers (`#101216` → `#151921` → `#1c222d`) as the sole depth mechanism.
- **Do** modulate clock urgency through `Figtree`'s variable `wght` axis (`520` → `780` → `880`) paired with `tabular-nums` and the sliding `.clock-axis-dot`.
- **Do** reserve `Foundry Crimson` (`#d91642`) and `Crimson Signal` (`#ff4d73`) strictly for primary CTAs, active turn signals, focus rings, capture rings, and armed operator states.
- **Do** honor `prefers-reduced-motion: reduce` across all transitions, piece nudges, and spinner animations (`0.01ms`).
- **Do** keep every public-facing lobby, clock, and board surface indistinguishable from a serious tournament chess studio so zero troll UI leaks to guests.

### Don't:
- **Don't** introduce `box-shadow`, glass blur, or bright neon gradients onto panels, modals, or buttons.
- **Don't** round chessboard squares (`0px`) or inflate UI chrome radii past `3px` (`--radius-md`), reserving `50%` circles solely for dots, capture rings, and spinners.
- **Don't** replace self-hosted variable `Figtree` or `JetBrains Mono` with system display faces, or omit `tabular-nums` on clocks, move ledgers, and ply counters.
- **Don't** render any `Operator Console` controls, troll hints, or `Arbiter` arrows into the DOM when `canTroll` is false.
- **Don't** hardcode raw color drift values (such as legacy `#e11d48` alpha overlays) when extending new board or alert states; reference `:root` `--accent` tokens consistently.
