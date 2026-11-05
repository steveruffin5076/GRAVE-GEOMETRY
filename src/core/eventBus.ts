export type GameEventMap = {
  shot: { weaponId: string };
  hit: { targetId: number; damage: number };
  kill: { variantId: string; targetId: number };
  explosion: { x: number; y: number; radius: number };
  levelUp: { level: number; pending: number };
  playerHurt: { damage: number };
  pickup: { xp: number };
  waveStart: { wave: number };
  upgradeApplied: { upgradeId: string; rank: number };
  gameOver: { reason: string };
};

export type GameEventName = keyof GameEventMap;

type Listener<K extends GameEventName> = (payload: GameEventMap[K]) => void;

export interface EventBus {
  on: <K extends GameEventName>(event: K, listener: Listener<K>) => () => void;
  emit: <K extends GameEventName>(event: K, payload: GameEventMap[K]) => void;
  clear: () => void;
}

export function createEventBus(): EventBus {
  const listeners = new Map<GameEventName, Set<Listener<GameEventName>>>();

  function getSet<K extends GameEventName>(event: K): Set<Listener<K>> {
    let set = listeners.get(event) as Set<Listener<K>> | undefined;
    if (set === undefined) {
      set = new Set();
      listeners.set(event, set as Set<Listener<GameEventName>>);
    }
    return set;
  }

  return {
    on<K extends GameEventName>(event: K, listener: Listener<K>): () => void {
      const set = getSet(event);
      set.add(listener as Listener<GameEventName>);
      return () => {
        set.delete(listener as Listener<GameEventName>);
      };
    },
    emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): void {
      const set = listeners.get(event);
      if (set === undefined) return;
      for (const fn of set) {
        fn(payload as GameEventMap[GameEventName]);
      }
    },
    clear(): void {
      listeners.clear();
    },
  };
}
