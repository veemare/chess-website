---
name: "ChessArena"
description: "Chess.com-style three-column warm charcoal chess arena with a classic cream-and-sage tournament board, beveled green CTAs, high-contrast clock pills, and a concealed operator drawer."
colors:
  tournament-green: "#81b64c"
  tournament-green-hover: "#95cc5a"
  tournament-green-edge: "#45752a"
  charcoal-ground: "#302e2b"
  walnut-nav: "#262522"
  espresso-panel: "#262421"
  obsidian-well: "#21201d"
  umber-elevated: "#363430"
  umber-hover: "#403e3a"
  hairline-umber: "#3c3a37"
  hairline-strong: "#4d4a46"
  pure-chalk-ink: "#ffffff"
  stone-muted-ink: "#b8b6b2"
  board-cream: "#eeeed2"
  board-sage: "#769656"
  board-last-light: "#f6f682"
  board-last-dark: "#baca44"
  crimson-alert: "#e03c3c"
  amber-wait: "#e59c2e"
typography:
  headline:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  label:
    fontFamily: "'Figtree', system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0em"
  clock:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0em"
    fontFeature: "tnum"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0em"
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.tournament-green}"
    textColor: "{colors.pure-chalk-ink}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.tournament-green-hover}"
  button-secondary:
    backgroundColor: "{colors.umber-elevated}"
    textColor: "{colors.pure-chalk-ink}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  button-secondary-hover:
    backgroundColor: "{colors.umber-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.stone-muted-ink}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  input-field:
    backgroundColor: "{colors.obsidian-well}"
    textColor: "{colors.pure-chalk-ink}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "36px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.stone-muted-ink}"
    rounded: "{rounded.sm}"
    padding: "9px 10px"
  nav-item-active:
    backgroundColor: "{colors.umber-elevated}"
    textColor: "{colors.pure-chalk-ink}"
  clock-pill:
    backgroundColor: "{colors.obsidian-well}"
    textColor: "{colors.stone-muted-ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "38px"
  clock-pill-running:
    backgroundColor: "{colors.pure-chalk-ink}"
    textColor: "{colors.obsidian-well}"
  modal-panel:
    backgroundColor: "{colors.espresso-panel}"
    textColor: "{colors.pure-chalk-ink}"
    rounded: "{rounded.md}"
    padding: "20px"
    width: "460px"
---

# Design System: ChessArena

## Overview

**Creative North Star: "The Classic Club Table"**

ChessArena adopts a familiar three-column online chess layout modeled after Chess.com: a narrow dark-walnut left navigation rail (`#262522`), a centered warm-charcoal board stage (`#302e2b`) anchoring a classic cream-and-sage `8x8` board (`#eeeed2` / `#769656`) between compact player clock strips, and a dense dark-espresso action sidebar (`#262421`) that transitions cleanly from pre-match setup into live algebraic notation, board controls, and room chat.

Cover credibility remains foundational: guests join via link or code with zero onboarding wall and zero visible trace of hidden tooling. Authorized accounts retain silent access to the fixed right-edge `Operator Console` drawer via `Ctrl+Shift+T` / `Cmd+Shift+T` or triple-clicking the `ChessArena` mark, and dismiss all concealed state in one stroke with `Esc`.

**Key Characteristics:**
- Warm charcoal-and-walnut tonal architecture (`#21201d` wells, `#262421` / `#262522` sidebars, `#302e2b` main arena, `#363430` interactive controls) with zero drop shadows across panels and cards.
- Classic tournament cream-and-sage chessboard (`#eeeed2` / `#769656`) with inset corner rank/file coordinates, yellow-olive last-move highlights (`#f6f682` / `#baca44`), and translucent dark move dots/capture rings.
- Tactile club-green primary CTAs (`#81b64c`) anchored by a `3px` deep-green bottom lip (`#45752a`) and paired with flat `Umber Elevated` (`#363430`) secondary controls.
- High-contrast digital clock pills (`20px` `JetBrains Mono` tabular digits) that invert from recessed `Obsidian Well` (`#21201d`) at rest to `Pure Chalk Ink` (`#ffffff`) on `#21201d` text during the active turn.
- Self-hosted variable `Figtree` (`300–900`) for compact UI chrome and `JetBrains Mono` (`400–700`) with `tabular-nums` for clocks, move notation, time-control presets, and badges.

## Colors

A warm charcoal neutral scale frames the high-recognition cream-and-sage chessboard and vivid club-green primary controls, reserving crimson and amber strictly for semantic status and alert states.

### Primary
- **Tournament Green** (`#81b64c`): Primary action fills (`Play a Friend (Create Link)`, `Join Match & Load Board`, `Copy Link`, `Rematch`), brand crown icon (`BrandCrownIcon`), live room status dot, nav unread badge (`.nav-count`), active time-control preset border, active `OperatorDrawer` piece pills, `:focus-visible` `2px` outlines, caret tint, and positive alert/banner borders.
- **Tournament Green Hover** (`#95cc5a`): Hover fill for primary green buttons.
- **Tournament Green Edge** (`#45752a`): `1px` perimeter stroke and `3px` bottom bevel lip on primary green buttons.

### Neutral
- **Charcoal Ground** (`#302e2b`): Primary page canvas and central board stage ground.
- **Walnut Nav** (`#262522`): Left vertical navigation rail background (`.left-nav`).
- **Espresso Panel** (`#262421`): Right setup/match sidebar, invite gate card, modal dialog panels, match banners, promotion/reconnect cards, and operator subpanels/action tiles.
- **Obsidian Well** (`#21201d`): Recessed container troughs including the move ledger (`.moves-panel`), chat transcript (`.chat-scroll`), match meta bar, form inputs, segmented tab tracks, unselected time-control presets, standby clock pills, eval bar track, invite detail cells, and the operator drawer shell.
- **Umber Elevated** (`#363430`): Secondary button fills, active left-nav items, active segmented tabs, promotion piece buttons, and standard `.mono-badge` chips.
- **Umber Hover** (`#403e3a`): Hover fill for secondary buttons and ghost `.icon-btn` triggers.
- **Hairline Umber** (`#3c3a37`): `1px` structural dividers inside the left nav footer, join form separator, invite spec cells, modal dividers, social/account rows, and operator drawer header/footer.
- **Hairline Strong** (`#4d4a46`): `1px` interactive borders on inputs, secondary buttons, preset buttons, modal/card shells, black player avatars, offline status dots, eval bar frame, and scrollbar thumbs.
- **Pure Chalk Ink** (`#ffffff`): Primary headings, body copy, active navigation labels, SAN move notation, focus outline on board squares, and running clock pill background (`#ffffff` fill with `#21201d` digits).
- **Stone Muted Ink** (`#b8b6b2`): Inactive left-nav links, field labels, ghost button labels, standby clock digits, move pair numbers, captured material advantage (`+N`), and helper copy.
- **Board Cream** (`#eeeed2`): Light chessboard squares and white player avatar badge (`#eeeed2` fill with `#262421` initial).
- **Board Sage** (`#769656`): Dark chessboard squares paired with `Board Cream` for classic tournament contrast.
- **Board Last Light** (`#f6f682`): Last-move highlight on light chessboard squares.
- **Board Last Dark** (`#baca44`): Last-move highlight on dark chessboard squares.

### Semantic & Board States
- **Crimson Alert** (`#e03c3c`): Error alert border (`.inline-alert.is-error` with `rgba(224, 60, 60, 0.16)` fill and `#fecaca` ink), paired with `rgba(224, 60, 60, 0.22)` / `#ffb3b3` on Three-Check `.checks-badge` and `#fca5a5` on destructive `.btn.is-danger`.
- **Amber Wait** (`#e59c2e`): Connecting/waiting status dot (`.status-dot.is-wait`).
- **Observed Un-Tokenized Literals (Drift):** Board selection uses hardcoded `#f7f769` (light) / `#bbcb2b` (dark), check glow uses hardcoded `#e53935`, urgent `<20s` running clocks shift to hardcoded `#b33430`, the private eval bar fill/label uses `#f0f0ea` / `#9e9c98`, `OperatorDrawer` and `.chess-board.is-armed` use hardcoded `#f59e0b` / `#fbbf24`, `ChessBoard` hint arrows use `rgba(255, 170, 0, 0.88–0.92)`, and `ChessPiece` retains slate-tinted piece inks (`#fafbfd`/`#151922` light, `#11151d`/`#657289`/`#8592a8` dark) from the prior palette.

### Named Rules
**The Club Green CTA Rule.** `Tournament Green` (`#81b64c`) with its `Tournament Green Edge` (`#45752a`) bottom lip is reserved for primary game creation, match entry, rematch, invite copy, and live-status indicators; navigation and secondary board tools remain neutral umber.

**The Active-White Clock Flip Rule.** Standby clocks sit quietly in `Obsidian Well` (`#21201d`) with `Stone Muted Ink` (`#b8b6b2`) digits and snap cleanly to high-contrast `Pure Chalk Ink` (`#ffffff`) background with `#21201d` numerals when running, overriding to `#b33430` with `#ffffff` digits below 20 seconds.

## Typography

**Display Font:** None (compact utility scale; max heading is `1.35rem`)
**Body Font:** `Figtree` (variable `300–900`, fallback `system-ui, -apple-system, sans-serif`)
**Label/Mono Font:** `JetBrains Mono` (variable `400–700`, fallback `ui-monospace, monospace`)

**Character:** Compact geometric UI sans (`Figtree`) drives navigation, setup controls, player names, and inset board coordinates without oversized editorial headings, while `JetBrains Mono` enforces rigid `tabular-nums` alignment across digital clocks, move columns, and time-control grids.

### Hierarchy
- **Headline** (`Figtree`, `800`, `1.35rem` [`18.9px` at `14px` root; `1.05rem` on `<=900px`], `1.45` line-height, `-0.02em` letter-spacing): Right-sidebar `Play Chess` setup heading (`1.3rem` on `.invite-gate-head h2`).
- **Title** (`Figtree`, `800`, `16px`, `1.45` line-height, `-0.02em` letter-spacing on brand): `ChessArena` left-nav wordmark and modal headers (`15px` on `.create-room-btn` and `.promotion-title`/`.reconnect-title`).
- **Body** (`Figtree`, `400` base / `700` buttons & player names / `600` nav & banners, `14px` base / `13px` controls, `1.45` line-height): Primary UI prose, navigation links, buttons, inputs, player names, and empty ledger copy.
- **Label** (`Figtree`, `700` labels & segmented tabs / `600` chat & alerts, `12px` [`11px` on `.spec-label`, `.custom-timer-field`, `.btn-xs`], `1.45` line-height): Form labels, `Bullet | Blitz | Rapid | Custom` tabs, operator cells, chat lines, and inline alerts; `.sq-coord` uses `Figtree` `700` at `10px` (`9px` on `<=900px`, `1` line-height) inside corner squares.
- **Clock** (`JetBrains Mono`, `700`, `20px` [`15px` on `<=900px`], `1.45` line-height, `tabular-nums`): Right-aligned digital countdown clock pills (`05:00`, switching to `0:19.8` under 20 seconds, `∞` when untimed).
- **Mono** (`JetBrains Mono`, `700` [`.move-san` `600`], `12px` ledger & time presets / `11px` badges, nav counts, mini pills & material advantage / `9px` eval readout, `tabular-nums`): Algebraic move columns, room URLs, time-control chips, and operator diagnostics.

### Named Rules
**The Tabular Clock & Ledger Rule.** Every live-updating numeric string—clocks, move pair numbers, material delta (`+3`), unread counts, and engine evaluation—uses `JetBrains Mono` with `font-variant-numeric: tabular-nums` so numbers never shift width mid-match.

**The Inset Coordinate Rule.** Rank (`8–1`) and file (`a–h`) labels sit inside the top-left of column `a` and bottom-right of row `1` at `10px` `Figtree` `700` (`line-height: 1`), inheriting the opposing square color (`--sq-dark` on light squares, `--sq-light` on dark squares).

## Layout

The application runs as a full-height (`min-height: 100dvh`) three-column CSS Grid (`.chesscom-shell`: `152px 1fr 376px`) on desktop:
- **Left Navigation Rail (`.left-nav`, `152px`, `#262522`, `padding: 14px 10px`):** Vertical brand button (`ChessArena`), primary links (`Play`, `Bots`, `Friends`), and bottom utility anchor (`Sound: On/Off` and account/guest switcher).
- **Center Board Stage (`.chesscom-center`, `1fr`, `#302e2b`, `padding: 14px 20px`):** Horizontally and vertically centers `.center-board-col` (`max-width: min(640px, calc(100dvh - 134px))`, `gap: 8px`), stacking any active `.match-banner`, top `PlayerClockStrip`, `.board-shell` (`24px` optional `.eval-bar` + `1:1` `8x8` `.chess-board`), and bottom `PlayerClockStrip` (or `.invite-gate-panel` while awaiting link acceptance).
- **Right Action / Match Sidebar (`.right-sidebar`, `376px`, `#262421`, `padding: 16px`):** Houses `.play-card` configuration controls when idle and seamlessly switches to `.match-sidebar` (`match-meta-bar`, flex-filling `moves-panel`, `board-actions-bar`, and `170px`-tall `chat-panel`) during live or bot matches.
- **Concealed Overlay Drawer (`.operator-drawer`):** `position: fixed` right-edge sheet (`width: min(376px, 100vw); z-index: 35`) matching the right sidebar footprint when toggled for `canTroll` sessions.

**Responsive Breakpoints:**
- **`<= 1040px`:** `.chesscom-shell` shifts to `grid-template-columns: 1fr 340px; grid-template-rows: 48px 1fr`. `.left-nav` spans `1 / -1` as a horizontal `48px` top bar (`padding: 0 12px`) with horizontal links and compact account button.
- **`<= 900px`:** `.chesscom-shell` collapses to a vertical flex column. `.brand-wordmark` and the sound toggle hide inside the top bar; `.center-board-col` caps at `344px` (`gap: 5px`); `.player-strip` compacts to `34px` min-height (`28px` avatars, `78px × 28px` `15px` clock pills); `.right-sidebar` switches from a left border to a top `1px` hairline (`padding: 10px 12px`); and `.invite-spec-grid` stacks to `1fr`.

### Named Rules
**The Three-Column Arena Anchor Rule.** Desktop maintains `152px` navigation, a viewport-fitted `1:1` central board column (`min(640px, calc(100dvh - 134px))`), and a `376px` right panel so match entry, live notation, and board play never compete for vertical scroll.

## Elevation & Depth

This system uses **zero CSS `box-shadow` declarations**. Depth and component hierarchy rely on stepped warm-charcoal luminance (`#21201d` recessed wells → `#262421` / `#262522` sidebars & panels → `#302e2b` main canvas → `#363430` interactive controls → `#403e3a` hover), subtle `1px solid rgba(0, 0, 0, 0.25)` rail boundaries, `1px` structural borders (`#3c3a37` / `#4d4a46`), and dark translucent backdrop scrims (`rgba(15, 14, 12, 0.78)` on modals; `rgba(24, 23, 20, 0.8)` on promotion/reconnect overlays). Primary green buttons add tactile depth exclusively through a `3px` darker green bottom border (`--green-edge: #45752a`) and a `0 1px 0 rgba(0, 0, 0, 0.25)` text shadow.

### Named Rules
**The Tonal Well & Bevel Rule.** Containers communicate depth through recessed `#21201d` wells inside `#262421` panels without cast shadows, while primary CTAs derive physical weight from their `3px` bottom border bevel.

## Shapes

ChessArena softens architectural edges slightly with `--radius-sm` (`4px`) for nearly all interactive chrome—buttons, nav items, inputs, clock pills, player avatars, the `8x8` `.chess-board` frame, eval bar, segmented tracks, time presets, match banners, and list rows—and `--radius-md` (`6px`) for overlay panels (`.modal-panel`, `.invite-gate-panel`, `.promotion-panel`, `.reconnect-card`, `.fake-outcome-card`). Dense sub-items (`.seg-tab`, `.move-row`, `.mini-pill`, `.mono-badge`, scrollbar thumbs) step down to `3px`, `.nav-count` uses a `999px` capsule pill, and `50%` circles are restricted to `.status-dot`, `.legal-dot`, `.sq-capture::after`, and `.spinner-ring`. Individual chessboard squares have `0px` corners clipped cleanly by the board perimeter's `4px` radius.

### Named Rules
**The Soft-Cornered Club Chrome Rule.** Interactive UI controls standardize on `4px` (`--radius-sm`) and overlay cards on `6px` (`--radius-md`), keeping individual squares orthogonal (`0px`) inside the `4px`-rounded board frame.

## Components

Controls are compact, high-density, and tactile—featuring `120ms ease` background transitions, `70ms ease` `1px` downward active press (`translateY(1px)`), and `2px` `Tournament Green` `:focus-visible` outlines.

### Buttons
- **Shape:** `4px` radius (`--radius-sm`), `9px 14px` padding (`6px 10px` on `.btn-sm`; `4px 8px` on `.btn-xs`; `44px` height and `15px` font on `.create-room-btn`).
- **Primary (`.btn-green`, `.btn-primary`):** `Tournament Green` (`#81b64c`) fill, `1px` `#45752a` border with `border-bottom-width: 3px`, `#ffffff` `700`-weight text, `0 1px 0 rgba(0, 0, 0, 0.25)` text shadow.
- **Hover / Focus:** Shifts to `Tournament Green Hover` (`#95cc5a`); `:active` translates `1px` downward; `:focus-visible` shows `2px solid #81b64c` outline offset `2px`.
- **Secondary & Ghost:** Secondary uses `Umber Elevated` (`#363430`), `1px solid #4d4a46`, `#ffffff` ink, hovering to `Umber Hover` (`#403e3a`). Ghost uses `transparent` fill/border with `Stone Muted Ink` (`#b8b6b2`), shifting to `#363430` and `#ffffff` on hover.

### Chips
- **Style (`.mono-badge`, `.checks-badge`, `.nav-count`):** `.mono-badge` pairs `Umber Elevated` (`#363430`) fill with `1px solid #4d4a46`, `3px` radius, and `11px` `JetBrains Mono`; `.nav-count` uses `18px` min-width `999px` `Tournament Green` (`#81b64c`) fill with `#161512` numerals.
- **State:** `.mono-badge.is-accent` shifts border to `#81b64c`, fill to `rgba(129, 182, 76, 0.22)`, and ink to `#e4f7cf` for active operator privileges.

### Cards / Containers
- **Corner Style:** `0px` on full-height `.left-nav`, `.right-sidebar`, and `.operator-drawer`; `4px` (`--radius-sm`) on recessed troughs (`.moves-panel`, `.chat-scroll`, `.match-meta-bar`, `.invite-spec-cell`, `.op-cell`, `.op-subpanel`, `.eval-readout-card`); `6px` (`--radius-md`) on modals, `.invite-gate-panel`, and board overlay dialogs.
- **Background:** `Espresso Panel` (`#262421`) for primary sidebars, modals, and operator cards; `Obsidian Well` (`#21201d`) for recessed scrollable lists, meta bars, and the drawer shell.
- **Shadow Strategy:** None (`Elevation & Depth` tonal layering and `1px` borders only).
- **Border:** `1px solid #3c3a37` on nested rows and structural dividers; `1px solid #4d4a46` on modals, invite gate, and operator cells.
- **Internal Padding:** `26px` on `.invite-gate-panel`, `20px` on `.modal-panel`, `16px` on `.right-sidebar`, `10px–14px` inside operator panels and sub-cards.

### Inputs / Fields
- **Style (`.text-input`, `.select-input`):** `36px` height (`32px` on `<=900px`), `0 10px` padding, `Obsidian Well` (`#21201d`) fill, `1px solid #4d4a46`, `4px` radius, `13px` `Figtree` (`JetBrains Mono` on `.duration-input`), `#81b64c` caret.
- **Focus:** Border shifts cleanly to `Tournament Green` (`#81b64c`) with `outline: none` on text/select fields.
- **Error / Disabled:** Validation errors display in `.inline-alert.is-error` (`#e03c3c` border, `rgba(224, 60, 60, 0.16)` fill, `#fecaca` ink); disabled buttons drop to `0.45` opacity with `not-allowed` cursor.

### Navigation
- **Style & States:** `152px` `.left-nav` (`#262522`, `1px solid rgba(0, 0, 0, 0.25)` right edge) containing `.chesscom-brand` (`BrandCrownIcon` + `ChessArena` `16px` `800`), vertical `.left-nav-item` buttons (`9px 10px`, `4px` radius, `13px` `600`, active `#363430` fill and `#ffffff` ink), and bottom `.left-nav-account` (`#21201d`, `1px solid #3c3a37`). `.segmented-tabs` tracks use `#21201d` (`3px` padding, `4px` radius) with `#363430` active `.seg-tab` pills (`3px` radius).

### Player Clock Strip
`PlayerClockStrip` pairs a `36px` rounded-square avatar (`.is-white` `#eeeed2`/`#262421`, `.is-black` `#1f1e1b`/`#f3f3f3`), player name (`14px` `700`), `15px` captured-piece SVG strip with `+N` delta, and a `104px × 38px` digital `.chesscom-clock` pill (`#21201d` standby → `#ffffff`/`#21201d` running → `#b33430`/`#ffffff` `<20s` urgent).

### Coordinate-Inset Board & Concealed Operator Drawer
`.board-shell` frames an optional `24px` vertical `.eval-bar` beside the `1:1` `4px`-rounded `.chess-board` with `10px` inset rank/file coordinates, `28%` translucent black `.legal-dot` markers, and `4px`-stroked capture rings. When `canTroll` is true, `.operator-drawer` renders as a `376px` fixed right-edge `#21201d` sheet (`2px solid #f59e0b` left divider) organizing `Cheats`, `Clocks`, `Trolls`, and `Engine` controls into `2-column` `.op-cell` tiles and `24px` `.mini-pill` selectors while remaining absent from unauthorized DOM.

### Named Rules
**The Concealed Operator Overlay Rule.** `OperatorDrawer` overlays the right sidebar at the exact `376px` desktop width using the same `#21201d` / `#262421` surface family, `4px` radius, `segmented-tabs`, and `.btn` hierarchy while never rendering any DOM nodes when `canTroll` is false.

## Do's and Don'ts

### Do:
- **Do** preserve the three-column Chess.com proportions (`152px 1fr 376px`), warm charcoal-walnut surfaces (`#302e2b` / `#262522` / `#262421` / `#21201d`), and `4px`/`6px` radii across new views and modals.
- **Do** invert active digital clocks cleanly to `Pure Chalk Ink` (`#ffffff`) background with `#21201d` tabular `JetBrains Mono` digits, keeping standby clocks recessed in `Obsidian Well` (`#21201d`).
- **Do** keep `Tournament Green` (`#81b64c`) with its `3px` `#45752a` bottom bevel for primary match actions while leaving navigation and board controls neutral umber.
- **Do** honor `prefers-reduced-motion: reduce` across transitions, piece nudges, and sync spinners (`0.01ms`).
- **Do** gate all `OperatorDrawer`, evaluation bar, and hint-arrow markup behind `canTroll` so guests never see concealed tooling.

### Don't:
- **Don't** introduce `box-shadow` elevation, glassmorphism blur, or neon accents onto panels, modals, or board frames.
- **Don't** break the `1:1` cream-and-sage board geometry (`#eeeed2` / `#769656`) or move coordinates outside the board squares.
- **Don't** omit `font-variant-numeric: tabular-nums` on clocks, algebraic move columns, or eval readouts.
- **Don't** ship additional un-tokenized hex literals (such as `#f59e0b`, `#b33430`, `#e53935`, or `#f7f769`) or leave `Vesper64` naming leftovers in new surfaces; consolidate semantic alerts onto `:root` tokens and verify text contrast (note existing `#ffffff` on `#81b64c` CTAs and `#9e9c98` on `#f0f0ea` eval bars fall below WCAG AA 4.5:1).
