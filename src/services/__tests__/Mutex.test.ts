import { Mutex } from '../Mutex';

describe('Mutex', () => {
  it('acquire returns a release function', async () => {
    const mutex = new Mutex();
    const release = await mutex.acquire();
    expect(typeof release).toBe('function');
    release();
  });

  it('enforces serial execution under contention', async () => {
    const mutex = new Mutex();
    const order: number[] = [];

    const task = async (id: number) => {
      const release = await mutex.acquire();
      order.push(id);
      // Simulate async work
      await new Promise(r => setTimeout(r, 10));
      release();
    };

    // Both tasks start concurrently but should execute serially
    await Promise.all([task(1), task(2)]);

    expect(order).toEqual([1, 2]);
  });

  it('runExclusive runs callback and returns its value', async () => {
    const mutex = new Mutex();
    const result = await mutex.runExclusive(async () => 42);
    expect(result).toBe(42);
  });

  it('runExclusive releases lock even if callback throws', async () => {
    const mutex = new Mutex();

    await expect(
      mutex.runExclusive(async () => {
        throw new Error('oops');
      }),
    ).rejects.toThrow('oops');

    // Should still be acquirable after error
    const release = await mutex.acquire();
    expect(typeof release).toBe('function');
    release();
  });

  it('runExclusive enforces serial execution', async () => {
    const mutex = new Mutex();
    const order: number[] = [];

    const task = (id: number) =>
      mutex.runExclusive(async () => {
        order.push(id);
        await new Promise(r => setTimeout(r, 5));
      });

    await Promise.all([task(1), task(2), task(3)]);
    expect(order).toEqual([1, 2, 3]);
  });
});
