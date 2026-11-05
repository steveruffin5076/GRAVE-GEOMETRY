import { describe, expect, it } from 'vitest';
import { createObjectPool, type PooledItem } from '../src/core/objectPool.ts';

interface TestEntity extends PooledItem {
  id: number;
  value: number;
}

describe('objectPool', () => {
  it('acquire and release recycle instances', () => {
    let created = 0;
    const pool = createObjectPool<TestEntity>(
      4,
      () => {
        created++;
        return { active: false, id: created, value: 0 };
      },
      (e) => {
        e.value = 0;
      },
    );

    const a = pool.acquire();
    a.value = 10;
    expect(pool.activeCount()).toBe(1);
    pool.release(a);
    expect(pool.activeCount()).toBe(0);
    expect(created).toBe(4);

    const b = pool.acquire();
    expect(b).toBe(a);
    expect(b.value).toBe(0);
  });

  it('throws when exhausted', () => {
    const pool = createObjectPool<TestEntity>(
      1,
      () => ({ active: false, id: 1, value: 0 }),
      () => undefined,
    );
    pool.acquire();
    expect(() => pool.acquire()).toThrow(/exhausted/);
  });
});
