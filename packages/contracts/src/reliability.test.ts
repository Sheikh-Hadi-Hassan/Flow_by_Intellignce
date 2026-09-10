import { describe, expect, it } from "vitest";
import {
  executeReliableProviderCall,
  ReliabilityError,
} from "./reliability.js";

describe("reliability retry policy", () => {
  it("retries bounded transient failures with one idempotency key", async () => {
    const attempts: Array<{ attempt: number; key: string }> = [];
    const delays: number[] = [];
    let clock = 10;
    const result = await executeReliableProviderCall({
      idempotencyKey: "delivery-1",
      policy: {
        timeoutMs: 100,
        maxAttempts: 3,
        initialDelayMs: 5,
        maxDelayMs: 10,
        backoffMultiplier: 2,
      },
      operation: ({ attempt, idempotencyKey }) => {
        attempts.push({ attempt, key: idempotencyKey });
        clock += 3;
        if (attempt < 3) {
          throw new ReliabilityError("NETWORK", "offline", true);
        }
        return Promise.resolve("delivered");
      },
      options: {
        now: () => clock,
        sleep: (delay) => {
          delays.push(delay);
          return Promise.resolve();
        },
      },
    });

    expect(result).toEqual({ value: "delivered", attempts: 3, latencyMs: 9 });
    expect(attempts).toEqual([
      { attempt: 1, key: "delivery-1" },
      { attempt: 2, key: "delivery-1" },
      { attempt: 3, key: "delivery-1" },
    ]);
    expect(delays).toEqual([5, 10]);
  });

  it("does not retry authentication, validation, or unknown failures", async () => {
    let attempts = 0;
    await expect(
      executeReliableProviderCall({
        idempotencyKey: "auth-1",
        operation: () => {
          attempts += 1;
          throw new ReliabilityError("AUTHENTICATION", "denied", false);
        },
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION", retryable: false });
    expect(attempts).toBe(1);
  });

  it("aborts and classifies provider timeouts", async () => {
    let aborted = false;
    await expect(
      executeReliableProviderCall({
        idempotencyKey: "timeout-1",
        policy: {
          timeoutMs: 5,
          maxAttempts: 1,
          initialDelayMs: 0,
          maxDelayMs: 0,
          backoffMultiplier: 1,
        },
        operation: ({ signal }) =>
          new Promise<never>((_, reject) => {
            signal.addEventListener("abort", () => {
              aborted = true;
              reject(new Error("aborted"));
            });
          }),
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT", retryable: true });
    expect(aborted).toBe(true);
  });

  it("rejects missing idempotency keys and unbounded policies", async () => {
    await expect(
      executeReliableProviderCall({
        idempotencyKey: " ",
        operation: () => Promise.resolve("never"),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      executeReliableProviderCall({
        idempotencyKey: "bounded",
        policy: {
          timeoutMs: 1,
          maxAttempts: 6,
          initialDelayMs: 0,
          maxDelayMs: 0,
          backoffMultiplier: 1,
        },
        operation: () => Promise.resolve("never"),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
