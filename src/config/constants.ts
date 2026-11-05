export const TILE_W = 64;
export const TILE_H = 32;
export const TILE_RISER = 8;
export const STEP_RISER = 4;
export const DESIGN_W = 640;
export const DESIGN_H = 360;
export const MAP_W = 64;
export const MAP_H = 64;
export const FIXED_DT = 1 / 60;
export const MAX_SUBSTEPS = 5;
export const HASH_CELL = 64;
export const WAVE_SECONDS = 30;
export const CHARACTER_CELL_W = 24;
export const CHARACTER_CELL_H = 32;
export const PIVOT_X = 12;
export const PIVOT_Y = 28;
export const LAYER = {
  GROUND: 0,
  DECAL: 10,
  ENTITIES: 20,
  PROJECTILES: 30,
  FX: 40,
  LIGHTING: 50,
  WORLD_UI: 60,
} as const;
