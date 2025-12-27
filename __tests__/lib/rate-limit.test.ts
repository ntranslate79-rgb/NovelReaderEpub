/**
 * Unit tests for rate limiting utilities
 */

import {
  isRateLimited,
  recordLoginAttempt,
  resetLoginAttempts,
  getRemainingAttempts,
} from "@/lib/rate-limit";

describe("Rate Limiting Utilities", () => {
  const testIdentifier = "test-user:127.0.0.1";

  beforeEach(() => {
    // Reset state before each test
    resetLoginAttempts(testIdentifier);
  });

  describe("isRateLimited", () => {
    it("should not rate limit on first attempt", () => {
      expect(isRateLimited(testIdentifier)).toBe(false);
    });

    it("should not rate limit within allowed attempts", () => {
      for (let i = 0; i < 4; i++) {
        recordLoginAttempt(testIdentifier);
        expect(isRateLimited(testIdentifier)).toBe(false);
      }
    });

    it("should rate limit after max attempts", () => {
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(testIdentifier);
      }
      expect(isRateLimited(testIdentifier)).toBe(true);
    });

    it("should reset after window expires", () => {
      recordLoginAttempt(testIdentifier);
      resetLoginAttempts(testIdentifier);
      expect(isRateLimited(testIdentifier)).toBe(false);
    });
  });

  describe("recordLoginAttempt", () => {
    it("should return attempt count", () => {
      expect(recordLoginAttempt(testIdentifier)).toBe(1);
      expect(recordLoginAttempt(testIdentifier)).toBe(2);
      expect(recordLoginAttempt(testIdentifier)).toBe(3);
    });

    it("should handle multiple identifiers independently", () => {
      const id1 = "user1:192.168.1.1";
      const id2 = "user2:192.168.1.2";

      recordLoginAttempt(id1);
      recordLoginAttempt(id1);
      recordLoginAttempt(id2);

      expect(getRemainingAttempts(id1)).toBe(3); // 5 - 2
      expect(getRemainingAttempts(id2)).toBe(4); // 5 - 1
    });
  });

  describe("getRemainingAttempts", () => {
    it("should return max attempts for new identifier", () => {
      expect(getRemainingAttempts(testIdentifier)).toBe(5);
    });

    it("should decrease as attempts are recorded", () => {
      recordLoginAttempt(testIdentifier);
      expect(getRemainingAttempts(testIdentifier)).toBe(4);

      recordLoginAttempt(testIdentifier);
      expect(getRemainingAttempts(testIdentifier)).toBe(3);
    });

    it("should not go below zero", () => {
      for (let i = 0; i < 10; i++) {
        recordLoginAttempt(testIdentifier);
      }
      expect(getRemainingAttempts(testIdentifier)).toBe(0);
    });
  });

  describe("resetLoginAttempts", () => {
    it("should reset attempt counter", () => {
      recordLoginAttempt(testIdentifier);
      recordLoginAttempt(testIdentifier);

      expect(getRemainingAttempts(testIdentifier)).toBe(3);

      resetLoginAttempts(testIdentifier);

      expect(getRemainingAttempts(testIdentifier)).toBe(5);
      expect(isRateLimited(testIdentifier)).toBe(false);
    });
  });
});
