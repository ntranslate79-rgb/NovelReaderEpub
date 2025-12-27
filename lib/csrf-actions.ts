import { generateCsrfToken, validateCsrfToken } from "@/lib/csrf";

/**
 * Wraps a server action with CSRF validation
 * @param action - The server action to wrap
 * @param csrfToken - The CSRF token from the form
 */
export async function validateAndExecuteAction<T>(
  action: () => Promise<T>,
  csrfToken: string | undefined
): Promise<T> {
  if (!csrfToken || !validateCsrfToken(csrfToken)) {
    throw new Error("Invalid or expired CSRF token. Please refresh and try again.");
  }

  return action();
}

/**
 * Create a server action that validates CSRF automatically
 */
export function createCsrfProtectedAction<TInput, TOutput>(
  handler: (input: TInput) => Promise<TOutput>
) {
  return async (formData: FormData): Promise<TOutput> => {
    const csrfToken = formData.get("_csrf");

    if (!csrfToken || typeof csrfToken !== "string") {
      throw new Error("Missing CSRF token");
    }

    if (!validateCsrfToken(csrfToken)) {
      throw new Error("Invalid or expired CSRF token");
    }

    // Remove CSRF token from formData before passing to handler
    formData.delete("_csrf");

    // Parse remaining form data
    const input = Object.fromEntries(formData) as TInput;

    return handler(input);
  };
}

/**
 * Export token generator for use in client components
 */
export { generateCsrfToken };
