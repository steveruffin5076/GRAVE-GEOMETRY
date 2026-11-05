import { BALANCE } from '../config/balance.ts';
import type { Vec2 } from '../core/math/vec2.ts';
import { clampLen, len, normalize, scale, vec2 } from '../core/math/vec2.ts';
import { slideMove } from './collision.ts';
import type { Obstacle } from './map.ts';
import type { PlayerState } from './state.ts';

export function updatePlayer(
  player: PlayerState,
  move: Vec2,
  dashPressed: boolean,
  dt: number,
  obstacles: readonly Obstacle[],
  mapW: number,
  mapH: number,
  speedMult = 1,
): void {
  const cfg = BALANCE.player;
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.iFrameTimer = Math.max(0, player.iFrameTimer - dt);

  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    const step = scale(player.dashVel, dt);
    const next = slideMove(player.x, player.y, player.hitRadius, step, obstacles, mapW, mapH);
    player.x = next.x;
    player.y = next.y;
    if (player.dashTimer === 0) {
      player.dashVel = vec2(0, 0);
    }
    return;
  }

  if (dashPressed && player.dashCharges > 0 && player.dashCooldown <= 0 && len(move) > 0.01) {
    const dir = normalize(move);
    const speed = cfg.dashDistance / cfg.dashDuration;
    player.dashVel = scale(dir, speed);
    player.dashTimer = cfg.dashDuration;
    player.dashCooldown = cfg.dashCooldown;
    player.dashCharges = 0;
    player.iFrameTimer = Math.max(player.iFrameTimer, cfg.dashIFrames);
    return;
  }

  if (player.dashCooldown <= 0 && player.dashCharges < 1) {
    player.dashCharges = 1;
  }

  if (len(move) > 0.01) {
    const speed = player.moveSpeed * speedMult;
    const delta = scale(normalize(move), speed * dt);
    const next = slideMove(player.x, player.y, player.hitRadius, delta, obstacles, mapW, mapH);
    player.x = next.x;
    player.y = next.y;
  }
}

export function setPlayerAim(player: PlayerState, aim: Vec2): void {
  if (len(aim) > 0.01) {
    player.aim = normalize(aim);
  }
}

export function clampMoveIntent(v: Vec2): Vec2 {
  return clampLen(v, 1);
}
