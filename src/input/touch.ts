import { mergeScreenMove, screenDirectionToGrid } from './keyboardMouse.ts';
import { emptyIntent, type InputIntent } from './intent.ts';

export interface TouchStick {
  active: boolean;
  cx: number;
  cy: number;
  x: number;
  y: number;
}

export interface TouchState {
  move: TouchStick;
  aim: TouchStick;
  fireHeld: boolean;
  dashPressed: boolean;
  pausePressed: boolean;
}

export function createTouchState(): TouchState {
  const idle = (): TouchStick => ({ active: false, cx: 0, cy: 0, x: 0, y: 0 });
  return { move: idle(), aim: idle(), fireHeld: false, dashPressed: false, pausePressed: false };
}

const DEAD = 0.15;

let touchStickRadius = 96;
let touchLeftHanded = false;

export function configureTouchLayout(settings: { stickSize: number; leftHanded: boolean }): void {
  touchStickRadius = settings.stickSize;
  touchLeftHanded = settings.leftHanded;
}

function stickVector(stick: TouchStick): { x: number; y: number } {
  if (!stick.active) return { x: 0, y: 0 };
  const dx = stick.x - stick.cx;
  const dy = stick.y - stick.cy;
  const l = Math.hypot(dx, dy);
  if (l < 8) return { x: 0, y: 0 };
  const clamped = Math.min(l, touchStickRadius) / touchStickRadius;
  return { x: (dx / l) * clamped, y: (dy / l) * clamped };
}

export function bindTouchControls(canvas: HTMLCanvasElement, state: TouchState): () => void {
  const half = window.innerWidth / 2;
  let moveId: number | null = null;
  let aimId: number | null = null;

  const start = (t: Touch): void => {
    const moveSide = touchLeftHanded ? t.clientX >= half : t.clientX < half;
    if (moveSide) {
      moveId = t.identifier;
      state.move.active = true;
      state.move.cx = t.clientX;
      state.move.cy = t.clientY;
      state.move.x = t.clientX;
      state.move.y = t.clientY;
    } else {
      aimId = t.identifier;
      state.aim.active = true;
      state.aim.cx = t.clientX;
      state.aim.cy = t.clientY;
      state.aim.x = t.clientX;
      state.aim.y = t.clientY;
    }
  };

  const move = (t: Touch): void => {
    if (t.identifier === moveId) {
      state.move.x = t.clientX;
      state.move.y = t.clientY;
    }
    if (t.identifier === aimId) {
      state.aim.x = t.clientX;
      state.aim.y = t.clientY;
    }
  };

  const end = (t: Touch): void => {
    if (t.identifier === moveId) {
      moveId = null;
      state.move.active = false;
    }
    if (t.identifier === aimId) {
      aimId = null;
      state.aim.active = false;
      state.fireHeld = false;
    }
  };

  const onStart = (e: TouchEvent): void => {
    e.preventDefault();
    for (const t of e.changedTouches) start(t);
  };
  const onMove = (e: TouchEvent): void => {
    e.preventDefault();
    for (const t of e.changedTouches) move(t);
  };
  const onEnd = (e: TouchEvent): void => {
    for (const t of e.changedTouches) end(t);
  };

  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onEnd);
  canvas.addEventListener('touchcancel', onEnd);
  return () => {
    canvas.removeEventListener('touchstart', onStart);
    canvas.removeEventListener('touchmove', onMove);
    canvas.removeEventListener('touchend', onEnd);
    canvas.removeEventListener('touchcancel', onEnd);
  };
}

export function readTouchIntent(state: TouchState): InputIntent {
  const intent = emptyIntent();
  const mv = stickVector(state.move);
  intent.move = mergeScreenMove(mv.x, mv.y);
  const av = stickVector(state.aim);
  if (Math.hypot(av.x, av.y) > DEAD) {
    intent.aim = screenDirectionToGrid(av.x, av.y);
    intent.fireHeld = true;
  } else if (intent.move.x !== 0 || intent.move.y !== 0) {
    intent.aim = intent.move;
  }
  return intent;
}
