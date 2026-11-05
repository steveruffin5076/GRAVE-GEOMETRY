import type { Vec2 } from '../core/math/vec2.ts';

export interface InputIntent {
  move: Vec2;
  aim: Vec2;
  aimFromMouse: boolean;
  fireHeld: boolean;
  fire: boolean;
  reloadPressed: boolean;
  dashPressed: boolean;
  grenadePressed: boolean;
  cycleWeaponPressed: boolean;
  pausePressed: boolean;
  choose: 1 | 2 | 3 | null;
}

export function emptyIntent(): InputIntent {
  return {
    move: { x: 0, y: 0 },
    aim: { x: 1, y: 0 },
    aimFromMouse: false,
    fireHeld: false,
    fire: false,
    reloadPressed: false,
    dashPressed: false,
    grenadePressed: false,
    cycleWeaponPressed: false,
    pausePressed: false,
    choose: null,
  };
}
