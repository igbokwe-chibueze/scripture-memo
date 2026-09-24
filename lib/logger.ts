import "server-only";

type LogContext = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /password|passcode|secret|token|authorization|cookie|credential|api[-_]?key/i;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /((?:password|passcode|secret|token|authorization|cookie|credential|api[-_]?key)\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s&,;]+)/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const URL_CREDENTIALS_PATTERN = /([a-z][a-z\d+.-]*:\/\/)[^/@\s]+@/gi;

/** Removes common credential encodings from free-form diagnostic text. */
function sanitizeLogText(value: string): string {
  return value
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, `$1${REDACTED}`)
    .replace(BEARER_TOKEN_PATTERN, `Bearer ${REDACTED}`)
    .replace(URL_CREDENTIALS_PATTERN, `$1${REDACTED}@`);
}

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
    const safeError: Record<string, string> = {
      name: value.name,
      // Error messages can embed database URLs or request credentials, so run
      // them through the same text redaction used for stack traces and tokens.
      message: sanitizeLogText(value.message),
    };

    // WHY: Production log sinks often have wider access and longer retention
    // than request memory. Keep detailed traces for local diagnosis only, and
    // redact common credential forms even in development.
    if (process.env.NODE_ENV !== "production" && value.stack) {
      safeError.stack = sanitizeLogText(value.stack);
    }

    return safeError;
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
