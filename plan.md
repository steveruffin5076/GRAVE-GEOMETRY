# PLAN.md — "GRAVE GEOMETRY" — Isometric Endless Zombie Shooter

> **Execution plan for Cursor AI.** Work top-to-bottom, one phase at a time, and do not start a phase until the previous phase's acceptance criteria pass. Every task is written as an implementable instruction. Do not invent mechanics that are not in this document; if something is genuinely missing, add it to §19 "Open decisions" instead of guessing.
>
> Version 1.0 · 2026-11-03 · Status: ready to build

---

## 0. How to use this document (Cursor instructions)

1. Create `.cursorrules` from §4.1 **first**. It is the behavioural contract for every later edit.
2. **Chain all phases autonomously.** Implement **Phase by phase** (§16) in ONE continuous run. For each phase: implement → **self-test first** (§15.1) → fix until green → log + commit → **immediately start the next phase**. Do not stop between phases, do not ask the user for confirmation, do not call `ask_user`, and do not end the turn with "shall I continue?". Full loop in §16.0.
3. **Never** put gameplay rules inside Phaser `Scene` rendering code. Pure logic lives in `src/core/` and `src/game/` as plain TypeScript with no Phaser imports. Rendering reads state; it does not own it. This keeps the iso projection, wave maths and upgrade rolls unit-testable and makes the art-swap in Phase 12 a drop-in.
4. **Never** hard-code a magic number twice. All tunables live in `src/config/balance.ts` or `src/config/constants.ts`.
5. **Never** use a network call, CDN, external font, or external image. The game must run offline from `dist/` served by any static host.
6. When a spec says "placeholder", draw it with Phaser Graphics primitives at the **exact** dimensions and pivot of the final asset (§8). Placeholders are a contract, not a sketch.
7. **Self-test first, every phase.** Run `npm run selftest -- --phase=N` (§15.1) after implementing phase N and **before** writing a single line of phase N+1. A phase is NOT done while the gate is red; never skip a gate to "save time".
8. Keep a `CHANGELOG.md` with one line per phase, plus `selftest/phase-NN.log` per phase recording every command and exit code.
9. **Never ask the user.** No `ask_user`, no "shall I continue?", no pausing for review, no presenting a phase for approval. The only user-facing output during the chain is optional per-phase `PASS` progress lines and the final completion report (or a `BLOCKED.md` status report if a gate cannot be fixed).

**Out of scope for v1:** multiplayer, backend/accounts, meta-progression between runs, level editor, achievements, ads/monetisation, story/cutscenes, procedural map generation, 3D, pathfinding/navmesh.

---

## 1. Locked decisions

| Decision | Value | Source |
|---|---|---|
| Title | **GRAVE GEOMETRY** — tagline "One map. No last wave." (§1.4) | User decision |
| Projection | **True isometric, 2:1 diamond tiles** (`TILE_W=64`, `TILE_H=32`) | User answer |
| Camera | Fixed orthographic iso, follows player, no rotation, zoom = 1× design | Derived |
| Engine | **Phaser 3 (latest v3.90+) + TypeScript + Vite** | Recommendation accepted |
| Language/tooling | TypeScript strict, Vitest, ESLint + Prettier | Derived |
| Art pipeline | Playable code-drawn placeholders first; exact sprite-sheet/atlas contract for later swap | User answer |
| Art style | Top-down **isometric** tile-based pixel art, one locked art bible | User's art prompt, adapted |
| Map | **Exactly one** fixed hand-authored map (ASCII layout in `src/data/map.ts`) | User brief |
| Waves | Endless, single continuous run, escalating zombie count + stats | User brief |
| Level-ups | Endless; every level offers **exactly 3** upgrade options | User brief |
| Upgrade categories | New weapon, new ammo type, attachment, grenade, skill | User brief |
| Starting loadout | Pistol only, FMJ ammo, no attachments, 0 grenades, no skills | User brief |
| Input | Keyboard+mouse, gamepad, and touch virtual joysticks (desktop + mobile) | User answer |
| Firing | **Persisted toggle**: `auto` (default on touch) / `manual` (default on desktop) | User answer |
| Persistence | `localStorage`: settings + personal-best run stats. Run state is **not** saved; every death = fresh run | Assumption §1.1 |
| Zombie variants | Walker, Runner, Splitter, Acid Spitter, Boomer, Charger, Jumper, Tank (§9.8) | User brief, interpreted |
| Target | Modern desktop Chrome/Firefox/Edge/Safari + mobile Safari/Chrome (iOS 16+, Android 10+) | Assumption |

### 1.1 Assumptions stated BEFORE proposing assets (required by the art brief)

- **Target platform:** desktop and mobile web browsers, landscape-first; portrait is supported with a reflowed HUD, not a cropped landscape view. No native wrappers.
- **Camera:** single fixed 2:1 isometric orthographic projection, integer zoom, never rotates or tilts.
- **Genre / mechanics:** single-player top-down-ish arena "survivor" shooter; free movement in grid XY space, mouse/aim-stick directed fire, endless waves, in-run level-ups.
- **Setting:** original near-future abandoned industrial yard / suburban intersection. **No farming or fantasy motifs, no copied characters, logos or compositions from existing games.**
- **Display size:** design resolution 640×360 (16:9), integer-scaled to the window; on phones the design resolution adapts (§6.5). All readability judgements are made at 1× and at the actual scaled display size.
- **Session:** one run is one arena session, typically 5–25 minutes; no save/resume mid-run.

### 1.2 Why Phaser 3 (answer to "nice graphics + easy pixel art")

`pixelArt: true` in the Phaser game config disables texture filtering, rounds sprite positions and enables crisp integer scaling — the three things that make pixel art look correct instead of mushy. On top of that it gives: texture atlases + frame-based animation (§8 contracts map 1:1), sprite tinting for hit-flash and elite variants, additive blend modes for muzzle flash and tracers, a particle emitter with pooling, camera follow/zoom/shake, arcade physics and timers, and WebGL batching that handles 400+ on-screen sprites cheaply. PixiJS is a stronger raw renderer but requires writing the entity loop, input, collision and animation state machine from scratch; plain Canvas 2D requires hand-rolling depth sort, atlases and particles. Phaser is the best "nice graphics / low build risk" trade-off, and because all rules live in pure TS modules, swapping the renderer later is a contained change.

### 1.3 Changes made to the supplied art-direction prompt

The supplied prompt locks **oblique top-down** (rectangular floor tiles, front-facing elevations). The game brief locks **isometric**. These are incompatible, so the art brief is rewritten, not mixed:

| Supplied prompt | This plan (§7) |
|---|---|
| Rectangular/oblique floor tiles | **Diamond floor planes, 64×32, 2:1** |
| Front-facing elevations | **Two visible faces**: left face and right face of a diamond prism, each with an 8 px vertical riser |
| Upright characters on a square grid | Upright 2.5D billboards anchored at the **bottom-centre of a diamond**, 8 facings mapped to iso diagonals |
| "Steps, shadows and overlap" | Same principles, expressed as diamond-height risers, flattened diamond shadows and painter's-order occlusion |
| Top-down occlusion rules | Depth key `d = (x + y) / 4`, elevation affects `screenY` only, never collision boundaries |
| Tile dims / wall thickness / pixel density | Explicitly locked in §6.2 and §7.2 |
| "Allow movement rules to remain unchanged" | **Preserved**: simulation is plain top-down XY grid space; the iso transform is applied only at render time (§6.1) |

Everything else from the prompt — compact art bible, locked palette, silhouette/proportion rules, material examples, lighting hierarchy, UI/icon rules, motion guidelines, mistakes to avoid, measurable asset specs, readability and accessibility, original designs, consistency across batches — is kept and made measurable.

### 1.4 Game title & naming rules (LOCKED)

| Field | Value |
|---|---|
| Title | **GRAVE GEOMETRY** |
| Stylisation | `GRAVE GEOMETRY` (all caps, 1 px tracking) in the wordmark/logo; `Grave Geometry` in prose, docs and store copy |
| Tagline | **"One map. No last wave."** |
| Slug / package name | `grave-geometry` |
| Storage prefix | `gravegeometry.v1.*` (§14) |
| Debug global | `window.__GRAVE_GEOMETRY__` (§13) |

**Why this name:** "geometry" points at the 2:1 isometric diamond grid that defines the game's look, "grave" at the endless undead. The compound is arbitrary, original and evocative rather than descriptive of the genre; it reads as a small question ("why geometry?") that the first screenshot answers immediately. It also satisfies §7.9 rule 12 — no borrowed characters, logos, titles or franchise wordplay.

**Single source of truth:** `src/data/strings.ts` exports `GAME_TITLE = 'GRAVE GEOMETRY'` and `GAME_TAGLINE = 'One map. No last wave.'`. Every screen imports these constants; no screen hard-codes the title. Only the wordmark bitmap asset (§8.2) is drawn by hand. `npm run lint:branding` asserts that `src/`, `index.html`, `public/` and `dist/` contain no occurrence of the retired working title and that the two constants exist; the historical mentions below and in `CHANGELOG.md` are excluded from that check.

**Where the title must appear:** `index.html` `<title>`, `package.json` `name`, README, MENU screen (§5.1), loading screen (§7.10), promo key art (§7.10), game-over header, and the `?debug=1` overlay. Always write `Grave Geometry` in prose. Never re-letter or rebrand per screen, asset or batch (§7).

**Do not use:** the retired working title `LAST TILE`; any "…of the Dead" franchise pun; or any `Last Wave` / `One More Wave` / `Zombie Wave` name. A preliminary screen on 2026-11-03 found existing games in those spaces — a browser puzzle called *Last Tile Standing*, plus *Last Wave* (an Android zombie survival game with near-identical level-up mechanics), *The Zombie Wave* on Steam and *Another Wave of Zombies* on itch.io.

**Clearance status (screen only, not legal advice):** an exact-phrase web/store screen on 2026-11-03 found no game or trademark listing for `GRAVE GEOMETRY`. Before any public/commercial release, complete:
1. USPTO TESS knockout + WIPO Global Brand DB, EUIPO and **MyIPO** (Malaysia) for the exact phrase and near variants, in the classes covering downloadable game software and entertainment services.
2. Steam, itch.io, Google Play and App Store title search.
3. Domain + social handle availability.
4. Timestamp first use in commerce; consider an intent-to-use application during development.

Short titles are **not copyrightable** — trademark is the relevant protection. The original wordmark *artwork* is copyrightable, so design the logo from scratch (§7.10) and never copy an existing one.

---

## 2. Scope summary

One screen, one map, one run. The player spawns at the centre of an abandoned yard with a pistol. Zombies spawn continuously just outside the camera view and path directly toward the player (no navmesh; steering + obstacle sliding). Kills drop XP shards; the player collects them by proximity. Filling the XP bar pauses combat and shows 3 upgrade cards; pick one with `1`/`2`/`3` or a tap. Difficulty rises with elapsed time; there is no win state, only a death screen with run stats and a restart button. Level count and upgrade ranks have **no hard cap**.

---

## 3. Repository layout

```
/
├── index.html                    # single canvas mount + inline CSS (no external assets)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .cursorrules                  # §4.1
├── CHANGELOG.md
├── scripts/
│   └── selftest.mjs             # §15.1 automated self-test gate runner
├── selftest/
│   └── phase-NN.log             # one machine-readable log per phase
├── BLOCKED.md                    # created ONLY if a phase fails 5 attempts
├── README.md                     # controls, how to run, how to swap art
├── public/
│   └── assets/                   # final pixel-art sheets land here (Phase 12)
│       ├── atlases/              # *.png + *.json (Phaser atlas hash/array format)
│       ├── ui/ fonts/ fx/ tiles/ characters/
│       └── README.md             # asset manifest, generated from §8
├── src/
│   ├── main.ts                   # Phaser.Game bootstrap only
│   ├── config/
│   │   ├── constants.ts          # TILE_W, TILE_H, design res, depths, layers
│   │   ├── balance.ts            # ALL gameplay tunables, grouped by system
│   │   └── palette.ts            # locked hex ramp, single source of truth
│   ├── core/                     # pure, no Phaser imports
│   │   ├── math/vec2.ts
│   │   ├── math/iso.ts           # worldToScreen, screenToWorld, depthOf
│   │   ├── math/rng.ts           # seeded mulberry32, pick/weightedPick/shuffle
│   │   ├── spatialHash.ts
│   │   ├── objectPool.ts
│   │   ├── eventBus.ts
│   │   └── fixedStep.ts
│   ├── game/                     # pure simulation, no Phaser imports
│   │   ├── state.ts              # RunState type + createRunState
│   │   ├── simulation.ts         # step(state, input, dt): the whole game tick
│   │   ├── player.ts
│   │   ├── weapons.ts            # weapon definitions + firing/reload
│   │   ├── ammo.ts               # ammo modifiers, status effects
│   │   ├── attachments.ts
│   │   ├── grenades.ts
│   │   ├── skills.ts
│   │   ├── upgrades.ts           # pool, eligibility, roll3, apply
│   │   ├── bullets.ts            # segment-sweep raycast, pierce, on-hit
│   │   ├── zombies/
│   │   │   ├── types.ts          # variant definitions table
│   │   │   ├── behaviors.ts      # per-variant state machines
│   │   │   └── spawnDirector.ts  # wave budget, gating, elite affixes
│   │   ├── collision.ts
│   │   ├── damage.ts             # damage pipeline, i-frames, knockback, DoT
│   │   ├── xp.ts                 # xp curve, shards, level-up events
│   │   ├── map.ts                # ASCII layout → tile grid + obstacle bodies
│   │   └── stats.ts              # derived stats recomputed from upgrade ranks
│   ├── input/
│   │   ├── intent.ts             # InputIntent interface, shared by all sources
│   │   ├── keyboardMouse.ts
│   │   ├── gamepad.ts
│   │   ├── touch.ts              # left move stick, right aim/fire stick
│   │   └── inputManager.ts       # merges sources + applies auto/manual fire mode
│   ├── render/
│   │   ├── GameScene.ts          # Phaser.Scene: reads state, draws everything
│   │   ├── spriteFactory.ts      # THE placeholder/real-asset switch (§8.5)
│   │   ├── depthSorter.ts
│   │   ├── tileRenderer.ts
│   │   ├── entityRenderer.ts
│   │   ├── fxRenderer.ts         # tracers, particles, decals, damage numbers
│   │   ├── lighting.ts           # ambient tint, light pools, night gradient
│   │   └── placeholderArt.ts     # Graphics-drawn shapes at exact asset bounds
│   ├── ui/
│   │   ├── Hud.ts                # DOM overlay (crisp text, responsive, a11y)
│   │   ├── UpgradeModal.ts
│   │   ├── SettingsPanel.ts
│   │   ├── PauseOverlay.ts
│   │   ├── GameOverScreen.ts
│   │   └── styles.css            # inline-safe, system-font fallback + bitmap font
│   ├── audio/
│   │   ├── sfx.ts                # WebAudio-synthesised placeholder SFX
│   │   └── music.ts              # optional ambient loop, muted by default
│   ├── data/
│   │   ├── map.ts                # the ONE map, 64×64 ASCII
│   │   └── strings.ts            # all copy + GAME_TITLE / GAME_TAGLINE (§1.4)
│   └── persistence/
│       └── storage.ts            # typed localStorage wrapper, versioned
└── tests/
    ├── iso.test.ts  rng.test.ts  upgrades.test.ts  xp.test.ts
    ├── waveDirector.test.ts  damage.test.ts  collision.test.ts  stats.test.ts
    ├── phaseGates.test.ts     # §15.1 executable acceptance criteria, keyed by PHASE
    └── sim.test.ts            # headless long-run simulation (used by gates 5-12)
```

---

## 4. Engineering conventions

### 4.1 `.cursorrules` (create this file verbatim first)

```text
You are implementing "GRAVE GEOMETRY" from PLAN.md. Read PLAN.md before every change.

STACK: Phaser 3 + TypeScript (strict) + Vite. No other runtime deps. No CDN, no network calls.
ARCHITECTURE: src/core and src/game are PURE TypeScript with ZERO Phaser imports.
  Phaser is only allowed in src/render, src/main.ts and src/audio. Simulation state is
  owned by src/game/state.ts; the Scene renders a snapshot and never mutates gameplay rules.
PROJECTION: true 2:1 isometric. Simulation uses plain top-down XY grid space.
  Iso transform is applied ONLY at render time via src/core/math/iso.ts.
ART: pixel art, nearest-neighbour, integer positions (Math.round), no anti-aliasing,
  no gradients in world art, palette ONLY from src/config/palette.ts.
  Placeholder art must use the exact dimensions and pivots in PLAN.md §8.
CONSTANTS: every tunable number goes in src/config/balance.ts or constants.ts.
  Never duplicate a magic number. Never hard-code a colour outside palette.ts.
ENDLESS: level count, wave count and repeatable upgrade ranks have NO hard cap.
  No arrays sized by level/wave. Use compact number formatting in UI.
INPUT: all sources produce the same InputIntent. Auto-fire/manual-fire is a persisted setting.
PERFORMANCE: pool bullets, zombies, particles, XP shards and damage numbers.
  Spatial hash for collision. Cull off-camera entities. Cap concurrent zombies per platform.
WORKFLOW (AUTONOMOUS PHASE CHAIN — NO USER INTERACTION):
  Implement phases 0..12 of PLAN.md §16 IN ORDER, in ONE continuous run.
  For each phase N:
    1. Implement exactly the tasks of phase N.
    2. SELF-TEST FIRST: run `npm run selftest -- --phase=N` (PLAN.md §15.1).
       It runs typecheck, lint, the full unit suite, the phase-N acceptance gate,
       the build, and a headless smoke check of dist/. Never skip it.
    3. Read the failure output YOURSELF. If anything failed, diagnose and FIX it
       yourself, then re-run the gate. Repeat up to 5 attempts. Never ask the
       user how to fix it and never hand the decision back to the user.
    4. When green: append PASS to CHANGELOG.md and selftest/phase-NN.log,
       commit as `phase-NN: <name> [selftest PASS]`, then IMMEDIATELY begin
       phase N+1. Do not pause, do not request approval, do not ask questions,
       do not end the turn between phases.
    5. Stop the chain ONLY when phase 12 is green, or when a phase is still red
       after 5 attempts: write BLOCKED.md with the exact command, error, files
       touched and attempts made, then report status. Still do not ask a question.
  Never proceed to the next phase on a red gate. Never invent a "waiting for
  user" step. Do not start the next phase early (before the gate is green).
TESTS: pure logic gets Vitest unit tests. Do not test rendering; test the maths instead.
STYLE: prefer small pure functions, explicit types, no `any`, no classes for data,
  no comments that restate code. Do not refactor unrelated files.
```

### 4.2 Code style

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `verbatimModuleSyntax: true`.
- Data = plain objects + discriminated unions; behaviours = pure functions over `RunState`.
- Randomness always via `src/core/math/rng.ts` (seeded; record seed in run stats for reproducible bug reports). Never `Math.random()`.
- Time in **seconds**, distances in **grid units** (64 units = 1 tile on each world axis), angles in radians internally, degrees only in config.
- Fixed simulation step `1/60 s` with accumulator, max 5 substeps per frame, `dt` clamped to 0.1 s. Rendering interpolates optionally but must round to whole pixels.
- All user-facing strings from `src/data/strings.ts`.
- Events (`eventBus`) are for presentation only (play SFX, spawn particles); gameplay never depends on an event listener to be correct.

### 4.3 Dependencies

```jsonc
// package.json (runtime + dev)
"name": "grave-geometry",
"dependencies": { "phaser": "^3.90.0" },
"devDependencies": {
  "typescript": "^5.7.0", "vite": "^6.0.0", "vitest": "^2.1.0",
  "eslint": "^9.0.0", "prettier": "^3.4.0"
}
// scripts: dev, build, preview, typecheck, test, test:watch, lint,
//          lint:palette, lint:branding, format, selftest (node scripts/selftest.mjs)
```

Phaser game config: `type: AUTO`, `pixelArt: true`, `roundPixels: true`, `antialias: false`, `backgroundColor` from palette, `scale: { mode: Phaser.Scale.RESIZE, autoCenter: CENTER_BOTH }`, `render: { pixelArt: true, powerPreference: 'high-performance' }`, `dom: { createContainer: true }` for the HUD overlay.

---

## 5. Core architecture

### 5.1 State machine

`BOOT → MENU → PLAYING ⇄ LEVEL_UP / PAUSED → GAME_OVER → PLAYING (new run)`.

- `MENU` displays the single `GRAVE GEOMETRY` wordmark + tagline (§1.4, §11 branding) with START / HOW TO PLAY / SETTINGS; no other screen may restyle it.
- `LEVEL_UP` and `PAUSED` freeze the simulation clock (no spawning, no cooldowns, no DoT ticks).
- `LEVEL_UP` is entered from the `xp.levelUp` event emitted inside `simulation.step`; the modal is UI-only and calls `applyUpgrade(state, optionId)` then resumes.
- Multiple level-ups queued in one frame (large shard pickups) are resolved as a **queue**, one modal at a time.

### 5.2 `RunState` (single source of truth)

```ts
interface RunState {
  seed: number; rng: RngState;
  time: number; wave: number; level: number; xp: number; xpNext: number;
  kills: number; score: number;
  player: PlayerState;
  weapon: WeaponInstance;          // active weapon + loaded ammo + attachments
  owned: { weapons: string[]; ammo: string[]; attachments: string[];
           grenades: string[]; skills: string[] };
  ranks: Record<string, number>;  // upgradeId -> rank (unbounded number)
  grenade: { id: string; charges: number; cooldown: number };
  zombies: Zombie[];              // pooled
  bullets: Bullet[];              // pooled
  shards: XpShard[];              // pooled
  hazards: Hazard[];              // acid pools, fire, cryo fields (pooled)
  grenadeProjectiles: Grenade[];  // pooled
  effects: StatusEffect[];        // burn / slow / shock / bleed
  spawn: SpawnState;
  pendingLevelUps: number;
  stats: DerivedStats;            // recomputed on every upgrade apply
  runStats: { damageDealt, damageTaken, killsByVariant, levelsGained, bestCombo, timeSurvived };
}
```

`DerivedStats` is **recomputed from scratch** on every upgrade (`recomputeStats(state)`), never incremented in place. This prevents order-dependent drift over hundreds of levels and makes stacking rules trivially testable.

### 5.3 Tick order (must be deterministic)

```
1. input → intent (already resolved outside sim)
2. spawnDirector.update(dt) → spawn requests
3. player.update (move, dash, i-frames, regen, magnet)
4. weapon.update (fire per mode, reload, spread recovery)
5. bullets.update (segment sweep → hit list → damage pipeline)
6. grenades/hazards.update (fuses, AoE, DoT ticks)
7. zombies.update (per-variant behavior FSM, steering, contact damage)
8. collision.resolve (entity vs obstacle, entity vs entity soft separation)
9. shards.update (attraction, pickup, xp, level-up events)
10. cull dead entities → return to pools; emit presentation events
11. wave/time counters
```

### 5.4 Systems

- **ObjectPool<T>** — preallocate per entity kind at the platform cap (§13); `acquire/reset/release`, never `new` inside the tick.
- **SpatialHash** — cell size 64 grid units; rebuilt each tick for zombies + obstacles; used for bullet sweeps, AoE queries, soft separation and shard pickup radius.
- **EventBus** — typed events: `shot`, `hit`, `kill`, `explosion`, `levelUp`, `playerHurt`, `pickup`, `waveStart`, `upgradeApplied`, `gameOver`.
- **FixedStep** — accumulator with the 5-substep clamp; on tab blur, pause the run automatically.

---

## 6. Isometric spatial system (LOCKED)

### 6.1 Two coordinate spaces — the key rule

**Simulation space** is a plain top-down square grid (`x`, `y` in grid units), exactly as a top-down game would use. Movement, collision, ranges and AI all live here and are unaffected by the camera. **Screen space** is computed only when drawing:

```
// constants: TILE_W = 64, TILE_H = 32
worldToScreen(x, y, z = 0):  sx = (x - y) * 0.5
                             sy = (x + y) * 0.25 - z
screenToWorld(sx, sy):       x =  sx + 2 * sy
                             y = -sx + 2 * sy
depthOf(x, y):               d = (x + y) * 0.25        // sort ascending, back → front
```

Proof of the diamond: +64 on `x` → `(+32, +16)`; +64 on `y` → `(−32, +16)`. Every test in `tests/iso.test.ts` must assert these and the round-trip `screenToWorld(worldToScreen(p)) ≈ p`.

Height `z` **only** moves a sprite up on screen; it never changes `depthOf`. This is what keeps occlusion stable for tall props and jumpers.

### 6.2 Locked dimensions

| Element | Value | Note |
|---|---|---|
| Diamond floor tile | `64 × 32` px | 2:1, sharp corners, no anti-aliasing |
| Tile elevation riser (visible side faces) | `8` px | Always exactly 8, never 6 or 10 |
| Wall thickness | `8` px riser + `16` px cap | Two faces drawn: left `(−32,+16,+8)`, right `(+32,+16,+8)` |
| Step / kerb height | `4` px | Multiple of the 8 px riser; never arbitrary |
| Design resolution | `640 × 360` | 16:9; integer scale ×1/×2/×3 |
| Player billboard | `20 × 28` px | pivot `(10, 26)` = feet centre |
| Standard zombie billboard | `20 × 28` px | same cell as player |
| Tank billboard | `40 × 48` px | pivot `(20, 44)`, still one diamond footprint |
| Character cell in sheet | `24 × 32` px | all characters share the cell + pivot |
| Shadow | flattened diamond `20 × 10`, offset `(+4, +2)` | 40% black, drawn at `depth − 0.01` |
| Bullet / tracer | `2 × 2` px head, 1 px trail | never a thick beam |
| Obstacle footprint | 1 or 2 diamonds | collision uses the footprint, **never** the visible faces |

**Occlusion rules** (painter's algorithm, no z-buffer):
1. Sort all drawables by `depthOf(x, y)` ascending; stable tie-break by `entity.id`.
2. Ground tiles are drawn once into a static layer, back to front, before any entity.
3. Shadows draw before their owner at `depth − 0.01`.
4. An entity standing *behind* a tall prop is occluded naturally because the prop's footprint depth is greater; a sprite overlapping a wall must not "float" — clamp its `sy` to the prop's cap line when within the footprint.
5. Flying/jumping entities get `z > 0` and keep their ground depth; their shadow stays at `z = 0`.
6. **Never** derive a collision boundary from a rendered elevation face. Colliders are circles/AABBs in XY grid space defined in `map.ts`.

### 6.3 The one map

`src/data/map.ts` holds a single `64 × 64` ASCII layout, hand-authored (fixed seed, identical every run). Legend:

```
.  asphalt floor        c  concrete floor       g  grimy grass/moss
#  solid wall (2-tile height)                  b  low barricade (8px riser, passable by bullets, blocks movement)
C  crashed car (2×1 footprint)                T  rusted container (2×2, tall, occludes)
p  puddle (visual only, slows 8%)             l  light pool (streetlamp)
s  spawn marker (ring outside map, handled by director, not in ASCII)
P  player spawn (centre)
```

Requirements: a central open kill-zone (≥ 12×12 tiles clear), 4 approach lanes, 6–8 tall props for cover/occlusion, 10–14 low barricades, a 2-tile impassable perimeter wall with 4 capped corner towers, and 4 streetlamp light pools. The map is **never** regenerated; "endless" refers to waves and levels only. Provide `MAP_WIDTH`, `MAP_HEIGHT`, `parseMap(): TileGrid`, `obstacles: Obstacle[]`, `playerSpawn: Vec2`.

### 6.4 Depth layers (Phaser)

| Layer | Depth | Content |
|---|---|---|
| `GROUND` | 0 | static diamond tiles (batched into a RenderTexture where possible) |
| `DECAL` | 10 | blood, acid scorch, shadows (below entities) |
| `ENTITIES` | 20 | zombies, player, props (sorted by `depthOf`) |
| `PROJECTILES` | 30 | bullets, grenades, acid globs |
| `FX` | 40 | muzzle flash, explosions, damage numbers |
| `LIGHTING` | 50 | multiply/screen night overlay, light pools |
| `WORLD_UI` | 60 | health bars over tanks, telegraph markers |

### 6.5 Responsive / pixel-perfect scaling

```
scale = max(1, floor(min(windowW / 640, windowH / 360)))
designW = floor(windowW / scale); designH = floor(windowH / scale)
```
On portrait phones, `designW < designH` → switch HUD to portrait layout (§11.5) and reduce camera view by 15% (zoom 1.15) so the player still sees threats. Canvas CSS: `image-rendering: pixelated; image-rendering: crisp-edges;`. All sprite positions are `Math.round`ed. The HUD is a DOM overlay positioned in CSS pixels (so text stays crisp and accessible), not drawn into the low-res canvas.

---

## 7. ART BIBLE v1.0 — "GRAVE GEOMETRY"

**Global visual language:** original, top-down **isometric tile-based pixel art**, applied identically to characters, environment, props, items, UI, icons, VFX, animation, loading screen and promotional art. One palette, one pixel density, one spatial grammar, every batch. No style redesign per asset.

### 7.1 Assumptions

Stated in §1.1. Restated for asset production: desktop + mobile browser, fixed 2:1 iso orthographic camera, endless arena shooter, original near-future industrial/suburban setting, 640×360 design resolution.

### 7.2 Spatial grammar (locked)

Diamond floor planes `64×32`; visible left/right elevation faces with an 8 px riser; upright 2.5D billboard characters anchored at diamond bottom-centre; 8 facings mapped to iso diagonals (`E=(+1,0)` renders down-right, `S=(0,+1)` renders down-left, etc.); walls 8 px riser + 16 px cap; steps 4 px; flattened diamond shadows at `(+4,+2)`; painter's-order occlusion by `(x+y)/4`; traversable surfaces are always the *top* diamond, never the side faces; height is communicated only by riser + shadow + overlap. Collision boundaries come from XY footprints, never from the drawing. Pixel density is 1 design pixel = 1 art pixel at 1× zoom.

### 7.3 Locked palette — 32 colours, `src/config/palette.ts`

All art uses **only** these hexes. Each material has a 3–4 step ramp: `shadow → base → light → highlight`. Outlines are `#0d0f14` or the material's darkest step. No gradients, no anti-aliasing, no alpha-soft edges (except VFX particles).

| Group | Ramp (dark → light) | Use |
|---|---|---|
| Ink | `#0d0f14`, `#1b2130`, `#2a3345` | outlines, UI base, shadows |
| Asphalt | `#232a36`, `#313a49`, `#414d5f` | road tiles |
| Concrete | `#2b3242`, `#3c465a`, `#55637a`, `#74839b` | yard tiles, walls |
| Grime / moss | `#3a4a3f`, `#55705a`, `#7d9a70` | overgrowth, puddles |
| Rust / metal | `#4a2f28`, `#7a4b34`, `#a9713f`, `#d0a06a` | cars, containers, props |
| Hazard | `#8a6b2f`, `#d8b34a`, `#f2dd8c` | barricades, interactive targets, XP highlights |
| Blood | `#5a1d24`, `#9b2f33`, `#d0524a` | damage, decals, boomer |
| Acid | `#2f5d3a`, `#6fbf4a`, `#b7f06a` | spitter, acid pools |
| Fire | `#a43b1e`, `#e8752b`, `#ffc65c` | incendiary, molotov |
| Zombie flesh | `#2c3a30`, `#46604a`, `#6b8460`, `#93a87a` | all zombie variants |
| Player accent | `#1f6f8b`, `#43b7c9`, `#9be8ef` | player, UI positive, tracers |
| XP violet | `#4a3a7a`, `#8467c9`, `#c9aef5` | XP shards, level-up |
| Cryo / shock | `#2b5d78`, `#5fa8c9`, `#b9e9f7` | cryo, EMP |
| UI neutral | `#121722`, `#1e2635`, `#e6edf5`, `#ffffff` | panels, text |
| Elite rim | `#e0a0d0`, `#f3d0ea` | elite affix glow only |

### 7.4 Silhouette & proportion rules

- Every character fits a `24×32` cell, pivot `(12, 28)`; player `20×28`, small zombies `20×28`, tank `40×48` (still one footprint).
- Head : torso : legs ≈ `1 : 1.2 : 1`. Upright, not perspective-projected. No foreshortening.
- **Each zombie must be identifiable by silhouette alone at 16 px, without colour**: Walker = hunched, arms forward; Runner = extreme forward lean, trailing leg; Splitter = wide asymmetric bulging shoulder; Acid Spitter = bulbous dorsal sac + extended head; Jumper = deep crouch, coiled legs; Charger = long forward shoulder plates / horns; Boomer = near-spherical, tiny legs; Tank = wide square slab, tiny head, heavy shoulders.
- Player is the only teal-accented, fully upright figure; weapon reads as a 6–8 px extension in the aim direction.
- **Threat is shape-coded first, colour-coded second** (colour-blind requirement): telegraphs use a distinct icon/shape per attack (§7.8), plus the accent colour.
- Interactive targets (XP shards, upgrade cards, buttons, grenade pickup) use hazard yellow + a 1 px bright outline; minimum hit area `24×24` design px (48×48 CSS px at ×2).

### 7.5 Material examples

| Material | Ramp | Rule |
|---|---|---|
| Asphalt tile | asphalt ramp | 2-tone dither only along cracks; 1 px `#0d0f14` seam on the diamond's lower two edges |
| Concrete wall | concrete ramp | left face = darkest step, right face = base step, top cap = light step; 1 px ink outline on all outer edges |
| Rusted container | rust ramp | vertical 2 px rib stripes in base step, top cap highlight, corner ink outline; footprint 2×2 diamonds |
| Streetlamp light | fire/hazard | additive radial **dithered** pool (no smooth gradient), 64×32 diamond, 20% opacity |
| Acid / blood decal | acid / blood | 8×8 irregular blob, flat 2-tone, no alpha falloff |
| Metal bullet | UI neutral | 2 px `#ffffff` head + 1 px `#43b7c9` trail |

### 7.6 Lighting hierarchy (priority order)

1. **Gameplay readability**: player, incoming threats, telegraphs and XP shards always highest contrast.
2. **Player / muzzle / explosion lights**: additive, dithered, 1–2 tile radius, never wash out outlines.
3. **Static light pools**: 4 streetlamps, dithered diamond, warm hazard ramp.
4. **Ambient**: cool ink multiply overlay at 12% at night; baseline evenly lit (no pitch-black corners).
5. **Decorative**: embers, dust motes — lowest priority, max 20 on screen, disabled on low-quality mode.

No real-time dynamic shadows beyond the locked flatten-diamond shadow. No normal maps, no bloom that erases 1 px outlines.

### 7.7 UI / icon rules

- UI is DOM/CSS at CSS-pixel resolution but uses the **same palette and same 1 px hard-edge language**: 2 px solid borders, 4 px square corners (or a 9-slice pixel frame), no rounded corners beyond 2 px, no drop-shadow blur, no gradients.
- Bundled bitmap font `5×7` for numbers/labels and `7×9` for body; fallback to a monospace system font at integer sizes. Minimum body text 10 design px (20 CSS px at ×2); minimum button label 12 design px.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for icons. All text gets a 1 px ink outline when over world art.
- Icons: `16×16` (HUD) and `24×24` (upgrade cards), 1 px ink outline, shape-first, drawn from the same ramps. Each upgrade category has a fixed glyph: weapon = gun silhouette, ammo = cartridge, attachment = bracket, grenade = sphere with pin, skill = chevron/star.
- Upgrade cards: 3 equal columns, `160×200` design px, distinct category glyph + accent stripe, rarity shown by border step (not by colour alone: 1/2/3 pips), keyboard number `1/2/3` always visible.
- HP bar red, ammo bar neutral, XP bar violet; always accompanied by a numeric value. Numeric values use compact formatting (`1.2k`, `3.4M`) above 9999 so endless levels never overflow the layout.

### 7.8 Motion guidelines

- Character sprites: **8 facings × 8 columns** (idle 1, walk 4, attack 2, hurt 1) at **8 fps**; death 6 frames at 12 fps; attack/hurt hold 2 frames.
- All positions snap to whole pixels. No subpixel tweening on world sprites. UI may tween in CSS px.
- Telegraph **≥ 0.4 s** before any attack dealing ≥ 15 damage: charger = ground arrow strip, jumper = darkening landing diamond, spitter = arcing dotted line, boomer = pulsing outline + swelling, tank slam = expanding ring. Each telegraph has a unique shape as well as colour.
- Hit feedback: 2-frame white flash, 1 px knockback, damage number rises 12 px over 0.6 s (pooled, max 30 concurrent).
- Screen shake ≤ 3 px, ≤ 0.18 s; reduced-motion setting disables shake and flash scaling.
- XP shards: 2-frame pulse, 3 px bob, magnet attraction with a visible trailing streak.
- Level-up: 0.25 s freeze + 1 px violet vignette pulse, then modal; no long cutscene.
- Particles: max 240 on desktop / 80 on mobile; all pooled; 1–3 px squares only.

### 7.9 Visual mistakes to avoid (explicit checklist)

1. Mixing square/oblique top-down tiles with 2:1 diamond tiles in the same scene.
2. Rotating or tilting the camera, or drawing perspective-projected characters instead of upright billboards.
3. Drawing a "3/4 view" wall with a single front face instead of two iso faces.
4. Using a visible elevation face as a collision boundary.
5. Anti-aliased / filtered / smoothed sprites, gradients, glow blurs in world art.
6. Subpixel sprite positions → shimmer.
7. Colour-only threat or rarity coding (fails colour-blind and small-screen readability).
8. Outlining every interior pixel (mud) or using no outline at all (silhouette loss).
9. Mixed pixel density between world, UI, icons and effects.
10. Oversized props or tanks that hide the player / incoming zombies.
11. Arbitrary riser heights (anything other than 4/8 px), contradictory step directions.
12. Farming / fantasy / medieval motifs, or copying a known game's characters, logos, UI or key art.
13. Per-asset style reinvention — one batch must look like every other batch.
14. Blood so dark it disappears on asphalt; acid so bright it reads as a pickup.
15. Unreadable 6 px text or < 24×24 design-px tap targets on mobile.

### 7.10 Loading screen & promo art

- Loading: `640×360`, ink background, single diamond grid receding, player silhouette centre, the **GRAVE GEOMETRY** wordmark (custom block letters from palette ramps) above it, the tagline `ONE MAP. NO LAST WAVE.` in the `5×7` bitmap font beneath it, hazard "LOADING" bitmap text, 3-step progress bar. No fake tips that mention other games.
- Promo key art: `1280×720` (exact ×2 of design res, same pixels doubled), player back-to-camera centre with the 8 zombie silhouettes arranged along two iso diagonals, one streetlamp light pool, the **GRAVE GEOMETRY** title in custom block letters drawn from palette ramps with the tagline beneath it. Original composition and wordmark; no borrowed characters, logos, lettering or titles.

---

## 8. Measurable asset specifications (the swap contract)

### 8.1 Global file rules

- Format: PNG-8/PNG-24 with alpha, **no interpolation**, transparent background `#00000000`.
- All colours must exist in `src/config/palette.ts`; CI check `npm run lint:palette` verifies every pixel against the 32-colour list.
- Texture filtering: `NEAREST`; Phaser config `pixelArt: true`, `roundPixels: true`; atlas JSON in Phaser **hash** format.
- Naming: `<kind>_<subject>_<variant>.png` — e.g. `char_zombie_tank.png`, `tile_floor_asphalt_01.png`, `ui_icon_ammo_ap.png`.
- Every sheet ships with a `<same-name>.json` atlas + a `pivot` field in `public/assets/README.md`.
- Pivots are `(0.5, 0.875)` of the character cell for all characters (feet at 28/32); tiles pivot `(0.5, 0.5)`; props pivot at their footprint's bottom-centre.

### 8.2 Asset table

| Asset | Sheet / cell | Frames | Pivot | Notes |
|---|---|---|---|---|
| Character (player + each zombie + spawnling) | `24×32` cell, `8 rows × 8 cols` = `192×256` | 8 facings × 8 anim cols | `(12,28)` | Tank overrides cell to `48×56`, pivot `(24,52)`, still 8 rows |
| Floor tiles (asphalt, concrete, moss, puddle) | `64×40` cell (32 tall diamond + 8 riser) | 4 variants each | `(32,16)` | diamond top occupies rows 0–31, riser rows 32–39 |
| Walls / barricades / containers / cars | `64×48` or `128×48` | 2–3 variants | footprint bottom-centre | two visible faces, 8 px riser |
| Props (lamp, crate, barrel, sign) | `32×40` | 1–2 | bottom-centre | must fit one diamond footprint |
| Weapons (muzzle states) | `16×16` | 4 (idle/flash/reload/empty) | `(4,10)` | drawn as a separate overlay on the player |
| Pickups / XP shards | `12×12` | 3 (pulse) | `(6,6)` | hazard/violet ramp, 1 px outline |
| Bullets / tracers / acid globs | `8×8` | 4 | `(4,4)` | 2 px head, 1 px trail |
| FX: explosion, blood, acid burst, muzzle, EMP | `32×32` | 8 | `(16,16)` | pooled, additive where specified |
| Decals | `8×8` | 4 variants | `(4,4)` | flat 2-tone |
| UI 9-slice panels | `16×16` | 1 | 4 px gutters | used by all overlays |
| UI icons | `16×16` + `24×24` | 1 per icon | `(0,0)` | category glyph + one per upgrade |
| Wordmark / logo | `320×48` | 1 | `(0,0)` | `GRAVE GEOMETRY` block letters + tagline (§1.4, §7.10); single asset used on every screen |
| Bitmap fonts | `5×7`, `7×9` | ASCII 32–126 | — | `.fnt` + PNG, or CSS monospace fallback |
| Loading screen | `640×360` | 1 | — | §7.10 |
| Promo art | `1280×720` | 1 | — | §7.10 |

### 8.3 Animation frame map (identical for every character)

| Col | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Use | idle | walk1 | walk2 | walk3 | walk4 | attack1 | attack2 | hurt |

Death is a separate `char_<name>_death.png` sheet, `6 cols × 8 rows`, `24×32` cells, 12 fps. Facing row order: `N, NE, E, SE, S, SW, W, NW` mapped so `E` = screen down-right and `S` = screen down-left. Aim angle → facing index via `floor((angle + PI/8) / (PI/4)) mod 8`.

### 8.4 Production batches (generate later, in this order, never redesigning style mid-way)

1. B1 Tiles + walls + props (`tile_*`, `prop_*`) — establishes the spatial grammar.
2. B2 Player + Walker + Runner — establishes silhouettes and the animation map.
3. B3 Remaining 6 zombies + spawnling death sheets.
4. B4 Weapons, bullets, pickups, decals, FX.
5. B5 UI panels, icons, bitmap fonts, loading screen, promo art.

Each batch must be reviewed against §7.9 before the next batch starts.

### 8.5 `spriteFactory.ts` — the placeholder/real switch

```ts
// Pseudocode contract for Cursor:
// getSprite(kind, name, frame) → Phaser.GameObjects.Sprite | Graphics placeholder
// const USE_PLACEHOLDERS = import.meta.env.VITE_USE_PLACEHOLDERS !== 'false'
// If true: placeholderArt.ts draws a Graphics shape with EXACTLY the cell size,
//          pivot, palette colour and category glyph from §8.2, keyed by asset id.
// If false: look up `atlases/<sheet>.json` frame `<name>_<row>_<col>` and set origin
//          from the manifest pivot. Missing asset → log a warning, fall back to
//          the placeholder, NEVER crash.
// All callers use ONLY getSprite(); no code outside this file may reference a
// texture key. Therefore swapping art = flip one env var + drop files in public/.
```

Placeholder shapes must still be silhouette-coded (§7.4): e.g. Boomer = filled circle, Tank = wide rectangle, Spitter = circle + dorsal bump, Charger = rectangle + forward triangles. Placeholder UI uses the same 9-slice dims.

---

## 9. Game design (all numbers in `src/config/balance.ts`)

### 9.1 Player

| Stat | Base |
|---|---|
| Max HP | 100 |
| Move speed | 150 grid units/s |
| Hitbox | circle `r = 8` |
| Dash | 1 charge, 220 units over 0.18 s, 3.0 s cooldown, 0.25 s i-frames |
| Hit i-frames | 0.40 s |
| Pickup radius | 44 units (modified by Magnet skill) |
| Regen | 0 (only via skills) |
| Contact damage | from zombie, respects i-frames |

Death at HP ≤ 0 → `GAME_OVER`, run stats + seed displayed, restart button.

### 9.2 Weapons — 1 starter + 8 unlockable

Schema: `id, name, category:'weapon', damage, fireRate (shots/s), magSize, reloadTime (s), spreadDeg, pellets, projectileSpeed, range, pierce, knockback, ammoCompat, moveSpeedMult, icon, description`.

| Weapon | Dmg | Rate | Mag | Reload | Spread | Pellets | Pierce | Notes |
|---|---|---|---|---|---|---|---|---|
| **Pistol** (starter) | 18 | 4.5 | 12 | 1.10 | 2° | 1 | 0 | Accurate, semi-auto feel even in auto mode (respects rate) |
| SMG | 10 | 11 | 32 | 1.40 | 7° | 1 | 0 | High rate, low per-shot |
| Pump Shotgun | 12 | 1.6 | 6 | 2.00 | 14° | 6 | 0 | Cone, strong knockback |
| Assault Rifle | 22 | 7 | 30 | 1.60 | 4° | 1 | 1 | Balanced |
| DMR | 55 | 2.5 | 12 | 1.80 | 1° | 1 | 2 | Precision |
| LMG | 16 | 12 | 100 | 3.20 | 9° | 1 | 0 | Move speed ×0.85 |
| Flamethrower | 6/tick | 10 ticks/s | 60 (fuel) | 2.60 | 20° cone | 1 | 0 | Short range 110, applies burn |
| Grenade Launcher | 70 AoE | 1.4 | 6 | 2.40 | 3° | 1 | 0 | Projectile arcs, radius 70 |
| Railgun | 130 | 0.8 | 5 | 2.60 | 0° | 1 | 8 | Line through all zombies |

Rules: only **one active weapon** at a time. A new-weapon upgrade switches to it immediately; previously owned weapons are recorded in `owned.weapons` but switching mid-run is only possible via the "Arsenal" skill (rank 1 = press `Q` to cycle). All owned weapons receive ammo-type, attachment and global-skill bonuses. Magazine is per-weapon and reloading is manual (`R`) or automatic on empty (setting-independent).

### 9.3 Ammo types (mutually exclusive active type)

| Ammo | Effect |
|---|---|
| **FMJ** (default) | none |
| Hollow Point | +35% damage, −2 pierce (min 0), −20% vs Tank |
| Armour Piercing | +2 pierce, ignores Tank armour, +15% vs Tank |
| Incendiary | applies Burn `4 dmg/s for 3 s`, stacks up to 3 |
| Cryo | applies Slow `−30% speed for 2 s`, 10% chance to freeze 0.6 s |
| Shock | 25% chance to chain `40%` damage to up to 2 nearby zombies |
| Explosive | on hit, `18` damage in radius `36`, no self-damage |

Ammo upgrades replace the active type; the previous type is owned but inactive (switchable with Arsenal rank 2). Ammo modifiers are applied in `damage.ts` in the fixed order: `base → ammo → attachments → skills → crit → armour → i-frames`.

### 9.4 Attachments (permanent, stack ranks)

| Attachment | Effect per rank | Max rank |
|---|---|---|
| Extended Mag | +25% mag size | 4 |
| Drum Mag | +60% mag size, −8% reload | 2 |
| Suppressor | −30% spread, −10% damage, zombies aggro radius −15% | 3 |
| Muzzle Brake | −35% spread | 4 |
| Red Dot | +12% crit chance | 4 |
| Laser Grip | +8% fire rate, −5% spread | 4 |
| Rapid Receiver | +18% fire rate | 4 (diminishing) |
| Heavy Buffer | +20% knockback, +10% damage | 3 |
| Stabiliser | flamethrower/LMG move penalty removed, −20% spread | 2 |

### 9.5 Grenades

One active grenade type, `G` / right-stick button / on-screen button. Charges regenerate on a cooldown (base 1 charge, 9 s). AoE with linear falloff, does not damage the player except Boomer-style self-harm is explicitly **not** applied (keeps it fair on mobile).

| Grenade | Effect |
|---|---|
| Frag | `90` damage, radius `90`, strong knockback |
| Molotov | leaves a fire field `12 dmg/s for 5 s`, radius `70` |
| Cryo Bomb | `40` damage + freeze `2 s`, radius `100` |
| EMP | `25` damage + stun `1.5 s`, disables Charger/Jumper abilities, radius `110` |
| Cluster | 5 sub-bomblets, `35` each, scattered radius `120` |
| Decoy | no damage; pulls all zombies in radius `180` to a point for `4 s` |

Grenade upgrade grants the type + `+1` max charge; repeatable ranks add `−8%` cooldown (diminishing, floor 20%).

### 9.6 Skills (passive, repeatable where noted)

`Fleetfoot` (+8% move speed), `Vitality` (+20 max HP, heal on pick), `Fast Hands` (−12% reload), `Magnet` (+30% pickup radius), `Deadeye` (+6% crit, +20% crit dmg), `Scholar` (+12% XP gain), `Scavenger` (+1 grenade charge, −10% cooldown), `Adrenaline` (+25% fire rate below 35% HP), `Bulwark` (−6% damage taken), `Thorns` (contact attackers take `12`), `Second Wind` (once per 60 s, survive a lethal hit at 1 HP), `Dash Master` (+1 dash charge, −15% cooldown), `Bloodlust` (+4% damage per 25 kills this wave, resets each wave), `Arsenal` (rank 1: `Q` cycles owned weapons; rank 2: cycles owned ammo), `Regenerator` (+0.6 HP/s), `Executioner` (+25% damage to zombies below 30% HP).

### 9.7 Upgrade system — endless by construction

**Definition schema**

```ts
interface UpgradeDef {
  id: string;
  category: 'weapon' | 'ammo' | 'attachment' | 'grenade' | 'skill';
  name: string; description: (rank: number) => string;
  icon: string;
  tier: 1 | 2 | 3;                 // rarity → border pips + weight modifier
  weight: number;
  minLevel: number; minWave: number;
  requires?: string[];             // e.g. incendiary requires a firearm (always true)
  unique?: boolean;                // weapons/grenades: cannot re-offer once owned
  maxRank: number | null;          // null = infinite
  gain?: (rank: number) => number; // repeatable, diminishing
  apply: (state: RunState) => void;
}
```

**Repeatable gain law (keeps infinite ranks bounded but never zero):**

```
gain(rank) = base * max(0.20, 0.85 ^ rank)     // rank is 0-based BEFORE applying
```
Every non-unique skill/attachment has a `+Stat Cache` variant with `maxRank: null` so the pool can never be exhausted. Weapons/grenades that are already owned are replaced in the pool by their `Mastery` node (`+3% damage` / `−3% cooldown`, infinite, same gain law). Every 25th level adds a guaranteed **Prestige** node (`all multiplicative gains ×1.10`, infinite, diminishing) so late-game level-ups still feel meaningful.

**Roll algorithm — `roll3(state): UpgradeOption[]`**

```
1. pool = all defs filtered by: level >= minLevel, wave >= minWave,
          requires satisfied, rank < maxRank (or maxRank === null),
          not (unique && already owned)
2. weights = def.weight * tierWeight(tier) * categoryBias(state)
   categoryBias: slight boost to the least-offered category recently (last 3 rolls,
   tracked in state) so all 5 categories keep appearing over hundreds of levels
3. pick 3 WITHOUT replacement, preferring 3 DISTINCT categories when possible
4. if pool < 3 → fill remaining slots with `cache_<category>` infinite nodes
5. guarantee at least one option is immediately usable (no unmet prerequisite)
6. if level % 25 === 0 → slot 3 is replaced by the Prestige node (guaranteed)
7. shuffle display order with the run RNG so card position is not predictable
8. options are DATA ONLY; nothing is applied until the player chooses
```

`applyUpgrade(state, id)`: increments `ranks[id]`, calls `def.apply`, pushes to `owned.*` as appropriate, then **recomputes `DerivedStats` from scratch**, clamps derived values to safe ranges (`fireRate ≤ 30`, `moveSpeed ≤ 400`, `crit ≤ 0.75`, `damageTaken ≥ 0.25`, `pickupRadius ≤ 400`), emits `upgradeApplied`, decrements `pendingLevelUps`, resumes or opens the next modal.

**XP curve (endless, no cap)**

```
xpToNext(level) = round(18 + 6*level + 0.45 * level^1.6)
xpFromKill(variant, wave) = variant.xp * (1 + 0.03*(wave-1)) * (1 + scholarBonus)
```
At level 200 the requirement is ~3.4k while late waves deliver hundreds of XP/s (§9.9), so level-ups continue indefinitely. `level` is a plain `number` formatted compactly in UI; never index an array by level. Pickup shards are batched (one shard per kill, merged into a single larger shard when > 40 shards are within 32 units) to protect performance.

### 9.8 Zombie variants

> **Interpretation note:** the brief lists "split acid shooter" as one entry. To avoid ambiguity this plan implements **two** variants — `Splitter` (splits on death) and `Acid Spitter` (ranged) — with distinct silhouettes, telegraphs and behaviours. Merging them into one "Split Acid Spitter" is a config-only change; both spec blocks are already separate. See §19.

| Variant | HP | Speed | Contact dmg | Radius | XP | Unlock wave | Signature |
|---|---|---|---|---|---|---|---|
| Walker | 40 | 42 | 8 | 10 | 5 | 1 | Straight pursuit, slight wobble |
| Runner | 28 | 110 | 6 | 8 | 7 | 2 | Fast, erratic ±15° steering, overshoots |
| Splitter | 55 | 55 | 10 | 11 | 9 | 4 | On death spawns 2 Spawnlings (HP 18, speed 85, dmg 4, XP 2); spawnlings do **not** split |
| Acid Spitter | 45 | 40 | 6 melee | 10 | 10 | 5 | Keeps distance 140–220, telegraphs 0.6 s, lobs acid glob; on impact leaves acid pool `4 dmg/s for 4 s`, radius 40 |
| Jumper | 38 | 55 | 14 on landing | 9 | 9 | 6 | Every 3.5 s: 0.5 s crouch telegraph with a darkening landing diamond, leaps 160 units, AoE 34 on landing |
| Charger | 90 | 45 → 240 | 22 | 13 | 12 | 7 | 0.9 s windup with ground arrow strip, 1.2 s dash in a locked direction, hits a wall → 1.5 s stun (+50% damage taken) |
| Boomer | 70 | 35 | 0 contact | 15 | 11 | 8 | No contact damage; when within 60 units or on death, 0.7 s swelling pulse then `28` AoE radius 90 + vomit slow `−25% for 2 s`. Chain-reacts other Boomers (cap chain depth 3) |
| Tank | 420 | 28 | 30 | 20 | 35 | 10 | Flat 25% damage reduction, 80% knockback resistance, every 6 s a 0.8 s telegraphed ground slam (radius 70, `20`), has a small HP bar in WORLD_UI |

**Common behaviour FSM:** `SPAWNING (0.3 s fade-in, no damage) → SEEK → TELEGRAPH → ATTACK/ABILITY → RECOVER → SEEK`, plus `STUNNED`, `KNOCKED_BACK`, `DYING (death anim, no collision)`. All variants steer directly toward the player with obstacle sliding (no pathfinding); soft separation via spatial hash prevents clumping (max 8 neighbours checked). All spawn **outside the camera view + 1 tile**, on the 4 approach lanes / perimeter ring; never inside a wall or on top of the player.

**Elite affixes (wave 12+):** chance `min(0.05 + 0.012*(wave-12), 0.35)`, one affix per zombie: `Frenzied` (+40% speed), `Armoured` (+25% reduction), `Volatile` (acid burst on death), `Regenerating` (+1.5% HP/s), `Shielded` (absorbs first 60 damage). Elites: ×1.8 HP, ×1.5 XP, elite rim colour **and** a 8×8 affix icon above the head. Every 10th wave from wave 10, force one `Titan` (Tank with ×4 HP, ×2 size cap, ×3 XP) with a wave-start announcement; this is optional content flag-gated by `balance.ENABLE_TITANS`.

### 9.9 Wave director — "more and more zombies", forever

```
wave            = floor(elapsed / 30) + 1              // 30 s waves, endless
D(wave)         = 1 + 0.055 * (wave - 1)              // stat scalar, uncapped
budget(w)       = min( ceil(6 * 1.12^(w-1) + 0.6*w), MAX_PER_WAVE )  // 600 desktop / 320 mobile
spawnInterval   = clamp(30 / budget(w), 0.05, 1.4) s // spread budget evenly over the wave
concurrentCap   = min(120 + 12*w, 700 desktop / 350 mobile)
zombieHP        = base * (1 + 0.045*(w-1))            // soft-capped at ×12 at w≈60
zombieDamage    = base * (1 + 0.025*(w-1))            // soft-capped at ×5
eliteChance     = clamp(0.05 + 0.012*(w-12), 0, 0.35) for w >= 12
```

Rationale: raw spawn count grows ~12% per wave until the **performance ceiling** (wave ≈ 30–35), then density keeps rising via HP, damage, elite ratio and faster spawn cadence. This is still "more and more zombies" from the player's perspective and is honest about the browser's limits. `MAX_PER_WAVE` and `concurrentCap` differ by platform and are read once at boot into `balance`.

Variant spawn weights by wave (unlocked variants only, normalised): Walker starts at 100 and decays to 25 by wave 30; Runner 0→20; Splitter 0→10; Spitter 0→10; Jumper 0→8; Charger 0→10; Boomer 0→7; Tank 0→10. Store as a table of `(wave, weights)` keyframes with linear interpolation, in `balance.ts`, so tuning needs no code change.

When `concurrentCap` is reached, defer spawn requests rather than dropping them; the deferred queue is drained as zombies die (prevents a sudden wall of respawns).

### 9.10 Damage & collision

- Circle-circle for contact; **segment sweep** for bullets: each tick the bullet moves from `p0` to `p1`; query spatial hash cells along the segment, sort hits by distance, apply up to `1 + pierce` hits, stop at walls (low barricades block movement but **not** bullets; tall walls block bullets).
- Damage order: `base → ammo → attachments → skills → crit (rng) → variant/armour reduction → i-frames/absorption → HP`.
- Status effects: burn, slow, freeze, stun, bleed, shock — stored as `(targetId, type, remaining, potency)`, stacked per rules in `ammo.ts`; ticked at 0.25 s intervals in step 6.
- Knockback: impulse `knockback * (1 - resistance)` applied as a decaying velocity, never teleporting an entity inside a wall (clamp against obstacle resolution).
- AoE: linear falloff `1 - dist/radius`, minimum 25% at edge; `maxTargets = 60` per explosion to bound cost.

---

## 10. Input

### 10.1 Unified intent

```ts
interface InputIntent {
  move: Vec2;              // normalised, grid-space
  aim: Vec2;               // normalised, grid-space (from mouse position or right stick)
  aimFromMouse: boolean;
  fireHeld: boolean;       // raw
  fire: boolean;           // derived by fire mode (see below)
  reloadPressed: boolean;
  dashPressed: boolean;
  grenadePressed: boolean;
  cycleWeaponPressed: boolean;   // Q / on-screen
  pausePressed: boolean;
  choose: 1 | 2 | 3 | null;     // upgrade modal only
}
```

`inputManager` merges keyboard/mouse, gamepad and touch into one intent. `fire` = `fireHeld` in `manual` mode; in `auto` mode it is `true` whenever the run is `PLAYING` and the weapon has ammo (auto-reload on empty). The **setting is persisted** (`settings.fireMode`) and shown in the HUD as a small toggle chip so touch users can switch mid-run.

### 10.2 Bindings

| Action | Keyboard/Mouse | Gamepad | Touch |
|---|---|---|---|
| Move | WASD / Arrows | Left stick | Left virtual stick (bottom-left, 96 CSS px radius) |
| Aim | Mouse position | Right stick | Right virtual stick (bottom-right); dragging also aims |
| Fire | LMB hold / `J` | RT / A | Right stick held, or dedicated FIRE button in manual mode |
| Reload | `R` | X | RELOAD button |
| Dash | `Space` | LB / B | DASH button |
| Grenade | `G` | RB / Y | GRENADE button |
| Cycle weapon | `Q` | D-pad left/right | WEAPON button |
| Pause | `Esc` / `P` | Start | PAUSE button |
| Choose upgrade | `1` `2` `3` / arrows+Enter | A / d-pad | Tap card |

Touch controls: semi-transparent, hit area ≥ 48×48 CSS px, do not overlap the HUD, opacity 0.55 when idle, hidden entirely when a keyboard is detected on a desktop. Left/right stick positions are **dynamic** (first touch in that half of the screen defines the centre) to avoid dead-zone frustration. `touch-action: none` on the canvas, `viewport meta` with `user-scalable=no`, safe-area insets respected.

**Gamepad and touch aim conversion:** aim comes from a screen-space direction; convert to grid space with `screenToWorld` on the direction vector (§6.1) before storing, so the bullet goes where the stick points on screen.

---

## 11. UI / HUD

**Branding (applies to every screen):** MENU, pause, game-over, loading screen and the `?debug=1` overlay all use the one `GRAVE GEOMETRY` wordmark asset (`ui_wordmark.png`, `320×48` design px, hazard + player-accent ramps, 1 px ink outline) plus the tagline from §1.4. It is never re-lettered per screen and never styled with CSS shadows/gradients that break the pixel language (§7.7). Text labels come from `GAME_TITLE` / `GAME_TAGLINE` in `src/data/strings.ts`.

### 11.1 In-game HUD (DOM overlay)

Top-left: HP bar + current/max numeric, dash charges, active status icons. Top-centre: `WAVE n`, wave timer bar, kill count. Top-right: `LV n`, XP bar + numeric, score, fire-mode chip, settings/pause buttons. Bottom-centre: active weapon name + `ammo / mag` + reload progress ring + ammo-type icon + attachment pips. Bottom-right (touch only): action buttons. All values use compact formatting for large numbers.

### 11.2 Upgrade modal

Freeze simulation; 3 cards laid out per §7.7 with category glyph, tier pips, name, description showing the **actual next-rank value** (call `description(rank+1)`), current rank badge (`Rank 7`) for repeatables, and `1/2/3` hotkey. Hover/focus states, keyboard navigation (arrow keys + Enter), tap targets ≥ 48×48 CSS px. No "skip" option (every level must grant an upgrade). If `pendingLevelUps > 1`, show a small `+2 queued` badge.

### 11.3 Settings panel (persisted)

`Fire mode: Auto | Manual` · `Master volume` · `SFX` · `Music` · `Screen shake: On/Off` · `Reduced motion: On/Off` · `Colour-blind mode: Off / Protan / Deutan / Tritan` (remaps accent ramps + boosts shape-coded telegraph contrast) · `Damage numbers: On/Off` · `Quality: Auto / High / Low` · `Left-handed touch layout` · `Touch stick size`. All changes take effect immediately and are written to `localStorage` on change.

### 11.4 Pause / Game over

Pause: resume, settings, restart, quit-to-menu. Auto-pause on `visibilitychange` and window blur; never lose run progress by an accidental tab switch. Game over: `Time survived`, `Wave`, `Level`, `Kills` (by variant), `Damage dealt/taken`, `Best combo`, `Seed`, personal best highlights (`NEW BEST` badge), `RESTART` primary button, `MENU` secondary.

### 11.5 Responsive layout

- Landscape ≥ 1.4 aspect: standard HUD.
- 1.0–1.4: shrink top bars 20%, move action buttons to side rails.
- Portrait: HP/XP bars stacked at top, weapon panel above the sticks, upgrade cards become a **vertical scroll list** of 3 full-width cards, wave/kills condense into one line. Camera zoom 1.15 to compensate for the narrower view.
- All HUD text uses CSS `clamp()` with a minimum of 12 CSS px; never below.

### 11.6 Accessibility

DOM buttons are real `<button>`s with `aria-label`s; modal is `role="dialog"` with focus trap and `aria-live` announcements for level-up and wave-start; HP/XP bars have `aria-valuenow`; every telegraph has a shape + icon; colour-blind mode never relies on hue alone; reduced-motion disables shake/flash; no rapid flashes > 3 Hz.

---

## 12. VFX & audio

**VFX** (pooled, capped): muzzle flash (2 frames), tracer line, hit spark, blood decal (max 120, FIFO), acid pool (animated 4 frames), explosion (8 frames), boomer pulse ring, telegraph markers, XP shard trail, damage numbers (max 30), level-up vignette, elite rim, light pools. All use `additive` blend only for fire/muzzle/EMP; everything else normal blend.

**Audio** (`src/audio/sfx.ts`): WebAudio-synthesised placeholders — short square-wave shot per weapon category, noise burst for explosion/reload, descending blip for hurt, rising arpeggio for level-up, low drone for wave start, wet thud for kills. No external files, no autoplay before first user gesture, master gain from settings, all voices capped at 16 concurrent. `music.ts`: optional 2-bar ambient loop (muted by default), synthesised, no licensed audio. Final audio can replace these behind the same `playSfx(id)` API.

---

## 13. Performance budget

| Constraint | Desktop | Mobile |
|---|---|---|
| Target FPS | 60 | 45 (30 acceptable) |
| Max concurrent zombies | 700 | 350 |
| Max bullets | 400 | 200 |
| Max XP shards | 300 (merged above 40 clusters) | 150 |
| Max particles | 240 | 80 |
| Max decals | 120 | 50 |
| Max damage numbers | 30 | 12 |

Techniques: object pools for every spawned object; static ground baked into a `RenderTexture` per chunk (8×8 tiles) and only redrawn on map load; off-screen culling with a 2-tile margin; spatial hash for all proximity queries; no allocations in the hot loop (reuse scratch vectors/arrays); `Math.round` all sprite positions; avoid `Graphics.clear()+redraw` for hundreds of objects — use pooled Sprites/Images; atlas textures to minimise draw calls; `Quality: Low` disables decals, light pools, damage numbers and halves particles. Profiling hook: `?debug=1` renders an FPS/entity-count overlay and exposes `window.__GRAVE_GEOMETRY__ = { state, stats }` for QA.

---

## 14. Persistence

```
localStorage key: gravegeometry.v1.settings  → { fireMode, volumes, shake, reducedMotion,
                                              colourBlind, damageNumbers, quality,
                                              leftHanded, stickSize }
localStorage key: gravegeometry.v1.best      → { time, wave, level, kills, score, date }
```
Versioned wrapper with a safe parse (corrupt/missing data → defaults, never throw), `try/catch` around all writes (private mode), and no run-state saving. Expose a "Reset records" button in settings.

---

## 15. Testing

### 15.1 Self-test gate — MANDATORY after EVERY phase, BEFORE the next phase

Cursor runs **one command itself** after implementing phase N and before touching phase N+1:

```bash
npm run selftest -- --phase=N
```

`scripts/selftest.mjs` executes the steps below **in order, stopping on the first non-zero exit**, and exits 0 only if every step is green:

1. `npm run typecheck`
2. `npm run lint` + `npm run lint:branding` (§1.4) (+ `npm run lint:palette` once `public/assets/` exists)
3. `npm test` — the full Vitest suite, including `tests/phaseGates.test.ts`, which is gated by the `PHASE=N` env var and asserts every executable acceptance criterion for phases 0..N
4. `npm run build` — `dist/index.html` and a JS bundle must exist
5. **Headless smoke (no browser dependency):** start `vite preview`, `fetch` the page and the bundle, assert HTTP 200, assert `index.html` contains no external `http(s)://` resource, assert `src/core` and `src/game` contain no `Math.random()` and no Phaser imports, then kill the server
6. For phases ≥ 3, run `tests/sim.test.ts` headlessly (60 s for P3–P5, 10 min for P8, 30 min for P9) and assert finite state, bounded pools, no NaN and no cap violations
7. Write `selftest/phase-NN.log` with each command, exit code, duration and the last 40 lines of output; print `SELFTEST phase N: PASS` (or `FAIL` + the failing step)

**Phase gate assertions** (`tests/phaseGates.test.ts`, keyed by `PHASE`) — these turn every `**Accept:**` line in §16 into an executable check:

| Phase | Executable assertion |
|---|---|
| 0 | config constants match §6.2; palette has exactly 32 colours; Phaser config has `pixelArt: true`; `GAME_TITLE`/`GAME_TAGLINE` exist and `lint:branding` is clean |
| 1 | iso round-trip + diamond step vectors; seeded RNG determinism; pool acquire/release |
| 2 | map parses, perimeter sealed, player spawn clear, every tile is 64×32 diamond, riser = 8 |
| 3 | all input sources produce equivalent intents; obstacles block; `fireMode` persists across a storage round-trip |
| 4 | segment sweep has no tunnelling at 240 units/s; aim uses `screenToWorld`; reload timing equals config |
| 5 | wave budget monotonic to cap; concurrent cap never exceeded; XP curve finite at level 500 |
| 6 | `roll3` returns 3 distinct usable options across 10,000 rolls; queued level-ups drain one at a time |
| 7 | every upgrade id reachable in 1,000 simulated levels; all derived stats within clamps |
| 8 | each variant FSM reaches its signature state within 10 s; every telegraph ≥ 0.4 s |
| 9 | 30-minute headless run: level > 100, wave > 60, no NaN, entity counts within §13 caps |
| 10 | particle/decal/damage-number caps never exceeded; reduced-motion disables shake; no > 3 Hz flash |
| 11 | HUD compact-formats above 9999; storage never throws on corrupt JSON; responsive breakpoints resolve |
| 12 | `VITE_USE_PLACEHOLDERS=false` with a missing atlas falls back without throwing; every pixel in the palette |

Acceptance items that cannot be asserted in pure logic (visual look, a real phone viewport, perceived FPS) are still checked by Cursor using the `?debug=1` overlay / DOM assertions and recorded as `MANUAL-PASS: <method>` in the phase log. They are **never silently skipped**.

**Auto-repair loop (no user questions):**

```
for attempt in 1..5:
    run `npm run selftest -- --phase=N`
    if exit 0: break
    read selftest/phase-NN.log -> identify failing command + assertion
    patch the smallest set of files -> re-run (no re-planning, no questions)
if still red: write BLOCKED.md (exact command, error, attempts, diff); STOP and report, do not ask
else:         log PASS, commit `phase-NN: ... [selftest PASS]`,
              IMMEDIATELY continue to phase N+1
```

Cursor must not call `ask_user`, must not end the turn to wait for approval, and must not present a phase for review. A red gate is a bug for Cursor to fix, not a decision for the user.

**Vitest (pure logic only)**

| Test file | Must cover |
|---|---|
| `iso.test.ts` | diamond step vectors, `screenToWorld(worldToScreen(p)) ≈ p`, depth ordering, height doesn't change depth |
| `rng.test.ts` | same seed → same sequence, weighted pick respects weights, no replacement |
| `xp.test.ts` | curve monotonic, compact formatting, multiple queued level-ups, level 500+ no overflow |
| `upgrades.test.ts` | 3 distinct options, no duplicate ids, unique weapons excluded once owned, prerequisites, diminishing gain floor at 0.20, infinite pool never exhausts at level 1000, `apply` is deterministic regardless of order, derived stat clamps |
| `waveDirector.test.ts` | budget monotonic to cap, spawn interval ≥ 0.05, concurrent cap never exceeded, deferred queue drains, variant gating by wave, elite chance clamp |
| `damage.test.ts` | modifier order, armour, i-frames, crit bounds, AoE falloff, status stacking |
| `collision.test.ts` | segment sweep hit ordering, pierce count, walls block bullets, barricades don't, no tunnelling at 240 units/s |
| `stats.test.ts` | `recomputeStats` from ranks is order-independent and identical to incremental application |
| `map.test.ts` | exactly one map, perimeter sealed, player spawn clear of obstacles, all spawn markers valid |

**Build/smoke:** handled automatically by the §15.1 gate (step 5) on every phase, plus the final manual QA checklist in §18 at release. Optional Playwright smoke: load → start → simulate 60 s of auto-fire → assert level ≥ 2 and at least one upgrade modal appeared → no console errors.

---

## 16. Milestones — autonomous phase chain (self-test → next phase, no user prompts)

### 16.0 The Phase Loop (applies to EVERY phase below)

```
FOR N = 0 .. 12:
    IMPLEMENT phase N                          # tasks below
    SELF-TEST FIRST: npm run selftest -- --phase=N   # §15.1
    IF red: auto-diagnose from the log, FIX, re-run (max 5 attempts)
            -> if still red: write BLOCKED.md, STOP, report status (never ask)
    LOG PASS in CHANGELOG.md + selftest/phase-NN.log
    COMMIT  `phase-NN: <name> [selftest PASS]`
    CONTINUE to phase N+1 IMMEDIATELY            # no pause, no question, no review
END
FINISH: run the §18 Definition-of-Done checklist, then report completion
```

Rules of the loop:

- **One phase at a time, but zero user checkpoints.** Cursor never stops between phases, never asks "should I continue?", never waits for approval, and never ends the turn mid-chain.
- **Self-test comes before the next phase, always.** No code for phase N+1 may be written while phase N's gate is red.
- **Failures are self-repaired.** Cursor reads its own failure output, patches the smallest change, and re-runs the gate. Do not ask the user how to fix a failing test.
- **Only two valid stopping points:** phase 12 green (report completion) or 5 failed attempts on one phase (write `BLOCKED.md`, report the blocker — still no question).
- Every `**Accept:**` line below is executed by `tests/phaseGates.test.ts` under `PHASE=N`; see the gate table in §15.1.
- Every `**Cursor prompt:**` below ends with the standard self-test + auto-continue suffix, so each prompt also works standalone.

**Single kickoff prompt (paste this ONCE to run the whole chain):**

> `Read PLAN.md and .cursorrules. Implement phases 0 through 12 of §16 in order. After each phase run npm run selftest -- --phase=N, read the log, fix any failure yourself and re-run until green (max 5 attempts), append PASS to CHANGELOG.md and selftest/phase-NN.log, commit, then IMMEDIATELY continue to the next phase. Do not ask me anything, do not pause for review, and do not end the turn until phase 12 is green or BLOCKED.md is written. Finish with the §18 checklist.`

### Phase 0 — Bootstrap
**Tasks:** create `.cursorrules` (§4.1), `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html` (inline CSS, `image-rendering: pixelated`, viewport meta, `<title>GRAVE GEOMETRY</title>`, no external resources), `src/main.ts` with the Phaser config from §4.3, a blank `GameScene` that fills the screen with the ink colour and prints the design resolution, `palette.ts`, `constants.ts`, `CHANGELOG.md`, `README.md`, `package.json` with `name: grave-geometry`, and the placeholder wordmark + tagline from §1.4 / `src/data/strings.ts`.
**Accept:** `npm run selftest -- --phase=0` is green (includes typecheck, tests, build and the smoke check); the dev canvas is a blank pixel-perfect surface and stays crisp on resize; the page title and canvas show `GRAVE GEOMETRY` / `One map. No last wave.` with no retired-name string anywhere in `src/` or `index.html` (`lint:branding` clean).
**Cursor prompt:** `Read PLAN.md. Implement Phase 0 exactly as specified in §16 Phase 0. Create .cursorrules from §4.1 verbatim first. Use the Phaser config in §4.3. No gameplay yet. Then SELF-TEST FIRST with npm run selftest -- --phase=0; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-00.log, commit, then IMMEDIATELY proceed to Phase 1 without asking the user, pausing for review, or ending the turn.`

### Phase 1 — Pure maths & utilities
**Tasks:** `vec2.ts`, `iso.ts`, `rng.ts`, `spatialHash.ts`, `objectPool.ts`, `eventBus.ts`, `fixedStep.ts` + all tests from §15 for these modules. Add `npm run lint:palette` skeleton.
**Accept:** all pure-math tests pass, including the iso round-trip and the diamond step vectors.
**Cursor prompt:** `Implement Phase 1 from PLAN.md §6.1 and §15. No Phaser imports in src/core. Every function gets a Vitest test. Then SELF-TEST FIRST with npm run selftest -- --phase=1; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-01.log, commit, then IMMEDIATELY proceed to Phase 2 without asking the user, pausing for review, or ending the turn.`

### Phase 2 — One isometric map + camera
**Tasks:** `src/data/map.ts` ASCII layout per §6.3, `src/game/map.ts` parser, `tileRenderer.ts` (diamond tiles, 8 px risers, two wall faces, 4 step variants, 4 light pools, baked into chunk RenderTextures), `depthSorter.ts`, `GameScene` camera follow + clamp + integer scale (§6.5), `?debug=1` overlay. Placeholder ground art from `placeholderArt.ts` using palette ramps.
**Accept:** the whole 64×64 map renders with consistent 2:1 diamonds; walls show two faces; camera never shows outside the perimeter; zoom/resize preserves crisp pixels; no mixed square tiles.
**Cursor prompt:** `Implement Phase 2 from PLAN.md §6 and §7.2. Ground must be pure 2:1 diamond tiles with 8px risers. Use placeholderArt.ts with exact cell bounds. Then SELF-TEST FIRST with npm run selftest -- --phase=2; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-02.log, commit, then IMMEDIATELY proceed to Phase 3 without asking the user, pausing for review, or ending the turn.`

### Phase 3 — Player, input, collision
**Tasks:** `RunState` + `createRunState`, `simulation.step` skeleton with the §5.3 tick order, `player.ts` (move, dash, i-frames), `collision.ts` (circle vs obstacles, sliding), `input/intent.ts` + keyboard/mouse + gamepad + touch + `inputManager` with the persisted `fireMode` setting, `persistence/storage.ts`, `Hud.ts` skeleton. Screen-space aim converted with `screenToWorld`.
**Accept:** WASD / left stick / right stick all move the player in the direction shown on screen; walls block; dash works; `Esc` pauses; switching fire mode persists across reload.
**Cursor prompt:** `Implement Phase 3 from PLAN.md §5.2, §5.3, §9.1, §10, §14. All input sources must produce the same InputIntent. Simulation has zero Phaser imports. Then SELF-TEST FIRST with npm run selftest -- --phase=3; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-03.log, commit, then IMMEDIATELY proceed to Phase 4 without asking the user, pausing for review, or ending the turn.`

### Phase 4 — Shooting
**Tasks:** `weapons.ts` with the Pistol only, `bullets.ts` segment sweep + spatial hash, `damage.ts`, `sfx.ts`, `fxRenderer.ts` tracers/muzzle/hit sparks/damage numbers, reload (manual `R` + auto on empty), `spriteFactory.ts` + placeholder weapon overlay.
**Accept:** bullets travel exactly along the on-screen aim direction (verify with the iso conversion), hit registration works at 240 units/s without tunnelling, reload timing matches config, both auto and manual fire modes behave correctly.
**Cursor prompt:** `Implement Phase 4 from PLAN.md §9.2 (Pistol only), §9.10, §12. Verify aim direction uses screenToWorld. Add collision/damage tests. Then SELF-TEST FIRST with npm run selftest -- --phase=4; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-04.log, commit, then IMMEDIATELY proceed to Phase 5 without asking the user, pausing for review, or ending the turn.`

### Phase 5 — Zombies, waves, XP
**Tasks:** `zombies/types.ts` with Walker only, `behaviors.ts` FSM, `spawnDirector.ts` (§9.9 formulas, deferred queue, spawn ring), `xp.ts` (shards, curve, queued level-ups), death animation + pooling, `entityRenderer.ts` depth-sorted, `Hud.ts` HP/XP/wave/kills.
**Accept:** 10 minutes of auto-fire produces monotonically rising wave/budget, zombies never spawn on top of the player or inside walls, concurrent cap respected, XP shards collect and `xpToNext` matches tests.
**Cursor prompt:** `Implement Phase 5 from PLAN.md §9.7 (XP), §9.8 (Walker), §9.9, §13. Add waveDirector and xp tests. Then SELF-TEST FIRST with npm run selftest -- --phase=5; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-05.log, commit, then IMMEDIATELY proceed to Phase 6 without asking the user, pausing for review, or ending the turn.`

### Phase 6 — Level-up & 3 upgrade cards
**Tasks:** `upgrades.ts` (`UpgradeDef`, a seed pool of 6 defs covering all 5 categories, `roll3`, `applyUpgrade`, gain law, `recomputeStats`), `UpgradeModal.ts` (keyboard/tap/focus trap, queued badge), state machine `LEVEL_UP` freeze/resume, `stats.ts`.
**Accept:** every level shows exactly 3 distinct, usable options; no duplicates; picking one changes behaviour; 5 queued level-ups resolve one at a time; simulation is fully frozen during the modal.
**Cursor prompt:** `Implement Phase 6 from PLAN.md §9.7 and §11.2, with the full roll algorithm including category bias, guarantees and infinite fallback. All upgrades.test.ts cases must pass. Then SELF-TEST FIRST with npm run selftest -- --phase=6; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-06.log, commit, then IMMEDIATELY proceed to Phase 7 without asking the user, pausing for review, or ending the turn.`

### Phase 7 — Full upgrade catalogue
**Tasks:** populate `weapons.ts` (all 9), `ammo.ts` (all 7 + status effects), `attachments.ts` (9), `grenades.ts` (6 + projectiles/AoE), `skills.ts` (17), all `UpgradeDef`s with icons/descriptions/tiers/weights/minLevel/minWave, Arsenal cycling, `SettingsPanel.ts` wiring for all toggles.
**Accept:** every definition is reachable through `roll3` given enough levels (write a test that simulates 1000 level-ups and asserts all ids appear), no stat exceeds clamps, ammo modifier order matches §9.10.
**Cursor prompt:** `Implement Phase 7 from PLAN.md §9.2–§9.6. Every number comes from balance.ts. Add a 1000-level simulation test proving the pool never exhausts and all categories appear. Then SELF-TEST FIRST with npm run selftest -- --phase=7; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-07.log, commit, then IMMEDIATELY proceed to Phase 8 without asking the user, pausing for review, or ending the turn.`

### Phase 8 — All zombie variants
**Tasks:** remaining 7 variants + Spawnling, all behaviours and telegraphs (§9.8, §7.8), elite affixes, Titan flag, `WORLD_UI` tank HP bars, boomer chain-reaction cap, acid/fire/cryo hazards, variant-specific death FX and kill tracking.
**Accept:** each variant's signature behaviour triggers and its telegraph lasts ≥ 0.4 s; each is identifiable by placeholder silhouette alone at 1×; no variant can soft-lock (charger stuck in wall, jumper off-map, infinite boomer chain).
**Cursor prompt:** `Implement Phase 8 from PLAN.md §9.8 and §7.8. Telegraphs must be shape-coded and >=0.4s. Add a per-variant behaviour test. Then SELF-TEST FIRST with npm run selftest -- --phase=8; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-08.log, commit, then IMMEDIATELY proceed to Phase 9 without asking the user, pausing for review, or ending the turn.`

### Phase 9 — Endless tuning
**Tasks:** wire all spawn weight keyframes, stat scalars, caps and platform-specific budgets; add the debug overlay for zombie counts / deferred queue / DPS; playtest-by-script (headless simulation of 30 minutes) asserting no NaN, no unbounded arrays, level > 100, wave > 60, FPS-equivalent tick time < 16 ms at the desktop cap.
**Accept:** 30-minute simulated run completes with finite values, bounded entity counts and monotonically increasing level/wave.
**Cursor prompt:** `Implement Phase 9 from PLAN.md §9.9. Add a headless 30-minute simulation test with the assertions listed in the acceptance criteria. Then SELF-TEST FIRST with npm run selftest -- --phase=9; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-09.log, commit, then IMMEDIATELY proceed to Phase 10 without asking the user, pausing for review, or ending the turn.`

### Phase 10 — Juice
**Tasks:** `fxRenderer.ts` full set, `lighting.ts`, screen shake, hit flash, knockback, kill combos, wave-start announcements, `audio/music.ts`, reduced-motion and colour-blind modes applied to all visuals.
**Accept:** no flash > 3 Hz, particle caps respected, `Quality: Low` visibly drops effects without breaking gameplay, audio starts only after a user gesture.
**Cursor prompt:** `Implement Phase 10 from PLAN.md §12, §7.6–§7.8, §11.3. Respect every cap in §13. Then SELF-TEST FIRST with npm run selftest -- --phase=10; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-10.log, commit, then IMMEDIATELY proceed to Phase 11 without asking the user, pausing for review, or ending the turn.`

### Phase 11 — Full UI, persistence, responsiveness
**Tasks:** complete `Hud.ts`, `PauseOverlay.ts`, `GameOverScreen.ts`, compact number formatting, personal bests, auto-pause on blur/visibility, portrait/landscape reflow (§11.5), touch layout options, `strings.ts`, accessibility pass (§11.6), reset-records button.
**Accept:** runs on a 390×844 portrait viewport and a 1920×1080 desktop without overlap or unreadable text; all tap targets ≥ 48 CSS px; tab switch doesn't advance the run; `npm run build` output works from a static file server with no network requests.
**Cursor prompt:** `Implement Phase 11 from PLAN.md §11 and §14. Verify with the two viewport sizes in the acceptance criteria. Then SELF-TEST FIRST with npm run selftest -- --phase=11; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-11.log, commit, then IMMEDIATELY proceed to Phase 12 without asking the user, pausing for review, or ending the turn.`

### Phase 12 — Art swap & release
**Tasks:** generate/apply asset batches B1–B5 to `public/assets/` per §8 (only if the user supplies them), fill `public/assets/README.md` manifest + pivots, enforce `npm run lint:palette`, verify `VITE_USE_PLACEHOLDERS=false` path with missing-asset fallback, loading screen, promo art and final wordmark/tagline per §1.4 / §7.10, `README.md` with controls + art-swap instructions, final §18 QA checklist, tag `v1.0`.
**Accept:** flipping one env var swaps every sprite with **no code changes outside `spriteFactory.ts`**; every pixel is in the locked palette; all §7.9 mistakes absent; the §1.4 wordmark + tagline appear on loading, menu, promo and game-over screens; full test suite + build pass.
**Cursor prompt:** `Implement Phase 12 from PLAN.md §8.5 and §7.9. The art swap must be a single env var flip; verify the missing-asset fallback and run lint:palette. Then SELF-TEST FIRST with npm run selftest -- --phase=12; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-12.log, commit, then finish the §18 Definition-of-Done checklist and report completion. Do not ask the user or end the turn early.`

---

## 17. File-by-file responsibility quick reference

| File | Owns | Must NOT |
|---|---|---|
| `config/balance.ts` | every tunable number | contain logic |
| `config/palette.ts` | the 32 hexes | be bypassed by literal colours |
| `core/math/iso.ts` | the only iso transform | be reimplemented elsewhere |
| `core/math/rng.ts` | all randomness | call `Math.random()` |
| `game/state.ts` | `RunState` shape + creation | mutate outside `simulation.step` |
| `game/simulation.ts` | tick order + orchestration | import Phaser, own rendering |
| `game/upgrades.ts` | pool, roll, apply, gain law | apply on roll (must be data-only) |
| `game/stats.ts` | `recomputeStats` from ranks | increment stats in place |
| `game/zombies/spawnDirector.ts` | wave/budget/gating/caps | spawn inside a wall |
| `render/GameScene.ts` | read state → draw | decide gameplay rules |
| `render/spriteFactory.ts` | placeholder/real switch | be bypassed by any caller |
| `input/inputManager.ts` | merge sources + fire mode | know about weapons |
| `ui/*` | DOM presentation | mutate `RunState` directly (use commands) |
| `persistence/storage.ts` | versioned localStorage | throw on corrupt data |

---

## 18. Definition of Done / QA checklist

- [ ] `npm run typecheck && npm test && npm run build` all pass; no `any`, no console errors on a 5-minute run.
- [ ] Desktop WASD+mouse, gamepad, and touch all playable; auto/manual fire toggle works and persists.
- [ ] One map only; perimeter sealed; no zombie spawn inside geometry or on the player.
- [ ] Every level shows exactly 3 distinct, usable options from the 5 categories; endless (tested to level 1000).
- [ ] All 5 upgrade categories reachable; all 9 weapons, 7 ammo types, 9 attachments, 6 grenades, 17 skills implemented.
- [ ] All 8 zombie variants (+ Spawnling) behave per §9.8 with shape-coded telegraphs ≥ 0.4 s.
- [ ] Waves escalate forever without NaN, unbounded arrays or entity-cap violations (30-minute headless test).
- [ ] Iso diamonds are 64×32 everywhere; risers exactly 8 px; no mixed projections; no subpixel shimmer.
- [ ] All art/UI/VFX uses only the 32 locked colours; `lint:palette` passes.
- [ ] Portrait phone and 1080p desktop both readable; text ≥ 12 CSS px; tap targets ≥ 48 CSS px.
- [ ] Reduced-motion and colour-blind modes functional; no > 3 Hz flashes; modal keyboard-navigable with focus trap.
- [ ] Game runs fully offline from `dist/` with zero network requests.
- [ ] `VITE_USE_PLACEHOLDERS=false` with missing assets degrades gracefully instead of crashing.
- [ ] `CHANGELOG.md` has one entry per phase; `README.md` documents controls and the art-swap procedure.
- [ ] All 13 phases have a `selftest/phase-NN.log` showing `PASS` and a matching `[selftest PASS]` commit; every `**Accept:**` criterion was executed by `npm run selftest -- --phase=N`.
- [ ] The 0→12 chain completed with **no user confirmation step, no `ask_user`, and no mid-chain pause**; `BLOCKED.md` does not exist (or is resolved).
- [ ] Title is **GRAVE GEOMETRY** everywhere (page title, package name, wordmark, menu, loading, promo, game over, README, `gravegeometry.v1.*` storage keys, `window.__GRAVE_GEOMETRY__` debug hook); `npm run lint:branding` confirms **zero** occurrences of the retired working title in code, UI strings and assets (historical mentions in `plan.md` / `CHANGELOG.md` excluded).
- [ ] The §1.4 pre-release clearance checklist (USPTO TESS / WIPO / EUIPO / MyIPO + storefronts + domains) is completed before any public or commercial release.

---

## 19. Risks, open decisions & notes for the user

| # | Item | Default in this plan | How to change |
|---|---|---|---|
| 1 | **"Split acid shooter"** — one enemy or two? | Implemented as **two** variants: Splitter + Acid Spitter (§9.8). | Say "merge them" → one variant with both behaviours; config-only change (`balance.ts` + one FSM branch). |
| 2 | Titan boss every 10 waves | Implemented, flag `ENABLE_TITANS = true`. | Flip to `false` for a pure endless horde. |
| 3 | Meta-progression between runs | **None**; only settings + personal bests persist. | Add `gravegeometry.v1.meta` + a permanent-upgrade shop — needs a new phase. |
| 4 | Weapon switching | Only via the `Arsenal` skill; new weapons auto-equip. | Could add free `Q` cycling from level 1 — one line in `player.ts`. |
| 5 | Spawn count saturates ~wave 30–35 | Difficulty continues via HP/damage/elite ratio (§9.9). | Raise `MAX_PER_WAVE` / `concurrentCap` for high-end desktops. |
| 6 | Art assets | Not generated in this plan; placeholders + exact contracts (§8). | I can generate sprite sheets batch B1–B5 into `public/assets/` on request. |
| 7 | Audio | Synthesised WebAudio placeholders only. | Drop in `.ogg` files behind the same `playSfx(id)` API. |
| 8 | Stack swap | Phaser 3 locked. | Because `src/core` + `src/game` are Phaser-free, moving to PixiJS/Canvas only touches `src/render`. |
| 9 | Autonomous phase chain | **On.** Self-test after every phase, auto-fix up to 5 attempts, then continue to the next phase with no user prompt (§16.0). | To restore manual checkpoints, edit the `WORKFLOW` block in §4.1 and remove the §16.0 loop; the phase tasks and acceptance criteria are unchanged. |
| 10 | Game title | **GRAVE GEOMETRY** locked (§1.4); preliminary web/store screen done 2026-11-03, formal trademark clearance still pending. | If clearance finds a conflict, change `GAME_TITLE` in `src/data/strings.ts` + the wordmark asset; every screen reads the constant, so no other code changes are needed. |

**Known technical risks:** (a) depth-sorting hundreds of moving sprites each frame — mitigate with a preallocated sort array and stable integer depth keys; (b) mobile GPU fill-rate with additive light pools — mitigate with `Quality: Low` auto-detection; (c) XP shard count at wave 40+ — mitigate with the merging rule; (d) `level^1.6` at very high levels — safe in JS `number` until level ≈ 10^14, far beyond any real run.

---

## Appendix A — Copy-paste Cursor prompts (all phases)

> Each prompt below carries the self-test + auto-continue suffix from §16.0, so any single one works standalone. To build the entire game in one shot, paste the kickoff prompt in §16.0 instead.

1. `Read PLAN.md. Implement Phase 0 (§16). Create .cursorrules from §4.1 verbatim first. Bootstrap only, no gameplay. Then SELF-TEST FIRST with npm run selftest -- --phase=0; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-00.log, commit, then IMMEDIATELY proceed to Phase 1 without asking the user, pausing for review, or ending the turn.`
2. `Implement Phase 1 (§16). Pure TypeScript only, all maths from §6.1, all tests from §15. Then SELF-TEST FIRST with npm run selftest -- --phase=1; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-01.log, commit, then IMMEDIATELY proceed to Phase 2 without asking the user, pausing for review, or ending the turn.`
3. `Implement Phase 2 (§16). One 64×64 ASCII map, 2:1 diamond tiles, 8px risers, camera follow and integer scaling per §6. Then SELF-TEST FIRST with npm run selftest -- --phase=2; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-02.log, commit, then IMMEDIATELY proceed to Phase 3 without asking the user, pausing for review, or ending the turn.`
4. `Implement Phase 3 (§16). RunState, fixed tick order, player/dash, collision, and all four input sources merged into InputIntent per §10. Then SELF-TEST FIRST with npm run selftest -- --phase=3; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-03.log, commit, then IMMEDIATELY proceed to Phase 4 without asking the user, pausing for review, or ending the turn.`
5. `Implement Phase 4 (§16). Pistol, segment-sweep bullets, damage pipeline order, reload, tracers and placeholder SFX. Then SELF-TEST FIRST with npm run selftest -- --phase=4; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-04.log, commit, then IMMEDIATELY proceed to Phase 5 without asking the user, pausing for review, or ending the turn.`
6. `Implement Phase 5 (§16). Walker, wave director formulas, XP curve and shards, depth-sorted rendering, basic HUD. Then SELF-TEST FIRST with npm run selftest -- --phase=5; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-05.log, commit, then IMMEDIATELY proceed to Phase 6 without asking the user, pausing for review, or ending the turn.`
7. `Implement Phase 6 (§16). Full roll3 upgrade system and 3-card modal with queued level-ups. Then SELF-TEST FIRST with npm run selftest -- --phase=6; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-06.log, commit, then IMMEDIATELY proceed to Phase 7 without asking the user, pausing for review, or ending the turn.`
8. `Implement Phase 7 (§16). All weapon/ammo/attachment/grenade/skill definitions and their upgrade defs; 1000-level pool test. Then SELF-TEST FIRST with npm run selftest -- --phase=7; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-07.log, commit, then IMMEDIATELY proceed to Phase 8 without asking the user, pausing for review, or ending the turn.`
9. `Implement Phase 8 (§16). All 8 zombie variants, telegraphs, elites and hazards. Then SELF-TEST FIRST with npm run selftest -- --phase=8; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-08.log, commit, then IMMEDIATELY proceed to Phase 9 without asking the user, pausing for review, or ending the turn.`
10. `Implement Phase 9 (§16). Endless tuning, debug overlay, 30-minute headless simulation test. Then SELF-TEST FIRST with npm run selftest -- --phase=9; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-09.log, commit, then IMMEDIATELY proceed to Phase 10 without asking the user, pausing for review, or ending the turn.`
11. `Implement Phase 10 (§16). VFX, lighting, juice, audio, reduced-motion and colour-blind modes. Then SELF-TEST FIRST with npm run selftest -- --phase=10; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-10.log, commit, then IMMEDIATELY proceed to Phase 11 without asking the user, pausing for review, or ending the turn.`
12. `Implement Phase 11 (§16). Complete HUD, pause, game over, persistence, responsive layouts, accessibility. Then SELF-TEST FIRST with npm run selftest -- --phase=11; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-11.log, commit, then IMMEDIATELY proceed to Phase 12 without asking the user, pausing for review, or ending the turn.`
13. `Implement Phase 12 (§16). Single-env-var art swap, palette lint, loading screen, promo art, release QA. Then SELF-TEST FIRST with npm run selftest -- --phase=12; fix any failure yourself and re-run until green (max 5 attempts); log PASS in CHANGELOG.md and selftest/phase-12.log, commit, then finish the §18 Definition-of-Done checklist and report completion. Do not ask the user or end the turn early.`

## Appendix B — Config constant quick list (`constants.ts`)

```ts
export const TILE_W = 64;            export const TILE_H = 32;
export const TILE_RISER = 8;         export const STEP_RISER = 4;
export const DESIGN_W = 640;         export const DESIGN_H = 360;
export const MAP_W = 64;             export const MAP_H = 64;
export const FIXED_DT = 1 / 60;      export const MAX_SUBSTEPS = 5;
export const HASH_CELL = 64;         export const WAVE_SECONDS = 30;
export const CHARACTER_CELL_W = 24;  export const CHARACTER_CELL_H = 32;
export const PIVOT_X = 12;           export const PIVOT_Y = 28;
export const LAYER = { GROUND:0, DECAL:10, ENTITIES:20, PROJECTILES:30,
                       FX:40, LIGHTING:50, WORLD_UI:60 } as const;
```
