import assert from "node:assert/strict";
import test from "node:test";

import { createRateLimiter } from "./throttle";

test("createRateLimiter spaces three sequential acquires by at least two intervals", async () => {
  const limiter = createRateLimiter(30);
  const start = performance.now();

  await limiter.acquire();
  await limiter.acquire();
  await limiter.acquire();

  const elapsed = performance.now() - start;
  assert.ok(elapsed >= 60, `expected three acquires to take >= 60ms, got ${elapsed.toFixed(2)}ms`);
});
