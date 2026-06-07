import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

/**
 * Wraps a server function body with structured error logging and slow-call detection.
 * Generates a unique request ID per invocation for log correlation.
 * Auth rejections (Unauthorized / Forbidden) are logged at warn; all other
 * errors are logged at error with a full stack trace.
 */
export async function logServerFn<T>(fnName: string, fn: () => Promise<T>): Promise<T> {
  const reqId = crypto.randomUUID();
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    if (ms > 500) {
      logger.warn({ reqId, fn: fnName, ms }, 'slow server function');
    }
    return result;
  } catch (err) {
    const ms = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const isAuthError = message === 'Unauthorized' || message === 'Forbidden';
    const level = isAuthError ? 'warn' : 'error';
    logger[level]({ reqId, fn: fnName, ms, err }, `server function ${isAuthError ? 'rejected' : 'failed'}`);
    throw err;
  }
}
