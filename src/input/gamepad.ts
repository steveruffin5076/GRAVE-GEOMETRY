import { mergeScreenMove } from './keyboardMouse.ts';
import { emptyIntent, type InputIntent } from './intent.ts';
import { screenDirectionToGrid } from './keyboardMouse.ts';

export interface GamepadState {
  connected: boolean;
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fireHeld: boolean;
  dashPressed: boolean;
  pausePressed: boolean;
  pauseWasDown: boolean;
}

export function createGamepadState(): GamepadState {
  return {
    connected: false,
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    fireHeld: false,
    dashPressed: false,
    pausePressed: false,
    pauseWasDown: false,
  };
}

const DEAD = 0.2;

function applyDead(v: number): number {
  return Math.abs(v) < DEAD ? 0 : v;
}

export function pollGamepad(state: GamepadState): void {
  const pads = navigator.getGamepads();
  const pad = pads[0];
  if (pad === null || pad === undefined) {
    state.connected = false;
    state.pauseWasDown = false;
    return;
  }
  state.connected = true;
  state.moveX = applyDead(pad.axes[0] ?? 0);
  state.moveY = applyDead(pad.axes[1] ?? 0);
  state.aimX = applyDead(pad.axes[2] ?? 0);
  state.aimY = applyDead(pad.axes[3] ?? 0);
  state.fireHeld = (pad.buttons[7]?.pressed ?? false) || (pad.buttons[0]?.pressed ?? false);
  state.dashPressed = pad.buttons[1]?.pressed ?? false;
  const pauseDown = pad.buttons[9]?.pressed ?? false;
  state.pausePressed = pauseDown && !state.pauseWasDown;
  state.pauseWasDown = pauseDown;
}

export function readGamepadIntent(state: GamepadState): InputIntent {
  const intent = emptyIntent();
  if (!state.connected) return intent;
  intent.move = mergeScreenMove(state.moveX, state.moveY);
  if (Math.hypot(state.aimX, state.aimY) > DEAD) {
    intent.aim = screenDirectionToGrid(state.aimX, state.aimY);
  } else if (intent.move.x !== 0 || intent.move.y !== 0) {
    intent.aim = intent.move;
  }
  intent.fireHeld = state.fireHeld;
  intent.dashPressed = state.dashPressed;
  intent.pausePressed = state.pausePressed;
  return intent;
}
