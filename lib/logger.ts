import "server-only";

type LogContext = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /password|passcode|secret|token|authorization|cookie|credential|api[-_]?key/i;

/**
 * Recursively removes sensitive values before structured metadata reaches a log
 * sink. Circular references are represented safely instead of crashing an error
 * path that is already handling a failure.
 */
function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      // Stack traces are useful server-side, but Error objects may contain
      // custom secret-bearing properties, so only standard fields are copied.
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED
        : sanitizeValue(entry, seen),
    ]),
  );
}

/** Creates a sanitized copy of caller metadata for safe server-side logging. */
function sanitizeContext(context: LogContext | undefined): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  return sanitizeValue(context, new WeakSet<object>()) as LogContext;
}

/**
 * Emits one structured server log entry through the appropriate console level.
 * All console usage is centralized here so a production log provider can replace
 * this transport later without changing feature code.
 */
function writeLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: sanitizeContext(context),
  };

  console[level](entry);
}

/** Safe server-side logging facade. Never place secrets in the message string. */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== "production") {
      writeLog("debug", message, context);
    }
  },
  info(message: string, context?: LogContext): void {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    writeLog("warn", message, context);
  },
  error(message: string, context?: LogContext): void {
    writeLog("error", message, context);
  },
} as const;
