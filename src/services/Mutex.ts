export class Mutex {
  private promise: Promise<void> | null = null;

  async acquire(): Promise<() => void> {
    const previous = this.promise;
    let resolve: () => void;
    this.promise = new Promise((res) => {
      resolve = res;
    });

    if (previous) {
      await previous;
    }

    return resolve!;
  }

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export const storageMutex = new Mutex();
