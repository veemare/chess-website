---
name: "ChessArena"
description: "Chess.com-style three-column warm charcoal chess arena with a classic cream-and-sage tournament board, WCAG-accessible beveled green CTAs, high-contrast clock pills, a live spectator feed, and a concealed operator drawer."
colors:
  tournament-green: "#81b64c"
  tournament-green-btn: "#4d7e23"
  tournament-green-btn-hover: "#44711e"
  tournament-green-edge: "#355916"
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
    fontSize: "1.5rem"
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
    backgroundColor: "{colors.tournament-green-btn}"
    textColor: "{colors.pure-chalk-ink}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.tournament-green-btn-hover}"
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

ChessArena adopts a familiar three-column online chess layout modeled 1-to-1 after Chess.com: a narrow dark-walnut left navigation rail (`#262522`) with `Play`, `Watch`, `Friends`, and bottom `Sign Up` / `Log In` triggers; a centered warm-charcoal board stage (`#302e2b`) anchoring a classic cream-and-sage `8x8` board (`#eeeed2` / `#769656`) with smooth pointer-tracked piece dragging (`.floating-drag-piece`) between compact player clock strips; and a floating `8px`-rounded dark-espresso right sidebar card (`#262421`) that leads with the `Play Chess` launcher menu before branching into match setup, the `Watch Live` spectator feed, or live algebraic notation, board controls, and room chat.

Cover credibility remains foundational: guests join via link or code with zero onboarding wall and zero visible trace of hidden tooling. Authorized accounts retain silent access to the fixed right-edge `Operator Console` drawer via `Ctrl+Shift+T` / `Cmd+Shift+T` or triple-clicking the `ChessArena` mark, and dismiss all concealed state in one stroke with `Esc`.

**Key Characteristics:**
- Warm charcoal-and-walnut tonal architecture (`#21201d` wells, `#262421` / `#262522` sidebars, `#302e2b` main arena, `#363430` interactive controls) with zero drop shadows across panels and cards, locked to `100dvh` on desktop so dragging and moves never scroll the page.
- Classic tournament cream-and-sage chessboard (`#eeeed2` / `#769656`) with inset corner rank/file coordinates, yellow-olive last-move highlights (`#f6f682` / `#baca44`), translucent dark move dots/capture rings, warm Neo-style SVG pieces, and a backgroundless pointer-dragged piece layer (`.floating-drag-piece`).
- WCAG AA-accessible club-green primary CTAs (`#4d7e23` resting, `#44711e` hover, `4.86:1` / `5.79:1` against `#ffffff`) anchored by a `3px` deep-green bottom bevel (`#355916`) and paired with bright `Tournament Green` (`#81b64c`) indicators and flat `Umber Elevated` (`#363430`) secondary controls.
- High-contrast digital clock pills (`20px` `JetBrains Mono` tabular digits) that invert from recessed `Obsidian Well` (`#21201d`) at rest to `Pure Chalk Ink` (`#ffffff`) on `#21201d` text during the active turn.
- Self-hosted variable `Figtree` (`300–900`) for compact UI chrome and `JetBrains Mono` (`400–700`) with `tabular-nums` for clocks, move notation, time-control presets, and badges.

## Colors

A warm charcoal neutral scale frames the high-recognition cream-and-sage chessboard and two-tier club-green palette—pairing WCAG AA-compliant `Tournament Green CTA` (`#4d7e23`) for white-ink buttons with bright `Tournament Green` (`#81b64c`) for icons, borders, and dark-ink pills, while reserving crimson and amber strictly for semantic status and alert states.

### Primary
- **Tournament Green** (`#81b64c`): Brand crown icon (`BrandCrownIcon`), live room/spectator status dot (`.status-dot.is-live`), nav unread badge (`.nav-count` with `#161512` ink), `.watch-cta` (`Watch`), `.watch-game-card:hover` border, active time-control preset border, active `OperatorDrawer` piece pills (`.mini-pill.is-active` with `#161512` ink), `:focus-visible` `2px` outlines, caret tint, `.menu-icon-wrap.is-green`, and positive alert/banner borders.
- **Tournament Green CTA** (`#4d7e23`): WCAG AA-compliant (`4.86:1` contrast with `#ffffff`) fill (`--green-btn`) for `.btn-green` / `.btn-primary` actions (`Sign Up`, `Create Invite Link`, `Start Bot Match`, `Open Invite`, `Join Match & Load Board`, `Copy Link`, `Accept`, `Rematch`, and modal primary submits).
- **Tournament Green CTA Hover** (`#44711e`): Hover fill (`--green-btn-hover`, `5.79:1` contrast with `#ffffff`) for primary green buttons.
- **Tournament Green Edge** (`#355916`): `1px` perimeter stroke and `3px` bottom bevel lip (`--green-edge`) on primary green buttons.

### Neutral
- **Charcoal Ground** (`#302e2b`): Primary page canvas and central board stage ground.
- **Walnut Nav** (`#262522`): Left vertical navigation rail background (`.left-nav`).
- **Espresso Panel** (`#262421`): Rounded right sidebar card (`.right-sidebar`), invite gate card, modal dialog panels, match banners, promotion/reconnect cards, and operator subpanels.
- **Obsidian Well** (`#21201d`): Recessed container troughs including the move ledger (`.moves-panel`), chat transcript (`.chat-scroll`), match meta bar, form inputs, segmented tab tracks, unselected time-control presets, `.watch-game-card` / `.empty-watch-box`, standby clock pills, eval bar track, invite detail cells, and the operator drawer shell.
- **Umber Elevated** (`#363430`): Secondary button fills, active left-nav items, active segmented tabs, hovered watch cards, promotion piece buttons, and standard `.mono-badge` chips.
- **Umber Hover** (`#403e3a`): Hover fill for secondary buttons and ghost `.icon-btn` triggers.
- **Hairline Umber** (`#3c3a37`): `1px` structural borders on `.watch-game-card`, `.left-nav-account`, join form separator, invite spec cells, modal dividers, social/account rows, operator drawer header/footer, and responsive `<=1040px` / `<=900px` edges.
- **Hairline Strong** (`#4d4a46`): `1px` interactive borders on inputs, secondary buttons, preset buttons, modal/card shells, black player avatars, offline status dots, eval bar frame, and scrollbar thumbs.
- **Pure Chalk Ink** (`#ffffff`): Primary headings, body copy, active navigation labels, primary CTA text, SAN move notation, focus outline on board squares, and running clock pill background (`#ffffff` fill with `#21201d` digits).
- **Stone Muted Ink** (`#b8b6b2`): Inactive left-nav links, sound toggle, footer links, field labels, ghost button labels, standby clock digits, move pair numbers, captured material advantage (`+N`), and helper copy.
- **Board Cream** (`#eeeed2`): Light chessboard squares and white player avatar badge (`#eeeed2` fill with `#262421` initial).
- **Board Sage** (`#769656`): Dark chessboard squares paired with `Board Cream` for classic tournament contrast.
- **Board Last Light** (`#f6f682`): Last-move highlight on light chessboard squares.
- **Board Last Dark** (`#baca44`): Last-move highlight on dark chessboard squares.

### Semantic & Board States
- **Crimson Alert** (`#e03c3c`): Error alert border (`.inline-alert.is-error` with `rgba(224, 60, 60, 0.16)` fill and `#fecaca` ink), paired with `rgba(224, 60, 60, 0.22)` / `#ffb3b3` on Three-Check `.checks-badge` and `#fca5a5` on destructive `.btn.is-danger`.
- **Amber Wait** (`#e59c2e`): Connecting/waiting status dot (`.status-dot.is-wait`).
- **Observed Un-Tokenized Literals (Drift):** `--green-hover` (`#95cc5a`) remains declared in `:root` but unreferenced after primary CTAs adopted `--green-btn-hover` (`#44711e`); `.menu-action-card` uses hardcoded `#2f2d2a` fill / `#3a3733` hover with category icon accents `#f5b400` (`Play Online`), `#5ea3e5` (`Play Bots`), `#e69d6c` (`Play a Friend`), and `#7cc4fa` (`Watch Live`); board selection uses `#f7f769` (light) / `#bbcb2b` (dark); check glow uses `#e53935`; urgent `<20s` running clocks shift to `#b33430`; the private eval bar fill/label uses `#f0f0ea` / `#9e9c98`; `OperatorDrawer` and `.chess-board.is-armed` use `#f59e0b` / `#fbbf24`; `ChessBoard` hint arrows use `rgba(255, 170, 0, 0.88–0.92)`; and `ChessPiece` uses warm Neo-style SVG inks (`#f8f8f5`/`#d7d5ce`/`#383633` light; `#4a4744`/`#312f2c`/`#1b1a18`/`#7b7772` dark).

### Named Rules
**The Club Green CTA Rule.** White-text primary buttons exclusively use `Tournament Green CTA` (`#4d7e23`, hover `#44711e`) with its `Tournament Green Edge` (`#355916`) bottom lip for WCAG AA contrast (`>=4.86:1`), reserving bright `Tournament Green` (`#81b64c`) for dark-surface accents, borders, and `#161512`-ink pills.

**The Active-White Clock Flip Rule.** Standby clocks sit quietly in `Obsidian Well` (`#21201d`) with `Stone Muted Ink` (`#b8b6b2`) digits and snap cleanly to high-contrast `Pure Chalk Ink` (`#ffffff`) background with `#21201d` numerals when running, overriding to `#b33430` with `#ffffff` digits below 20 seconds.

## Typography

**Display Font:** None (compact utility scale; max heading is `1.5rem`)
**Body Font:** `Figtree` (variable `300–900`, fallback `system-ui, -apple-system, sans-serif`)
**Label/Mono Font:** `JetBrains Mono` (variable `400–700`, fallback `ui-monospace, monospace`)

**Character:** Compact geometric UI sans (`Figtree`) drives navigation, the `Play Chess` and `Watch Live` launcher cards, player names, and inset board coordinates without oversized editorial headings, while `JetBrains Mono` enforces rigid `tabular-nums` alignment across digital clocks, move columns, and time-control grids.

### Hierarchy
- **Headline** (`Figtree`, `800`, `1.5rem` [`21px` at `14px` root], `1.45` line-height, `-0.02em` letter-spacing): Right-sidebar `Play Chess` and `Watch Live` headings (`.play-card-title-row h1`, hidden on `<=900px`); `.invite-gate-head h2` uses `1.3rem`, `.setup-back-row h2` uses `1.15rem`, and legacy `.play-card-header h1` uses `1.35rem` (`1.05rem` on `<=900px`).
- **Title** (`Figtree`, `800`, `16px`, `1.45` line-height, `-0.02em` letter-spacing on brand): `ChessArena` left-nav wordmark and modal headers (`15px` `800` on `.menu-text strong`, `.promotion-title`, `.reconnect-title`, and `.fake-outcome-title`; `15px` `700` on `.create-room-btn`).
- **Body** (`Figtree`, `400` base / `700` buttons, player names & `.watch-players` / `600` nav & banners, `14px` base / `13px` controls & watch titles, `1.45` line-height): Primary UI prose, navigation links, buttons, inputs, player names, and empty ledger copy.
- **Label** (`Figtree`, `700` labels, footer links & segmented tabs / `600` sound toggle, chat & alerts, `12px` [`11px` on `.watch-card-top`, `.watch-card-foot`, `.spec-label`, `.custom-timer-field`, `.btn-xs`], `1.45` line-height): Form labels, `.menu-text span`, `Bullet | Blitz | Rapid | Custom` and `All | Real Players | Player vs Bots` tabs, operator cells, chat lines, and inline alerts; `.sq-coord` uses `Figtree` `700` at `10px` (`9px` on `<=900px`, `1` line-height) inside corner squares.
- **Clock** (`JetBrains Mono`, `700`, `20px` [`15px` on `<=900px`], `1.45` line-height, `tabular-nums`): Right-aligned digital countdown clock pills (`05:00`, switching to `0:19.8` under 20 seconds, `∞` when untimed).
- **Mono** (`JetBrains Mono`, `700` [`.move-san` `600`], `12px` ledger & time presets / `11px` badges, nav counts, mini pills & material advantage / `9px` eval readout, `tabular-nums`): Algebraic move columns, room URLs, time-control chips, and operator diagnostics.

### Named Rules
**The Tabular Clock & Ledger Rule.** Every live-updating numeric string—clocks, move pair numbers, material delta (`+3`), unread counts, and engine evaluation—uses `JetBrains Mono` with `font-variant-numeric: tabular-nums` so numbers never shift width mid-match.

**The Inset Coordinate Rule.** Rank (`8–1`) and file (`a–h`) labels sit inside the top-left of column `a` and bottom-right of row `1` at `10px` `Figtree` `700` (`line-height: 1`), inheriting the opposing square color (`--sq-dark` on light squares, `--sq-light` on dark squares).

## Layout

On desktop, the application locks to `height: 100dvh; overflow: hidden` as a three-column CSS Grid (`.chesscom-shell`: `148px 1fr 390px`) so pointer piece dragging and move updates never trigger page scrolling:
- **Left Navigation Rail (`.left-nav`, `148px`, `#262522`, `padding: 14px 10px`):** Vertical brand button (`ChessArena`), primary links (`Play`, `Watch`, `Friends` with `.nav-count` badge), and bottom auth/utility cluster (`Sign Up` + `Log In` `.left-auth-btn` buttons when signed out or `.left-nav-account` pill when signed in, plus `Sound: On/Off`).
- **Center Board Stage (`.chesscom-center`, `1fr`, `#302e2b`, `padding: 14px 20px`):** Horizontally and vertically centers `.center-board-col` (`max-width: min(640px, calc(100dvh - 134px))`, `gap: 8px`), stacking any active `.match-banner`, top `PlayerClockStrip`, `.board-shell` (`24px` optional `.eval-bar` + `1:1` `8x8` `.chess-board`), and bottom `PlayerClockStrip` (or `.invite-gate-panel` while awaiting link acceptance).
- **Right Action / Menu / Watch / Match Sidebar (`.right-sidebar`, inside the `390px` track, `#262421`, `border-radius: 8px`, `margin: 14px 14px 14px 0`, `padding: 20px 18px`, `overflow-y: auto`):** Leads idle sessions with `.play-menu-card` (`Play Chess` menu with five `.menu-action-card` launchers and a two-link `.menu-card-footer`), opens `.play-card` setup forms (`Play Online`, `Play Bots`, `Join Match`), displays `.watch-sidebar` (`All` | `Real Players` | `Player vs Bots` live games list and spectator controls), or renders `.match-sidebar` (`match-meta-bar`, flex-filling `moves-panel`, `board-actions-bar`, and `170px`-tall `chat-panel`).
- **Concealed Overlay Drawer (`.operator-drawer`):** `position: fixed` right-edge sheet (`width: min(376px, 100vw); z-index: 35`) overlapping the right column when toggled for `canTroll` sessions.

**Responsive Breakpoints:**
- **`<= 1040px`:** `.chesscom-shell` shifts to `grid-template-columns: 1fr 340px; grid-template-rows: 48px 1fr`. `.left-nav` spans `1 / -1` as a horizontal `48px` top bar (`padding: 0 12px`, `border-bottom: 1px solid #3c3a37`) with horizontal links, compact `30px` auth buttons, sound toggle, and account pill; `.right-sidebar` narrows its margin to `8px`.
- **`<= 900px`:** `.chesscom-shell` unlocks scroll (`height: auto; min-height: 100dvh; overflow: visible; display: flex; flex-direction: column`). `.brand-wordmark`, `.left-nav-sound`, and the secondary `Log In` button (`.left-nav-bottom .btn-secondary`) hide inside the `48px` top bar while `.left-auth-btn` shrinks to `28px` height (`11px`); `.center-board-col` caps at `344px` (`gap: 5px`); `.piece-wrap` drops to `78%`; `.player-strip` compacts to `34px` min-height (`28px` avatars, `78px × 28px` `15px` clock pills); `.right-sidebar` becomes full-bleed (`margin: 0; border-radius: 0; border-top: 1px solid #3c3a37; padding: 10px 12px`); `.play-card-title-row` hides and `.menu-action-card` compacts (`padding: 8px 12px`, `28px` icon wrap); and `.invite-spec-grid` stacks to `1fr`.

### Named Rules
**The Three-Column Arena Anchor Rule.** Desktop maintains a `100dvh`-locked `148px 1fr 390px` grid pairing a narrow walnut nav rail, a viewport-fitted `1:1` board column (`min(640px, calc(100dvh - 134px))`), and an `8px`-rounded `right-sidebar` card so match entry, live spectating, notation, and dragging never fight for page scroll.

## Elevation & Depth

Cards, sidebars, and modal panels use **zero drop-shadow elevation**. Hierarchy relies on stepped warm-charcoal luminance (`#21201d` recessed wells → `#262421` / `#262522` sidebars & panels → `#2f2d2a` menu cards → `#302e2b` main canvas → `#363430` interactive controls → `#403e3a` hover), subtle `1px solid rgba(0, 0, 0, 0.25)` nav rail edge, `1px` structural borders (`#3c3a37` / `#4d4a46`), and dark translucent backdrop scrims (`rgba(15, 14, 12, 0.78)` on modals; `rgba(24, 23, 20, 0.8)` on promotion/reconnect overlays). Primary green buttons add tactile depth exclusively through a `3px` darker green bottom border (`--green-edge: #355916`). The only `box-shadow` in the stylesheet is a flat `inset 0 0 0 3px rgba(255, 255, 255, 0.65)` ring on `.sq-drag-hover` indicating legal pointer-drag drop squares, while `.floating-drag-piece` lifts dragged SVGs onto a `position: fixed; z-index: 90` GPU-translated layer above the board with zero background plate.

### Named Rules
**The Tonal Well & Bevel Rule.** Containers communicate depth through recessed `#21201d` wells inside `#262421` panels without cast drop shadows, while primary CTAs derive physical weight from their `3px` bottom border bevel.

## Shapes

ChessArena softens architectural edges with `--radius-sm` (`4px`) for interactive controls—buttons, nav items, inputs, clock pills, player avatars, `.menu-icon-wrap`, `.empty-watch-box`, the `8x8` `.chess-board` frame, eval bar, segmented tracks, time presets, match banners, and list rows—and `--radius-md` (`6px`) for `.menu-action-card`, `.watch-game-card`, and overlay panels (`.modal-panel`, `.invite-gate-panel`, `.promotion-panel`, `.reconnect-card`, `.fake-outcome-card`). The desktop `.right-sidebar` card rounds its outer frame to `8px` (`0px` on `<=900px`), dense sub-items (`.seg-tab`, `.move-row`, `.mini-pill`, `.mono-badge`, scrollbar thumbs) step down to `3px`, `.nav-count` uses a `999px` capsule pill, and `50%` circles are restricted to `.status-dot`, `.legal-dot`, `.sq-capture::after`, and `.spinner-ring`. Individual chessboard squares have `0px` corners clipped cleanly by the board perimeter's `4px` radius.

### Named Rules
**The Soft-Cornered Club Chrome Rule.** Interactive UI controls standardize on `4px` (`--radius-sm`), launcher/spectator/overlay cards on `6px` (`--radius-md`), and the desktop right sidebar frame on `8px`, keeping individual squares orthogonal (`0px`) inside the `4px`-rounded board frame.

## Components

Controls are compact, high-density, and tactile—featuring `120ms ease` background transitions, `70ms ease` `1px` downward active press (`translateY(1px)`), and `2px` `Tournament Green` `:focus-visible` outlines.

### Buttons
- **Shape:** `4px` radius (`--radius-sm`), `9px 14px` padding (`6px 10px` on `.btn-sm`; `4px 8px` on `.btn-xs`; `36px` height and `13px` font on `.left-auth-btn`; `44px` height and `15px` font on setup `.create-room-btn` submit CTAs).
- **Primary (`.btn-green`, `.btn-primary`):** `Tournament Green CTA` (`#4d7e23`) fill, `1px` `#355916` border with `border-bottom-width: 3px`, `#ffffff` `700`-weight text (`4.86:1` WCAG AA contrast).
- **Hover / Focus:** Shifts to `Tournament Green CTA Hover` (`#44711e`, `5.79:1` contrast); `:active` translates `1px` downward; `:focus-visible` shows `2px solid #81b64c` outline offset `2px`.
- **Secondary & Ghost:** Secondary uses `Umber Elevated` (`#363430`), `1px solid #4d4a46`, `#ffffff` ink, hovering to `Umber Hover` (`#403e3a`). Ghost uses `transparent` fill/border with `Stone Muted Ink` (`#b8b6b2`), shifting to `#363430` and `#ffffff` on hover.

### Chips
- **Style (`.mono-badge`, `.checks-badge`, `.nav-count`):** `.mono-badge` pairs `Umber Elevated` (`#363430`) fill with `1px solid #4d4a46`, `3px` radius, and `11px` `JetBrains Mono`; `.nav-count` uses `18px` min-width `999px` `Tournament Green` (`#81b64c`) fill with `#161512` numerals (`7.59:1` contrast).
- **State:** `.mono-badge.is-accent` shifts border to `#81b64c`, fill to `rgba(129, 182, 76, 0.22)`, and ink to `#e4f7cf` for active operator privileges.

### Cards / Containers
- **Corner Style:** `0px` on full-height `.left-nav` and `.operator-drawer`; `8px` on desktop `.right-sidebar` (`0px` on `<=900px`); `4px` (`--radius-sm`) on recessed troughs (`.moves-panel`, `.chat-scroll`, `.match-meta-bar`, `.empty-watch-box`, `.invite-spec-cell`, `.op-cell`, `.op-subpanel`, `.eval-readout-card`); `6px` (`--radius-md`) on `.menu-action-card`, `.watch-game-card`, modals, `.invite-gate-panel`, and board overlay dialogs.
- **Background:** `Espresso Panel` (`#262421`) for `.right-sidebar`, modals, and operator cards; `#2f2d2a` (hover `#3a3733`) for `.menu-action-card`; `Obsidian Well` (`#21201d`) for `.watch-game-card` (hover `#363430` + `#81b64c` border), recessed scrollable lists, meta bars, and the drawer shell.
- **Shadow Strategy:** None (`Elevation & Depth` tonal layering and `1px` borders only).
- **Border:** `1px solid #3c3a37` on `.watch-game-card`, nested rows, and structural dividers; `1px solid #4d4a46` on modals, invite gate, and operator cells; `border: 0` on `.menu-action-card`.
- **Internal Padding:** `26px` on `.invite-gate-panel`, `20px 18px` on `.right-sidebar`, `20px` on `.modal-panel`, `13px 16px` on `.menu-action-card`, `11px 12px` on `.watch-game-card`, and `10px–14px` inside operator panels and sub-cards.

### Inputs / Fields
- **Style (`.text-input`, `.select-input`):** `36px` height (`32px` on `<=900px`), `0 10px` padding, `Obsidian Well` (`#21201d`) fill, `1px solid #4d4a46`, `4px` radius, `13px` `Figtree` (`JetBrains Mono` on `.duration-input`), `#81b64c` caret.
- **Focus:** Border shifts cleanly to `Tournament Green` (`#81b64c`) with `outline: none` on text/select fields.
- **Error / Disabled:** Validation errors display in `.inline-alert.is-error` (`#e03c3c` border, `rgba(224, 60, 60, 0.16)` fill, `#fecaca` ink); disabled buttons drop to `0.45` opacity with `not-allowed` cursor.

### Navigation
- **Style & States:** `148px` `.left-nav` (`#262522`, `1px solid rgba(0, 0, 0, 0.25)` right edge) containing `.chesscom-brand` (`BrandCrownIcon` + `ChessArena` `16px` `800`), vertical `.left-nav-item` buttons (`Play`, `Watch`, `Friends`, `9px 10px`, `4px` radius, `13px` `600`, active `#363430` fill and `#ffffff` ink), and `.left-nav-bottom` (`Sign Up` `.btn-green` + `Log In` `.btn-secondary` at `36px` height, or `.left-nav-account` `#21201d` pill, plus `.left-nav-sound`). `.segmented-tabs` tracks use `#21201d` (`3px` padding, `4px` radius) with `#363430` active `.seg-tab` pills (`3px` radius).

### Play Chess Menu & Watch Live Sidebar
- **`Play Chess` Menu (`.play-menu-card`):** Centers `BrandCrownIcon` + `Play Chess` (`1.5rem` `800`) over five `.menu-action-card` rows (`Play Online`, `Play Bots`, `Play a Friend`, `Watch Live`, `Chess Variants`), each pairing a `34px` tinted `.menu-icon-wrap` (`#f5b400`, `#5ea3e5`, `#e69d6c`, `#7cc4fa`, `#81b64c`) with `15px` `800` title and `12px` muted subcopy, anchored by `.menu-card-footer` (`Join by Code`, `Friends List`).
- **`Watch Live` Sidebar (`.watch-sidebar`):** Pairs `BinocularsIcon` + `Watch Live` (`1.5rem` `800`) with `All | Real Players | Player vs Bots` `.segmented-tabs` and scrollable `.watch-game-card` entries (`status-dot` mode tag, variant/timer metadata, `whiteName vs blackName`, move counter, and `#81b64c` `Watch` CTA) that transition into `.match-sidebar` spectator mode on click.

### Player Clock Strip
`PlayerClockStrip` pairs a `36px` rounded-square avatar (`.is-white` `#eeeed2`/`#262421`, `.is-black` `#1f1e1b`/`#f3f3f3`), player name (`14px` `700`), `15px` captured-piece SVG strip with `+N` delta, and a `104px × 38px` digital `.chesscom-clock` pill (`#21201d` standby → `#ffffff`/`#21201d` running → `#b33430`/`#ffffff` `<20s` urgent).

### Coordinate-Inset Board, Pointer Piece Drag & Concealed Operator Drawer
`.board-shell` frames an optional `24px` vertical `.eval-bar` beside the `1:1` `4px`-rounded `.chess-board` (`touch-action: none`) with `10px` inset rank/file coordinates, `18%` translucent black `.legal-dot` markers, `4px`-stroked capture rings, and warm Neo-style SVG pieces (`#f8f8f5`/`#d7d5ce`/`#383633` light; `#4a4744`/`#312f2c`/`#1b1a18`/`#7b7772` dark). Pointer dragging (`>=5px` travel) dims `.piece-wrap.is-dragging-origin` (`opacity: 0.25`), highlights hovered legal targets with `.sq-drag-hover` (`inset 0 0 0 3px rgba(255, 255, 255, 0.65)`), and floats a transparent `88%`-square-sized `.floating-drag-piece` SVG (`z-index: 90`, `translate3d`) under the cursor with zero square background. When `canTroll` is true, `.operator-drawer` renders as a fixed right-edge `#21201d` sheet (`width: min(376px, 100vw)`, `2px solid #f59e0b` left divider) organizing `Cheats`, `Clocks`, `Trolls`, and `Engine` controls into `2-column` `.op-cell` tiles and `24px` `.mini-pill` selectors while remaining absent from unauthorized DOM.

### Named Rules
**The Concealed Operator Overlay Rule.** `OperatorDrawer` overlays the `390px` right column at `min(376px, 100vw)` using the same `#21201d` / `#262421` surface family, `4px` radius, `segmented-tabs`, and `.btn` hierarchy while never rendering any DOM nodes when `canTroll` is false.

## Do's and Don'ts

### Do:
- **Do** preserve the Chess.com proportions (`148px 1fr 390px` locked to `100dvh` on desktop, `8px`-rounded right sidebar card), warm charcoal-walnut surfaces (`#302e2b` / `#262522` / `#262421` / `#21201d`), and `4px`/`6px` radii across new views and modals.
- **Do** use `Tournament Green CTA` (`#4d7e23`, hover `#44711e`, `#355916` `3px` bottom bevel) for all white-text primary CTAs so every button meets WCAG AA contrast (`>=4.86:1`), reserving `#81b64c` for icons, links on dark ground, borders, and `#161512`-ink badges.
- **Do** invert active digital clocks cleanly to `Pure Chalk Ink` (`#ffffff`) background with `#21201d` tabular `JetBrains Mono` digits, keeping standby clocks recessed in `Obsidian Well` (`#21201d`).
- **Do** keep dragged pieces on the backgroundless `.floating-drag-piece` pointer layer (`touch-action: none` on `.chess-board`) with `.piece-wrap.is-dragging-origin` dimmed to `0.25`.
- **Do** honor `prefers-reduced-motion: reduce` across transitions, piece nudges, and sync spinners (`0.01ms`).
- **Do** gate all `OperatorDrawer`, evaluation bar, and hint-arrow markup behind `canTroll` so guests never see concealed tooling.

### Don't:
- **Don't** introduce drop-shadow `box-shadow` elevation, glassmorphism blur, or neon accents onto panels, modals, or board frames (the only `box-shadow` belongs to the flat inset `.sq-drag-hover` drop-target ring).
- **Don't** place `#ffffff` text on `#81b64c` (`2.41:1` fails WCAG AA); always route white-ink buttons through `--green-btn` (`#4d7e23`).
- **Don't** break the `1:1` cream-and-sage board geometry (`#eeeed2` / `#769656`) or move coordinates outside the board squares.
- **Don't** omit `font-variant-numeric: tabular-nums` on clocks, algebraic move columns, or eval readouts.
- **Don't** ship additional un-tokenized hex literals (such as `#2f2d2a`, `#3a3733`, `#f5b400`, `#5ea3e5`, `#e69d6c`, `#7cc4fa`, `#f59e0b`, `#b33430`, `#e53935`, or `#f7f769`) or leave `Vesper64` naming leftovers in new surfaces; consolidate semantic alerts onto `:root` tokens and fix `.eval-bar-num` `#9e9c98` over `#f0f0ea` (`2.40:1`, below WCAG AA 4.5:1).
