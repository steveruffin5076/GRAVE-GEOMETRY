import { describe, expect, it } from 'vitest';
import { mergeScreenMove, screenDirectionToGrid, aimFromScreenDelta } from '../src/input/keyboardMouse.ts';
import { mapDrawToViewport, cameraAimAnchor } from '../src/core/math/viewport.ts';
import { readGamepadIntent, type GamepadState } from '../src/input/gamepad.ts';
import { readTouchIntent, type TouchState } from '../src/input/touch.ts';
import { applyFireMode } from '../src/input/inputManager.ts';
import { emptyIntent } from '../src/input/intent.ts';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  settingsStorageRoundTrip,
} from '../src/persistence/storage.ts';

describe('input', () => {
  it('maps screen WASD to the same grid vector for keyboard and gamepad', () => {
    const kb = mergeScreenMove(0, -1);
    const gpState: GamepadState = {
      connected: true,
      moveX: 0,
      moveY: -1,
      aimX: 0,
      aimY: 0,
      fireHeld: false,
      dashPressed: false,
      pausePressed: false,
      pauseWasDown: false,
    };
    const gp = readGamepadIntent(gpState).move;
    expect(kb.x).toBeCloseTo(gp.x, 5);
    expect(kb.y).toBeCloseTo(gp.y, 5);
  });

  it('maps touch stick like screen-space input', () => {
    const touch: TouchState = {
      move: { active: true, cx: 0, cy: 0, x: 0, y: -80 },
      aim: { active: false, cx: 0, cy: 0, x: 0, y: 0 },
      fireHeld: false,
      dashPressed: false,
      pausePressed: false,
    };
    const tMove = readTouchIntent(touch).move;
    const kb = mergeScreenMove(0, -1);
    expect(tMove.x).toBeCloseTo(kb.x, 2);
    expect(tMove.y).toBeCloseTo(kb.y, 2);
  });

  it('screenDirectionToGrid normalizes screen deltas', () => {
    const east = screenDirectionToGrid(1, 0);
    expect(Math.hypot(east.x, east.y)).toBeCloseTo(1, 5);
    expect(east.x).toBeCloseTo(Math.SQRT1_2, 3);
    expect(east.y).toBeCloseTo(-Math.SQRT1_2, 3);
  });

  it('aimFromScreenDelta keeps previous aim inside dead zone', () => {
    const prev = { x: 0.2, y: 0.98 };
    const next = aimFromScreenDelta(1, 0, prev);
    expect(next).toEqual(prev);
    const fresh = aimFromScreenDelta(40, -10, prev);
    expect(Math.hypot(fresh.x, fresh.y)).toBeCloseTo(1, 5);
  });

  it('cameraAimAnchor is view center for follow camera', () => {
    const a = cameraAimAnchor(1201, 700);
    expect(a.x).toBe(600.5);
    expect(a.y).toBe(350);
  });

  it('mapDrawToViewport converts scroll/zoom for mouse aim', () => {
    const view = mapDrawToViewport(1000, 800, 900, 700, 1);
    expect(view.x).toBe(100);
    expect(view.y).toBe(100);
    const aim = screenDirectionToGrid(150 - view.x, 80 - view.y);
    expect(Math.hypot(aim.x, aim.y)).toBeCloseTo(1, 5);
  });

  it('applyFireMode respects manual vs auto', () => {
    const intent = emptyIntent();
    intent.fireHeld = true;
    applyFireMode(intent, 'manual', true);
    expect(intent.fire).toBe(true);
    applyFireMode(intent, 'auto', false);
    expect(intent.fire).toBe(false);
    applyFireMode(intent, 'auto', true);
    expect(intent.fire).toBe(true);
  });

  it('persists fireMode across storage round-trip', () => {
    const s = { ...DEFAULT_SETTINGS, fireMode: 'auto' as const };
    saveSettings(s);
    const loaded = loadSettings('manual');
    expect(loaded.fireMode).toBe('auto');
    const rt = settingsStorageRoundTrip({ ...DEFAULT_SETTINGS, fireMode: 'manual' });
    expect(rt.fireMode).toBe('manual');
  });
});
