import Phaser from 'phaser';
import { initPlatformCaps } from './config/platform.ts';
import { PHASER_GAME_CONFIG } from './config/phaserConfig.ts';
import { GameScene } from './render/GameScene.ts';

initPlatformCaps();

const parent = document.getElementById('game-root');

const game = new Phaser.Game({
  ...PHASER_GAME_CONFIG,
  parent: parent ?? undefined,
  scene: [GameScene],
});

export { game };
