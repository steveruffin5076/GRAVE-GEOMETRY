import Phaser from 'phaser';
import { BACKGROUND_COLOUR } from '../config/palette.ts';
import { TILE_W } from '../config/constants.ts';
import { advanceFixedStep, createFixedStepAccumulator } from '../core/fixedStep.ts';
import { playSfx, unlockAudio, bindSfxSettings, isAudioUnlocked } from '../audio/sfx.ts';
import { startMusic, updateMusicVolume, unlockMusic } from '../audio/music.ts';
import { shakeOnHit, shakeOnWave } from './cameraJuice.ts';
import { LightingRenderer } from './lighting.ts';
import { WaveAnnouncer } from '../ui/WaveAnnouncer.ts';
import { effectiveQuality, resolveJuiceCaps } from './visualSettings.ts';
import { isMobilePlatform } from '../config/platform.ts';
import { applyBalanceToPlayer, resumeFromPause, simulationStep } from '../game/simulation.ts';
import { createRunState, type PresentationEvent, type RunState } from '../game/state.ts';
import { getEffectiveWeaponDef } from '../game/weapons.ts';
import { parseMap } from '../game/map.ts';
import { bindKeyboardMouse, syncPointerFromPhaser } from '../input/keyboardMouse.ts';
import { aimFromCameraPointer } from './aimFromPointer.ts';
import { emptyIntent, type InputIntent } from '../input/intent.ts';
import {
  createInputManager,
  defaultFireModeForPlatform,
  pollInput,
  toggleFireMode,
} from '../input/inputManager.ts';
import { bindTouchControls, configureTouchLayout } from '../input/touch.ts';
import {
  isNewPersonalBest,
  loadPersonalBest,
  loadSettings,
  mergePersonalBest,
  saveSettings,
  type RunSummary,
} from '../persistence/storage.ts';
import { Hud } from '../ui/Hud.ts';
import { UpgradeModal } from '../ui/UpgradeModal.ts';
import { SettingsPanel } from '../ui/SettingsPanel.ts';
import { PauseOverlay } from '../ui/PauseOverlay.ts';
import { GameOverScreen } from '../ui/GameOverScreen.ts';
import { bindResponsiveLayout, type LayoutMode } from '../ui/layout.ts';
import { bindResponsiveScale, setupMapCamera, applyIntegerGameScale } from './cameraControls.ts';
import { drawWorldEntities, playerScreenPosition, PLAYER_RENDER_DEPTH } from './entityRenderer.ts';
import { FxRenderer } from './fxRenderer.ts';
import { renderMapToScene } from './tileRenderer.ts';

function isDebugUrl(): boolean {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

export class GameScene extends Phaser.Scene {
  private debugText: Phaser.GameObjects.Text | null = null;
  private parsedMap = parseMap();
  private runState!: RunState;
  private stepAcc = createFixedStepAccumulator();
  private playerGfx!: Phaser.GameObjects.Graphics;
  private followZone!: Phaser.GameObjects.Zone;
  private hud!: Hud;
  private upgradeModal!: UpgradeModal;
  private settingsPanel!: SettingsPanel;
  private pauseOverlay!: PauseOverlay;
  private gameOverScreen!: GameOverScreen;
  private layoutMode: LayoutMode = 'landscape';
  private gameOverCommitted = false;
  private unbindLayout: (() => void) | null = null;
  private autoPauseEnabled = false;
  private userPaused = false;
  private fx!: FxRenderer;
  private lighting!: LightingRenderer;
  private waveAnnouncer!: WaveAnnouncer;
  private inputMgr!: ReturnType<typeof createInputManager>;
  private unbindInput: (() => void) | null = null;
  private framePresentation: PresentationEvent[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const taglineEl = document.getElementById('boot-tagline');
    if (taglineEl) taglineEl.style.display = 'none';

    void import('../ui/styles.css');

    this.cameras.main.setBackgroundColor(BACKGROUND_COLOUR);
    this.cameras.main.setRoundPixels(true);

    const parsed = this.parsedMap;
    renderMapToScene(this, parsed);

    this.runState = createRunState({
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: parsed.grid.width,
      mapHeight: parsed.grid.height,
    });
    applyBalanceToPlayer(this.runState);

    const settings = loadSettings(defaultFireModeForPlatform());
    configureTouchLayout(settings);
    this.inputMgr = createInputManager(settings);

    bindSfxSettings(settings);

    const canvas = this.game.canvas;
    const unlock = (): void => {
      unlockAudio();
      unlockMusic();
      startMusic(this.inputMgr.settings);
      canvas.removeEventListener('pointerdown', unlock);
    };
    canvas.addEventListener('pointerdown', unlock);

    this.unbindInput = bindKeyboardMouse(canvas, this.inputMgr.keyboard);
    this.unbindInput = chainUnbind(this.unbindInput, bindTouchControls(canvas, this.inputMgr.touch));

    this.fx = new FxRenderer(this);
    this.lighting = new LightingRenderer(this);
    this.waveAnnouncer = new WaveAnnouncer();
    this.hud = new Hud();
    this.pauseOverlay = new PauseOverlay();
    this.gameOverScreen = new GameOverScreen();
    this.settingsPanel = new SettingsPanel();
    this.upgradeModal = new UpgradeModal();
    this.upgradeModal.bindPick((slot) => {
      const intent = emptyIntent();
      intent.choose = slot;
      simulationStep(this.runState, intent, 0);
      this.syncUi();
      this.upgradeModal.sync(this.runState);
    });
    this.settingsPanel.bindChange((s) => {
      this.inputMgr.settings = s;
      saveSettings(s);
      configureTouchLayout(s);
      bindSfxSettings(s);
      updateMusicVolume(s);
      this.fx.configure(s);
      const q = effectiveQuality(s.quality, isMobilePlatform());
      this.lighting.setEnabled(resolveJuiceCaps(q, isMobilePlatform()).lightPools);
    });
    this.pauseOverlay.bindHandlers({
      resume: () => {
        this.toggleUserPause(false);
      },
      settings: () => this.settingsPanel.open(this.inputMgr.settings),
      restart: () => this.restartRun(),
      menu: () => {
        window.location.reload();
      },
    });
    this.gameOverScreen.bindHandlers({
      restart: () => this.restartRun(),
      menu: () => window.location.reload(),
    });
    this.hud.bindSettings(() => this.settingsPanel.open(this.inputMgr.settings));
    this.hud.bindPause(() => {
      this.toggleUserPause();
    });
    this.hud.bindFireToggle(() => {
      toggleFireMode(this.inputMgr);
      saveSettings(this.inputMgr.settings);
      this.syncUi();
    });

    this.playerGfx = this.add.graphics().setDepth(PLAYER_RENDER_DEPTH);
    const scr = playerScreenPosition(this.runState.player);
    this.followZone = this.add.zone(scr.x, scr.y, 1, 1);
    setupMapCamera(
      this,
      this.runState.player.x,
      this.runState.player.y,
      parsed.grid.width * TILE_W,
      parsed.grid.height * TILE_W,
      this.followZone,
    );
    bindResponsiveScale(this.game, this, () => this.layoutMode);
    this.unbindLayout = bindResponsiveLayout((mode) => {
      this.layoutMode = mode;
      applyIntegerGameScale(this.cameras.main, mode);
    });

    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.onBlur);
    this.game.canvas.addEventListener(
      'pointerdown',
      () => {
        this.autoPauseEnabled = true;
      },
      { once: true },
    );
    window.setTimeout(() => {
      this.autoPauseEnabled = true;
    }, 400);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.onVisibility);
      window.removeEventListener('blur', this.onBlur);
      this.unbindInput?.();
      this.unbindLayout?.();
    });

    if (isDebugUrl()) {
      this.debugText = this.add
        .text(8, 8, '', {
          fontFamily: 'ui-monospace, monospace',
          fontSize: '10px',
          color: '#e6edf5',
          backgroundColor: '#121722',
        })
        .setScrollFactor(0)
        .setDepth(1000);
    }

    this.syncUi();
    this.upgradeModal.sync(this.runState);
    if (this.runState.phase === 'PAUSED' && !this.userPaused) {
      this.runState.phase = 'PLAYING';
      this.syncUi();
    }
    this.fx.configure(this.inputMgr.settings);
    this.lighting.setEnabled(
      resolveJuiceCaps(
        effectiveQuality(this.inputMgr.settings.quality, isMobilePlatform()),
        isMobilePlatform(),
      ).lightPools,
    );
  }

  private onVisibility = (): void => {
    if (!this.autoPauseEnabled) return;
    if (document.hidden && this.runState.phase === 'PLAYING') {
      this.userPaused = false;
      this.runState.phase = 'PAUSED';
      this.syncUi();
    }
  };

  private onBlur = (): void => {
    if (!this.autoPauseEnabled) return;
    if (document.visibilityState !== 'visible') return;
    if (this.runState.phase === 'PLAYING') {
      this.userPaused = false;
      this.runState.phase = 'PAUSED';
      this.syncUi();
    }
  };

  /** @param toPaused true = pause, false = resume, undefined = toggle */
  private toggleUserPause(toPaused?: boolean): void {
    if (this.runState.phase !== 'PLAYING' && this.runState.phase !== 'PAUSED') return;
    const wantPause = toPaused ?? this.runState.phase === 'PLAYING';
    if (wantPause) {
      this.userPaused = true;
      this.runState.phase = 'PAUSED';
    } else {
      this.userPaused = false;
      resumeFromPause(this.runState);
    }
    this.syncUi();
  }

  private handlePauseInput(intent: InputIntent): void {
    if (!intent.pausePressed) return;
    this.toggleUserPause();
  }

  private restartRun(): void {
    const parsed = this.parsedMap;
    this.stepAcc = createFixedStepAccumulator();
    this.runState = createRunState({
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: parsed.grid.width,
      mapHeight: parsed.grid.height,
    });
    applyBalanceToPlayer(this.runState);
    this.gameOverCommitted = false;
    this.gameOverScreen.close();
    this.pauseOverlay.setVisible(false);
    this.syncUi();
  }

  private runSummary(): RunSummary {
    return {
      time: this.runState.time,
      wave: this.runState.wave,
      level: this.runState.level,
      kills: this.runState.kills,
      score: this.runState.score,
      damageDealt: this.runState.damageDealt,
      damageTaken: this.runState.damageTaken,
      peakCombo: this.runState.peakCombo,
      seed: this.runState.seed,
    };
  }

  private syncUi(): void {
    this.syncHud();
    const paused = this.runState.phase === 'PAUSED' && !this.settingsPanel.isOpen();
    this.pauseOverlay.setVisible(paused);

    if (this.runState.phase === 'GAME_OVER' && !this.gameOverCommitted) {
      this.gameOverCommitted = true;
      const prev = loadPersonalBest();
      const summary = this.runSummary();
      const newBest = isNewPersonalBest(prev, summary);
      const best = mergePersonalBest(prev, summary);
      const killsByVariant: Record<string, number> = {};
      for (const [k, v] of Object.entries(this.runState.killsByVariant)) {
        if (v !== undefined) killsByVariant[k] = v;
      }
      this.gameOverScreen.show({
        summary,
        best,
        newBest,
        killsByVariant,
      });
    }
  }

  private syncHud(): void {
    const def = getEffectiveWeaponDef(this.runState, this.runState.weapon.id);
    const reloadProgress =
      def.reloadTime > 0 && this.runState.weapon.reloadTimer > 0
        ? 1 - this.runState.weapon.reloadTimer / def.reloadTime
        : 0;
    this.hud.update({
      hp: this.runState.player.hp,
      maxHp: this.runState.player.maxHp,
      dashCharges: this.runState.player.dashCharges,
      phase: this.runState.phase,
      fireMode: this.inputMgr.settings.fireMode,
      ammo: this.runState.weapon.ammoInMag,
      mag: def.magSize,
      reloading: this.runState.weapon.reloadTimer > 0,
      reloadProgress,
      wave: this.runState.wave,
      waveTime: this.runState.time,
      level: this.runState.level,
      xp: this.runState.xp,
      xpNext: this.runState.xpNext,
      kills: this.runState.kills,
      score: this.runState.score,
      weaponId: this.runState.weapon.id,
      activeAmmo: this.runState.activeAmmo,
    });
  }

  override update(_time: number, deltaMs: number): void {
    const dtFrame = deltaMs / 1000;
    const cam = this.cameras.main;
    const ptr = this.input.activePointer;
    syncPointerFromPhaser(this.inputMgr.keyboard, ptr.x, ptr.y, ptr.isDown);
    const pView = { x: cam.width * 0.5, y: cam.height * 0.5 };
    const intent = pollInput(this.inputMgr, pView.x, pView.y, this.runState.phase === 'PLAYING');
    intent.aim = aimFromCameraPointer(
      cam,
      ptr.x,
      ptr.y,
      this.runState.player.x,
      this.runState.player.y,
      this.runState.player.aim,
    );
    intent.aimFromMouse = true;

    this.handlePauseInput(intent);

    this.framePresentation = [];
    if (this.runState.phase === 'LEVEL_UP') {
      if (intent.choose !== null) {
        simulationStep(this.runState, intent, 0);
        this.framePresentation.push(...this.runState.presentation);
      }
    } else {
      const { steps } = advanceFixedStep(this.stepAcc, this.runState.phase === 'PLAYING' ? dtFrame : 0);
      for (let i = 0; i < steps; i++) {
        simulationStep(this.runState, intent, 1 / 60);
        this.framePresentation.push(...this.runState.presentation);
      }
    }

    for (const e of this.framePresentation) {
      if (e.type === 'shot') playSfx('shot');
      if (e.type === 'hit') {
        playSfx('hit');
        shakeOnHit(this.cameras.main, this.inputMgr.settings, e.damage);
      }
      if (e.type === 'reload') playSfx('reload');
      if (e.type === 'levelUp') {
        playSfx('levelUp');
        this.hud.announce(`Level ${e.level}`);
      }
      if (e.type === 'kill') playSfx('kill');
      if (e.type === 'playerHurt') playSfx('hurt');
      if (e.type === 'explosion') playSfx('explosion');
      if (e.type === 'waveStart') {
        playSfx('waveStart');
        shakeOnWave(this.cameras.main, this.inputMgr.settings);
        this.waveAnnouncer.announceWave(e.wave);
      }
    }
    this.fx.configure(this.inputMgr.settings);
    this.fx.ingest(this.framePresentation);
    this.fx.trackBullets(this.runState.bullets);
    this.fx.update(dtFrame);

    this.lighting.draw(this.runState);
    drawWorldEntities(this.playerGfx, this.runState);
    const scr = playerScreenPosition(this.runState.player);
    this.followZone.setPosition(scr.x, scr.y);
    this.syncUi();
    this.upgradeModal.sync(this.runState);

    if (this.debugText !== null) {
      const w = window as Window & { __GRAVE_GEOMETRY__?: object };
      w.__GRAVE_GEOMETRY__ = {
        state: this.runState,
        settings: this.inputMgr.settings,
        mouse: {
          x: this.inputMgr.keyboard.mouseX,
          y: this.inputMgr.keyboard.mouseY,
        },
        juice: this.fx.getPoolCounts(),
        audioUnlocked: isAudioUnlocked(),
      };
      const alive = this.runState.zombies.filter((z) => z.active && z.state !== 'DYING').length;
      this.debugText.setText(
        [
          `debug fps=${Math.round(this.game.loop.actualFps)}`,
          `wave=${this.runState.wave} lvl=${this.runState.level}`,
          `zombies=${alive}/${this.runState.zombies.length}`,
          `deferred=${this.runState.spawn.deferredSpawns}`,
          `dps=${Math.round(this.runState.combatDps)}`,
          `kills=${this.runState.kills}`,
        ].join(' '),
      );
    }
  }
}

function chainUnbind(a: () => void, b: () => void): () => void {
  return () => {
    a();
    b();
  };
}
