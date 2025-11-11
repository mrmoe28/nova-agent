import { createLogger } from "./logger";

const logger = createLogger("retry");

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  factor?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error,
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration options
 * @returns Result of the function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        logger.error(
          {
            attempts: attempt + 1,
            error: lastError.message,
            stack: lastError.stack,
          },
          "Max retries reached",
        );
        throw new RetryError(
          `Failed after ${attempt + 1} attempts: ${lastError.message}`,
          attempt + 1,
          lastError,
        );
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);

      logger.warn(
        {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message,
        },
        `Retry attempt ${attempt + 1}/${maxRetries}`,
      );

      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Retry with custom logic for specific error types
 * @param fn Function to retry
 * @param shouldRetry Function to determine if error is retryable
 * @param options Retry configuration options
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!shouldRetry(lastError, attempt + 1)) {
        logger.info(
          { error: lastError.message, attempt: attempt + 1 },
          "Error is not retryable, throwing immediately",
        );
        throw lastError;
      }

      if (attempt === maxRetries) {
        logger.error(
          { attempts: attempt + 1, error: lastError.message },
          "Max retries reached",
        );
        throw new RetryError(
          `Failed after ${attempt + 1} attempts: ${lastError.message}`,
          attempt + 1,
          lastError,
        );
      }

      const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);

      logger.warn(
        { attempt: attempt + 1, maxRetries, delay, error: lastError.message },
        `Retry attempt ${attempt + 1}/${maxRetries}`,
      );

      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Helper function to sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is network-related and retryable
 */
export function isNetworkError(error: Error): boolean {
  const networkErrorPatterns = [
    "ECONNRESET",
    "ENOTFOUND",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ENETUNREACH",
    "socket hang up",
    "network timeout",
    "fetch failed",
  ];

  const errorMessage = error.message.toLowerCase();
  return networkErrorPatterns.some((pattern) =>
    errorMessage.includes(pattern.toLowerCase()),
  );
}

/**
 * Check if HTTP status code is retryable
 */
export function isRetryableHttpStatus(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status);
}
