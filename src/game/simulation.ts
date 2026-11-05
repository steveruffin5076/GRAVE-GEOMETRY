import { cycleOwnedAmmo } from './ammo.ts';
import { tryThrowGrenade, updateGrenades } from './grenades.ts';
import { arsenalRank } from './skills.ts';
import { cycleOwnedWeapon } from './weapons.ts';
import type { InputIntent } from '../input/intent.ts';
import { updateBullets } from './bullets.ts';
import { updatePlayer, setPlayerAim } from './player.ts';
import type { RunState } from './state.ts';
import { applyUpgrade, roll3 } from './upgrades.ts';
import { updateWeapon } from './weapons.ts';
import { trimAcidPools } from './zombies/hazards.ts';
import { updateZombies } from './zombies/behaviors.ts';
import { updateSpawnDirector } from './zombies/spawnDirector.ts';
import { updateXpShards } from './xp.ts';
import { BALANCE } from '../config/balance.ts';
import { recomputeStats, syncPlayerFromStats } from './stats.ts';

function handleArsenal(state: RunState, intent: InputIntent): void {
  if (!intent.cycleWeaponPressed) return;
  const rank = arsenalRank(state);
  if (rank < 1) return;
  if (rank >= 2) {
    if (state.cycleArsenalMode === 'weapon') {
      cycleOwnedWeapon(state);
      state.cycleArsenalMode = 'ammo';
    } else {
      cycleOwnedAmmo(state);
      state.cycleArsenalMode = 'weapon';
    }
  } else {
    cycleOwnedWeapon(state);
  }
}

function tickRegen(state: RunState, dt: number): void {
  if (state.stats.regenPerSecond <= 0) return;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.stats.regenPerSecond * dt);
}

function tickSecondWind(state: RunState, dt: number): void {
  state.secondWindTimer = Math.max(0, state.secondWindTimer - dt);
}

function tickCombatDps(state: RunState, dt: number): void {
  for (const e of state.presentation) {
    if (e.type === 'hit') state.combatDamageWindow += e.damage;
  }
  state.combatDamageWindowSec += dt;
  if (state.combatDamageWindowSec >= 1) {
    state.combatDps =
      state.combatDamageWindowSec > 0
        ? state.combatDamageWindow / state.combatDamageWindowSec
        : 0;
    state.combatDamageWindow = 0;
    state.combatDamageWindowSec = 0;
  }
}

function tickKillCombo(state: RunState, dt: number): void {
  state.killComboTimer = Math.max(0, state.killComboTimer - dt);
  if (state.killComboTimer <= 0) state.killComboCount = 0;
}

export function simulationStep(state: RunState, intent: InputIntent, dt: number): void {
  state.presentation = [];

  if (state.phase === 'LEVEL_UP') {
    if (intent.choose !== null && state.levelUpOptions !== null) {
      const idx = intent.choose - 1;
      const option = state.levelUpOptions[idx];
      if (option !== undefined) {
        applyUpgrade(state, option.id);
        if (state.pendingLevelUps > 0) {
          state.levelUpOptions = roll3(state);
        } else {
          state.levelUpOptions = null;
          state.phase = 'PLAYING';
        }
      }
    }
    return;
  }

  if (state.phase !== 'PLAYING') return;

  state.time += dt;
  setPlayerAim(state.player, intent.aim);

  handleArsenal(state, intent);
  updateSpawnDirector(state, dt);
  updatePlayer(
    state.player,
    intent.move,
    intent.dashPressed,
    dt,
    state.obstacles,
    state.mapWidth,
    state.mapHeight,
    1,
  );
  updateWeapon(state, intent.fire, intent.reloadPressed, dt);
  tryThrowGrenade(state, intent.grenadePressed);
  updateGrenades(state, dt);
  updateBullets(state, dt);
  updateZombies(state, dt);
  updateXpShards(state, dt);
  tickRegen(state, dt);
  tickSecondWind(state, dt);
  tickKillCombo(state, dt);

  if (state.pendingLevelUps > 0) {
    state.phase = 'LEVEL_UP';
    state.levelUpOptions = roll3(state);
  }

  tickCombatDps(state, dt);
  trimAcidPools(state);
}

export function resumeFromPause(state: RunState): void {
  if (state.phase === 'PAUSED') state.phase = 'PLAYING';
}

export function togglePause(state: RunState): void {
  state.phase = state.phase === 'PLAYING' ? 'PAUSED' : state.phase === 'PAUSED' ? 'PLAYING' : state.phase;
}

export function applyBalanceToPlayer(state: RunState): void {
  const p = state.player;
  p.maxHp = BALANCE.player.maxHp;
  p.moveSpeed = BALANCE.player.moveSpeed;
  p.hitRadius = BALANCE.player.hitRadius;
  state.stats = recomputeStats(state);
  syncPlayerFromStats(state);
}
