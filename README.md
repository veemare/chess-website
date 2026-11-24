# Vesper64

Online multiplayer chess arena designed for free Netlify hosting, featuring optional accounts, Owner-managed permanent or temporary troll privileges, and a concealed Operator Console.

## Features

- **Zero-signup multiplayer:** Share a `?room=CODE` link to connect directly across devices via WebRTC (`PeerJS`) with local cross-tab `BroadcastChannel` and automatic Netlify Function + Netlify Blobs relay fallback.
- **Optional accounts & Owner role:** Guests play immediately with no account. Players who want an account can register optionally. The first account to claim ownership (or configured via Netlify environment variables) becomes the permanent **Owner**.
- **Permanent & temporary troll grants:** From the **Owner Console** inside the Account dialog, the Owner can grant specific accounts **Permanent** or **Temporary** (custom minutes / 1h / 24h) troll access or revoke it immediately.
- **Concealed Operator Console (`Ctrl+Shift+T` / triple-click logo):** Completely invisible to guests and ungranted users. Includes rule breakers (Double Move, Teleport, Mind Control Steal, Transform, Resurrect, Veto Last Move), clock/turn rigging (Steal Time, Halve Opponent Time, Freeze My Clock, Skip Turn), opponent mind games (Phantom Pawn Disguise, Forced Board Flip, Fake Reconnect Lag, Butterfingers Hover, Gaslight Highlight), and a private client-side Arbiter AI evaluation & best-move arrow (`Esc` panic-hides everything immediately).

## Local Development

```bash
npm install
npm run dev
```

Local dev uses Vite's built-in `/api/*` middleware backed by `.data/vesper64-store.json`.

## Free Netlify Deployment

1. Push this repository to GitHub/GitLab/Bitbucket and import it into **Netlify** (Free plan).
2. Build settings are pre-configured in `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
3. Optional Netlify Environment Variables (Site settings -> Environment variables):
   - `OWNER_CLAIM_CODE`: Recommended secret passphrase required when claiming the Owner account on first deploy.
   - `OWNER_USERNAME` & `OWNER_PASSWORD`: Optional pre-seeded Owner account created automatically on boot.
   - `AUTH_SECRET`: Optional HMAC session signing secret (auto-generated and persisted in Netlify Blobs if omitted).
4. Once deployed, open your site, click your name in the top-right, claim your **Owner** account, and share `?room=...` links with friends.
