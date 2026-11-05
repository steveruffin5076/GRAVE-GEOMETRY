export interface PooledItem {
  active: boolean;
}

export interface ObjectPool<T extends PooledItem> {
  acquire: () => T;
  release: (item: T) => void;
  activeCount: () => number;
  totalCount: () => number;
}

export function createObjectPool<T extends PooledItem>(
  capacity: number,
  factory: () => T,
  reset: (item: T) => void,
): ObjectPool<T> {
  const free: T[] = [];
  const all: T[] = [];

  for (let i = 0; i < capacity; i++) {
    const item = factory();
    item.active = false;
    all.push(item);
    free.push(item);
  }

  return {
    acquire(): T {
      const item = free.pop();
      if (item === undefined) {
        throw new Error('objectPool: exhausted');
      }
      item.active = true;
      reset(item);
      return item;
    },
    release(item: T): void {
      if (!item.active) return;
      item.active = false;
      reset(item);
      free.push(item);
    },
    activeCount(): number {
      return all.length - free.length;
    },
    totalCount(): number {
      return all.length;
    },
  };
}
