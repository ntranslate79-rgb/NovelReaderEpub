/**
 * Unit tests for CSRF token generation and validation
 */

import { generateCsrfToken, validateCsrfToken, getCsrfTokenAge } from "@/lib/csrf";

describe("CSRF Token Utilities", () => {
  describe("generateCsrfToken", () => {
    it("should generate a valid token", () => {
      const token = generateCsrfToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should generate different tokens on each call", () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("validateCsrfToken", () => {
    it("should validate a freshly generated token", () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token)).toBe(true);
    });

    it("should reject an invalid token", () => {
      expect(validateCsrfToken("invalid-token")).toBe(false);
      expect(validateCsrfToken("")).toBe(false);
      expect(validateCsrfToken("aGVsbG8gd29ybGQ=")).toBe(false);
    });

    it("should accept a token within the valid window", () => {
      const token = generateCsrfToken();
      // Token should be valid immediately after generation
      expect(validateCsrfToken(token, 3600000)).toBe(true);
    });

    it("should reject a token outside the valid window", () => {
      const token = generateCsrfToken();
      // Token should be invalid if maxAge is 0
      expect(validateCsrfToken(token, 0)).toBe(false);
    });
  });

  describe("getCsrfTokenAge", () => {
    it("should return age of a valid token", () => {
      const token = generateCsrfToken();
      const age = getCsrfTokenAge(token);
      expect(age).toBeDefined();
      expect(typeof age).toBe("number");
      expect(age).toBeGreaterThanOrEqual(0);
      expect(age).toBeLessThan(100); // Should be very recent
    });

    it("should return null for invalid token", () => {
      expect(getCsrfTokenAge("invalid")).toBeNull();
      expect(getCsrfTokenAge("")).toBeNull();
    });

    it("should increase over time", async () => {
      const token = generateCsrfToken();
      const age1 = getCsrfTokenAge(token);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      const age2 = getCsrfTokenAge(token);
      expect(age1).not.toBeNull();
      expect(age2).not.toBeNull();
      expect(age2).toBeGreaterThan(age1!);
    });
  });
});
