function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function createRateLimiter(intervalMs: number): { acquire(): Promise<void> } {
  let nextAvailable = 0;

  return {
    async acquire() {
      const slot = Math.max(performance.now(), nextAvailable);
      nextAvailable = slot + intervalMs;
      while (performance.now() < slot) {
        await sleep(slot - performance.now());
      }
    }
  };
}
