/**
 * Simple in-memory rate limiter for login attempts
 * Tracks login attempts per IP/email combination
 * For production, use Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5; // Max 5 attempts per window

/**
 * Check if an email/IP is rate limited
 */
export function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (!entry) {
    return false;
  }

  if (now > entry.resetAt) {
    // Window has expired
    loginAttempts.delete(identifier);
    return false;
  }

  return entry.count >= MAX_ATTEMPTS;
}

/**
 * Record a login attempt
 */
export function recordLoginAttempt(identifier: string): number {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    loginAttempts.set(identifier, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return 1;
  }

  entry.count++;
  return entry.count;
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export function resetLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

/**
 * Get remaining attempts
 */
export function getRemainingAttempts(identifier: string): number {
  const entry = loginAttempts.get(identifier);
  if (!entry) {
    return MAX_ATTEMPTS;
  }

  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(identifier);
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - entry.count);
}
