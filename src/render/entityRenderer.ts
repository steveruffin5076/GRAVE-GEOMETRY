import Phaser from 'phaser';
import { PALETTE } from '../config/palette.ts';
import { LAYER } from '../config/constants.ts';
import { worldToScreen } from '../core/math/iso.ts';
import { sortByDepth } from './depthSorter.ts';
import type { Bullet } from '../game/bullets.ts';
import type { PlayerState, RunState } from '../game/state.ts';
import type { XpShard, Zombie } from '../game/zombieEntity.ts';
import { drawWeaponOverlay } from './spriteFactory.ts';

const INK = Number(`0x${PALETTE.ink0.slice(1)}`);

export function drawPlayerPlaceholder(
  g: Phaser.GameObjects.Graphics,
  player: PlayerState,
  bullets: readonly Bullet[] = [],
): void {
  const s = worldToScreen(player.x, player.y);
  const cx = Math.round(s.x);
  const cy = Math.round(s.y);

  g.clear();
  g.fillStyle(Number(`0x${PALETTE.ink0.slice(1)}`), 0.4);
  g.fillEllipse(cx + 4, cy + 2, 20, 10);

  const w = 16;
  const h = 24;
  const left = cx - 8;
  const top = cy - 22;
  g.fillStyle(Number(`0x${PALETTE.player1.slice(1)}`), 1);
  g.fillRect(left, top, w, h);
  g.lineStyle(1, INK, 1);
  g.strokeRect(left, top, w, h);

  drawWeaponOverlay(g, player);

  g.lineStyle(1, Number(`0x${PALETTE.player2.slice(1)}`), 1);
  for (const b of bullets) {
    const bs = worldToScreen(b.x, b.y);
    g.fillStyle(Number(`0x${PALETTE.ui3.slice(1)}`), 1);
    g.fillRect(Math.round(bs.x) - 1, Math.round(bs.y) - 9, 2, 2);
  }
}

export function drawWorldEntities(g: Phaser.GameObjects.Graphics, state: RunState): void {
  drawPlayerPlaceholder(g, state.player, state.bullets);

  for (const pool of state.acidPools) {
    const s = worldToScreen(pool.x, pool.y);
    g.fillStyle(Number(`0x${PALETTE.grime1.slice(1)}`), 0.35);
    g.fillEllipse(Math.round(s.x), Math.round(s.y), pool.radius, pool.radius * 0.5);
  }

  const drawables = sortByDepth([
    ...state.zombies.filter((z) => z.active && z.state !== 'DYING'),
    ...state.shards.filter((s) => s.active),
  ]);

  for (const item of drawables) {
    if ('variant' in item) drawZombie(g, item as Zombie);
    else drawShard(g, item as XpShard);
  }
}

function drawZombie(g: Phaser.GameObjects.Graphics, z: Zombie): void {
  const s = worldToScreen(z.x, z.y);
  const cx = Math.round(s.x);
  const cy = Math.round(s.y);
  const alpha = z.state === 'SPAWNING' ? 0.5 : 1;
  const fill = Number(`0x${PALETTE.zombie1.slice(1)}`);

  if (z.telegraphTimer > 0 && z.telegraphShape !== null) {
    drawTelegraph(g, cx, cy, z.telegraphShape, z.radius);
  }

  g.lineStyle(1, INK, alpha);
  g.fillStyle(fill, alpha);

  switch (z.variant) {
    case 'boomer':
      g.fillCircle(cx, cy - 10, 14);
      g.strokeCircle(cx, cy - 10, 14);
      break;
    case 'tank':
      g.fillRect(cx - 16, cy - 26, 32, 24);
      g.strokeRect(cx - 16, cy - 26, 32, 24);
      drawTankBar(g, cx, cy - 32, z.hp, z.maxHp);
      break;
    case 'spitter':
      g.fillRect(cx - 8, cy - 22, 16, 20);
      g.fillCircle(cx, cy - 26, 6);
      g.strokeRect(cx - 8, cy - 22, 16, 20);
      break;
    case 'charger':
      g.fillTriangle(cx + 10, cy - 14, cx - 6, cy - 22, cx - 6, cy - 6);
      g.fillRect(cx - 8, cy - 22, 14, 20);
      break;
    case 'runner':
      g.fillRect(cx - 6, cy - 20, 14, 18);
      break;
    case 'jumper':
      g.fillRect(cx - 7, cy - 16, 14, 12);
      g.fillRect(cx - 9, cy - 8, 18, 6);
      break;
    case 'splitter':
      g.fillRect(cx - 12, cy - 22, 20, 20);
      g.fillRect(cx + 2, cy - 18, 10, 14);
      break;
    default:
      g.fillRect(cx - 8, cy - 22, 16, 22);
      g.strokeRect(cx - 8, cy - 22, 16, 22);
  }

  if (z.isElite) {
    g.lineStyle(2, Number(`0x${PALETTE.xp2.slice(1)}`), alpha);
    g.strokeCircle(cx, cy - 12, z.radius + 4);
  }
}

function drawTelegraph(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  shape: NonNullable<Zombie['telegraphShape']>,
  radius: number,
): void {
  g.lineStyle(2, Number(`0x${PALETTE.hazard1.slice(1)}`), 0.85);
  if (shape === 'diamond') {
    g.strokeRect(cx - radius, cy - radius, radius * 2, radius);
  } else if (shape === 'arrow') {
    g.strokeRect(cx - radius, cy, radius * 2, 8);
  } else if (shape === 'pulse' || shape === 'ring') {
    g.strokeCircle(cx, cy - 8, radius + 6);
  } else if (shape === 'sac') {
    g.fillStyle(Number(`0x${PALETTE.grime1.slice(1)}`), 0.5);
    g.fillCircle(cx, cy - 20, 8);
  }
}

function drawTankBar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, hp: number, maxHp: number): void {
  const w = 28;
  g.fillStyle(INK, 0.8);
  g.fillRect(cx - w / 2, cy, w, 4);
  const frac = Math.max(0, hp / maxHp);
  g.fillStyle(Number(`0x${PALETTE.blood2.slice(1)}`), 1);
  g.fillRect(cx - w / 2, cy, Math.round(w * frac), 4);
}

function drawShard(g: Phaser.GameObjects.Graphics, shard: XpShard): void {
  const s = worldToScreen(shard.x, shard.y);
  const cx = Math.round(s.x);
  const cy = Math.round(s.y);
  g.fillStyle(Number(`0x${PALETTE.xp1.slice(1)}`), 1);
  g.fillRect(cx - 4, cy - 12, 8, 8);
}

export function playerScreenPosition(player: PlayerState): { x: number; y: number } {
  const s = worldToScreen(player.x, player.y);
  return { x: Math.round(s.x), y: Math.round(s.y) };
}

export const PLAYER_RENDER_DEPTH = LAYER.ENTITIES;
