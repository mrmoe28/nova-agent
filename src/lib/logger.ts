import pino from "pino";

const logLevel =
  (process.env.LOG_LEVEL as "info" | "debug" | "warn" | "error") || "info";

export const logger = pino({
  level: logLevel,
  // Temporarily disable pino-pretty to avoid worker thread issues with Turbopack
  // transport: process.env.NODE_ENV === 'development' ? {
  //   target: 'pino-pretty',
  //   options: {
  //     colorize: true,
  //     translateTime: 'SYS:standard',
  //     ignore: 'pid,hostname',
  //   },
  // } : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export function createLogger(component: string) {
  return logger.child({ component });
}

export async function logOperation<T>(
  logger: pino.Logger,
  operation: string,
  fn: () => Promise<T>,
  context: Record<string, unknown> = {},
): Promise<T> {
  const startTime = Date.now();
  const logContext = { operation, ...context };

  logger.info(logContext, `Starting ${operation}`);

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    logger.info({ ...logContext, duration }, `Completed ${operation}`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        ...logContext,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      `Failed ${operation}`,
    );
    throw error;
  }
}
