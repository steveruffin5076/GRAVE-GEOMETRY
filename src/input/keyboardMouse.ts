import { screenToWorld } from '../core/math/iso.ts';
import { len, normalize, vec2 } from '../core/math/vec2.ts';
import { emptyIntent, type InputIntent } from './intent.ts';

const AIM_DEAD_PX = 6;

/** Screen-space direction → grid-space (PLAN §10). */
export function screenDirectionToGrid(sx: number, sy: number): { x: number; y: number } {
  const w = screenToWorld(sx, sy);
  return normalize(vec2(w.x, w.y));
}

export function mergeScreenMove(ax: number, ay: number): { x: number; y: number } {
  if (Math.abs(ax) < 0.001 && Math.abs(ay) < 0.001) return { x: 0, y: 0 };
  return screenDirectionToGrid(ax, ay);
}

export function aimFromScreenDelta(
  dx: number,
  dy: number,
  previousAim: { x: number; y: number },
  minLen = AIM_DEAD_PX,
): { x: number; y: number } {
  if (len(vec2(dx, dy)) < minLen) {
    return len(previousAim) > 0.01 ? previousAim : { x: 1, y: 0 };
  }
  return screenDirectionToGrid(dx, dy);
}

export interface KeyboardMouseState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  pauseEdge: boolean;
  chooseEdge: 1 | 2 | 3 | null;
}

export function createKeyboardMouseState(): KeyboardMouseState {
  return {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    pauseEdge: false,
    chooseEdge: null,
  };
}

/** Phaser pointer (game pixels) — matches RESIZE scale and camera. */
export function syncPointerFromPhaser(state: KeyboardMouseState, x: number, y: number, isDown: boolean): void {
  state.mouseX = x;
  state.mouseY = y;
  state.mouseDown = isDown;
}

export function bindKeyboardMouse(
  canvas: HTMLCanvasElement,
  state: KeyboardMouseState,
): () => void {
  const down = (e: KeyboardEvent): void => {
    state.keys.add(e.code);
    if (e.code === 'Escape' || e.code === 'KeyP') state.pauseEdge = true;
    if (e.code === 'Digit1' || e.code === 'Numpad1') state.chooseEdge = 1;
    if (e.code === 'Digit2' || e.code === 'Numpad2') state.chooseEdge = 2;
    if (e.code === 'Digit3' || e.code === 'Numpad3') state.chooseEdge = 3;
  };
  const up = (e: KeyboardEvent): void => {
    state.keys.delete(e.code);
  };
  const move = (e: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }
    state.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    state.mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;
  };
  const md = (e: MouseEvent): void => {
    state.mouseDown = true;
    move(e);
  };
  const mu = (): void => {
    state.mouseDown = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('mousemove', move);
  canvas.addEventListener('mousedown', md);
  window.addEventListener('mouseup', mu);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('mousemove', move);
    canvas.removeEventListener('mousedown', md);
    window.removeEventListener('mouseup', mu);
  };
}

export function readKeyboardMouseIntent(
  state: KeyboardMouseState,
  playerScreenX: number,
  playerScreenY: number,
): InputIntent {
  const intent = emptyIntent();
  let sx = 0;
  let sy = 0;
  if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) sy -= 1;
  if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) sy += 1;
  if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) sx -= 1;
  if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) sx += 1;
  intent.move = mergeScreenMove(sx, sy);

  const dx = state.mouseX - playerScreenX;
  const dy = state.mouseY - playerScreenY;
  if (len(vec2(dx, dy)) > AIM_DEAD_PX) {
    intent.aim = screenDirectionToGrid(dx, dy);
    intent.aimFromMouse = true;
  } else {
    intent.aim = intent.move.x !== 0 || intent.move.y !== 0 ? intent.move : { x: 1, y: 0 };
  }

  intent.fireHeld = state.mouseDown || state.keys.has('KeyJ');
  intent.reloadPressed = state.keys.has('KeyR');
  intent.dashPressed = state.keys.has('Space');
  intent.grenadePressed = state.keys.has('KeyG');
  intent.cycleWeaponPressed = state.keys.has('KeyQ');
  intent.pausePressed = state.pauseEdge;
  intent.choose = state.chooseEdge;
  state.pauseEdge = false;
  state.chooseEdge = null;
  return intent;
}
