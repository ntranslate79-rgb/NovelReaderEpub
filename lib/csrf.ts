import crypto from "crypto";

/**
 * Generates a CSRF token from a timestamp and random bytes
 * Tokens expire after a set time window
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const token = `${timestamp}.${randomBytes}`;
  return Buffer.from(token).toString("base64");
}

/**
 * Validates a CSRF token
 * Checks expiration and basic format
 */
export function validateCsrfToken(
  token: string,
  maxAge: number = 3600000 // 1 hour default
): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [timestamp] = decoded.split(".");
    const age = Date.now() - parseInt(timestamp, 10);
    return age < maxAge && age >= 0;
  } catch {
    return false;
  }
}

/**
 * Extract timestamp from CSRF token
 */
export function getCsrfTokenAge(token: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [timestamp] = decoded.split(".");
    const parsedTimestamp = parseInt(timestamp, 10);
    if (isNaN(parsedTimestamp)) {
      return null;
    }
    return Date.now() - parsedTimestamp;
  } catch {
    return null;
  }
}
