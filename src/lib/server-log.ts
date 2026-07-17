type LogLevel = "info" | "warn" | "error";

type ServerEvent = {
  event: string;
  context?: Record<string, unknown>;
  error?: unknown;
};

function errorDetails(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) return { name: error.name, message: error.message };
  if (typeof error === "object") {
    const value = error as { code?: unknown; message?: unknown };
    return {
      code: typeof value.code === "string" ? value.code : undefined,
      message: typeof value.message === "string" ? value.message : "Unknown server error",
    };
  }
  return { message: String(error) };
}

export function logServerEvent(level: LogLevel, { event, context, error }: ServerEvent) {
  const entry = JSON.stringify({
    event,
    level,
    at: new Date().toISOString(),
    ...(context ? { context } : {}),
    ...(error ? { error: errorDetails(error) } : {}),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}
