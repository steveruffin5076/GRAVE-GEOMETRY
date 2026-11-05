import { len } from '../core/math/vec2.ts';
import { createGamepadState, readGamepadIntent, pollGamepad, type GamepadState } from './gamepad.ts';
import { emptyIntent, type InputIntent } from './intent.ts';
import {
  createKeyboardMouseState,
  readKeyboardMouseIntent,
  type KeyboardMouseState,
} from './keyboardMouse.ts';
import { createTouchState, readTouchIntent, type TouchState } from './touch.ts';
import type { FireMode, GameSettings } from '../persistence/storage.ts';

export interface InputManagerState {
  keyboard: KeyboardMouseState;
  gamepad: GamepadState;
  touch: TouchState;
  settings: GameSettings;
}

export function applyFireMode(intent: InputIntent, mode: FireMode, playing: boolean): void {
  if (mode === 'manual') {
    intent.fire = intent.fireHeld;
  } else {
    intent.fire = playing;
  }
}

function mergeIntents(primary: InputIntent, secondary: InputIntent): InputIntent {
  const out = { ...primary };
  if (len(secondary.move) > len(out.move)) out.move = secondary.move;
  if (!out.aimFromMouse && len(secondary.aim) > len(out.aim)) {
    out.aim = secondary.aim;
    out.aimFromMouse = secondary.aimFromMouse;
  }
  out.fireHeld = out.fireHeld || secondary.fireHeld;
  out.dashPressed = out.dashPressed || secondary.dashPressed;
  out.pausePressed = out.pausePressed || secondary.pausePressed;
  out.reloadPressed = out.reloadPressed || secondary.reloadPressed;
  out.grenadePressed = out.grenadePressed || secondary.grenadePressed;
  out.cycleWeaponPressed = out.cycleWeaponPressed || secondary.cycleWeaponPressed;
  if (secondary.choose !== null) out.choose = secondary.choose;
  return out;
}

export function pollInput(
  mgr: InputManagerState,
  playerScreenX: number,
  playerScreenY: number,
  playing: boolean,
): InputIntent {
  pollGamepad(mgr.gamepad);
  let intent = readKeyboardMouseIntent(mgr.keyboard, playerScreenX, playerScreenY);
  intent = mergeIntents(intent, readGamepadIntent(mgr.gamepad));
  intent = mergeIntents(intent, readTouchIntent(mgr.touch));
  applyFireMode(intent, mgr.settings.fireMode, playing);
  return intent;
}

export function defaultFireModeForPlatform(): FireMode {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse ? 'auto' : 'manual';
}

export function createInputManager(settings: GameSettings): InputManagerState {
  return {
    keyboard: createKeyboardMouseState(),
    gamepad: createGamepadState(),
    touch: createTouchState(),
    settings,
  };
}

export function toggleFireMode(mgr: InputManagerState): FireMode {
  mgr.settings.fireMode = mgr.settings.fireMode === 'auto' ? 'manual' : 'auto';
  return mgr.settings.fireMode;
}

export function emptyInput(): InputIntent {
  return emptyIntent();
}
