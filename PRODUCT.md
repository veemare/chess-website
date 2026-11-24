# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript static frontend deployed on Netlify's free tier, paired with Netlify Functions + Netlify Blobs for optional user accounts, Owner role management, and persistent/temporary troll access grants (with a matching local dev API server for local testing). Real-time multiplayer runs primarily peer-to-peer over WebRTC (PeerJS) with BroadcastChannel cross-tab support and an HTTP room-relay fallback via Netlify Functions/Blobs.

## Users

- **Host / Owner:** The site owner who creates and runs the app on Netlify's free tier, holds permanent Owner privileges, plays casual or prank matches with friends, and grants or revokes permanent or time-limited troll permissions for specific accounts.
- **Invited Friends (Guests or Optional Account Holders):** Friends joining via a shareable room code or invite URL across devices. Guests can play immediately without registering; players who want persistent identity or who may be granted troll permissions can optionally create an account.
- **Granted Troll Players:** Specific registered users granted permanent or temporary troll privileges by the Owner.

## Product Purpose

Deliver a legitimate, tournament-grade online multiplayer chess studio for playing with friends via instant shareable room links, where guests require zero signup, while secretly equipping the Owner (and any accounts they authorize permanently or temporarily) with an invisible, real-time troll menu to bend rules, manipulate clocks, play visual mind games, and view private engine hints.

## Positioning

Unlike standard chess sites (which disallow rule tampering) or obvious novelty gag apps (which give the prank away on arrival), the interface reads and behaves identically to a serious, modern chess playing room for normal players and guests, while authorized accounts unlock a concealed operator toolset that directly mutates live multiplayer state.

## Operating Context

- Players share a short room link (`?room=CODE`) or join with a 6-character code across separate browsers and devices.
- Games support standard chess rules, time controls (Bullet, Blitz, Rapid, Classical, Untimed), move history notation, captured material tracking, resignation, draw offers, and optional local practice against an AI bot.
- No account is required to play; optional sign-up/sign-in lives quietly in the top navigation so friends aren't forced through onboarding friction.
- First-time Owner claim secures ownership (via `OWNER_CLAIM_CODE` env var if configured, or first-claim setup before public sharing) so the Owner can manage accounts and assign permanent or expiring troll grants.
- To guests and non-authorized accounts, zero troll UI, hints, or references exist in the visible interface.

## Capabilities and Constraints

- **Must deploy cleanly on Netlify free tier** with zero paid external servers or mandatory paid databases.
- **Online multiplayer across devices** using WebRTC P2P (PeerJS) for zero-credit gameplay traffic, with automatic fallback relay so connections succeed reliably.
- **Optional account system:** Guests enter an optional display name and play right away; registered accounts authenticate securely (salted scrypt hashes + HMAC-signed HTTP-only session cookies).
- **Owner-controlled troll permissions:** Owner account has permanent access and an Owner Console to search accounts, grant permanent troll access, grant temporary timed troll access (minutes/hours/days), or revoke access immediately.
- **Comprehensive troll menu (authorized accounts only):** Concealed trigger (secret keybind `Ctrl+Shift+T` / `Cmd+Shift+T`, subtle multi-click trigger, and panic-hide `Esc`), covering rule breakers (double move, anywhere teleport, steal opponent piece, pawn promotion/transform, resurrect capture, force undo opponent move), clock/turn rigging (time steal, freeze own clock, skip turn, cut opponent time), mind games (disguise piece on opponent screen, flip/spin opponent board, fake reconnecting banner, slippery hover nudge, fake last-move highlight), and private client-side engine best-move hints & evaluation bar.
- **Design direction noted by user:** Sleek modern tournament studio (dark slate, crisp board, clean typography).

## Product Principles

- **Cover identity first:** Every shared screen, lobby, clock, and chess interaction must feel genuinely competitive and polished so friends never suspect a hidden mode exists.
- **Zero-friction play:** Creating a room, copying a link, and starting a match takes seconds with no mandatory registration wall.
- **Server-verified authority, client-invisible concealment:** Troll capability and expiry are verified through the account session; unauthorized clients never render troll controls or leak troll state.
- **Panic-safe stealth:** Authorized players can toggle or dismiss all overlays and secret engine graphics in one keystroke.

## Accessibility & Inclusion

- Full keyboard navigation for board squares, lobby controls, and dialogs; visible focus indicators; `prefers-reduced-motion` honored cleanly across move animations and troll effects (while keeping gameplay legible).
