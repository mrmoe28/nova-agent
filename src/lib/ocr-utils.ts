/**
 * OCR Utility Functions
 * Provides retry logic, timeout handling, and error recovery for OCR operations
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface TimeoutOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryableErrors = [
      "ETIMEDOUT",
      "ECONNRESET",
      "ENOTFOUND",
      "ECONNREFUSED",
      "timeout",
      "network",
      "connection",
    ],
  } = options;

  let lastError: Error | unknown;
  let delay = baseDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const isRetryable = retryableErrors.some((retryableError) =>
        errorMessage.includes(retryableError.toLowerCase())
      );

      if (!isRetryable) {
        // Not a retryable error, throw immediately
        throw error;
      }

      // Calculate delay with exponential backoff
      const currentDelay = Math.min(delay, maxDelay);
      console.log(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${currentDelay}ms. Error: ${errorMessage}`
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      delay *= backoffMultiplier;
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Execute a function with a timeout
 * @param fn - Function to execute
 * @param options - Timeout configuration
 * @returns Result of the function
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  options: TimeoutOptions = {}
): Promise<T> {
  const {
    timeoutMs = 120000, // 2 minutes default
    timeoutMessage = "Operation timed out",
  } = options;

  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${timeoutMessage} after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Combine retry and timeout
 * @param fn - Function to execute
 * @param retryOptions - Retry configuration
 * @param timeoutOptions - Timeout configuration
 * @returns Result of the function
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  retryOptions: RetryOptions = {},
  timeoutOptions: TimeoutOptions = {}
): Promise<T> {
  return retryWithBackoff(
    () => withTimeout(fn, timeoutOptions),
    retryOptions
  );
}

/**
 * Check if an error is a network/connection error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("connection") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("enotfound") ||
    message.includes("econnrefused")
  );
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("quota")
  );
}

/**
 * Generate a user-friendly error message with actionable feedback
 */
export function generateErrorMessage(error: unknown, context: string): string {
  if (!(error instanceof Error)) {
    return `An unexpected error occurred during ${context}. Please try again.`;
  }

  const message = error.message.toLowerCase();

  if (isNetworkError(error)) {
    return `Network connection failed during ${context}. This may be due to a temporary network issue. Please check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.`;
  }

  if (isRateLimitError(error)) {
    return `Rate limit exceeded during ${context}. Please wait a few moments and try again.`;
  }

  if (message.includes("timeout")) {
    return `The ${context} operation took too long to complete. This may happen with large files. Please try with a smaller file or contact support if the issue persists.`;
  }

  if (message.includes("file") || message.includes("format")) {
    return `File processing error during ${context}. Please ensure your file is a valid PDF, image (JPG/PNG), or CSV file and try again.`;
  }

  if (message.includes("api key") || message.includes("authentication")) {
    return `Authentication error during ${context}. Please check your API configuration and try again.`;
  }

  // Generic error with context
  return `Error during ${context}: ${error.message}. Please try again or contact support if the problem persists.`;
}



