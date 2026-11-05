# Grave Geometry

**GRAVE GEOMETRY** — *One map. No last wave.*

Isometric endless zombie shooter (Phaser 3 + TypeScript + Vite). Simulation logic stays Phaser-free under `src/core` and `src/game`; rendering lives under `src/render`.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. The canvas uses design resolution **640×360**, integer-scaled with crisp pixels.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Vitest unit tests |
| `npm run selftest -- --phase=N` | Phase gate (typecheck, lint, tests, build, smoke) |
| `npm run lint:branding` | Title/tagline and retired-name check |

## Controls

Gameplay controls are added in later phases. See `plan.md`.

## Art swap (later phases)

Set `VITE_USE_PLACEHOLDERS=false` and drop atlases under `public/assets/`. All sprites load through `src/render/spriteFactory.ts`.

## Debug

Append `?debug=1` to the URL once the debug overlay exists (Phase 2+).
