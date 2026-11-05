import type { ColourBlindMode } from '../persistence/storage.ts';
import { PALETTE } from '../config/palette.ts';

export interface AccentColours {
  player: string;
  hazard: string;
  xp: string;
}

const DEFAULT: AccentColours = {
  player: PALETTE.player2,
  hazard: PALETTE.hazard2,
  xp: PALETTE.acid2,
};

export function accentColours(mode: ColourBlindMode): AccentColours {
  if (mode === 'off') return DEFAULT;
  if (mode === 'protan') {
    return { player: PALETTE.ui3, hazard: PALETTE.ui2, xp: PALETTE.concrete3 };
  }
  if (mode === 'deutan') {
    return { player: PALETTE.ui2, hazard: PALETTE.rust2, xp: PALETTE.concrete2 };
  }
  return { player: PALETTE.rust2, hazard: PALETTE.ui3, xp: PALETTE.concrete3 };
}
