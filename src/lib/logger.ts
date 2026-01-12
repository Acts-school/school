type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

interface LoggerApi {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
}

const shouldLogDebug = process.env.NODE_ENV !== "production";

const log = (level: LogLevel, message: string, fields?: LogFields) => {
  const entry = { level, message, ...fields };
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](JSON.stringify(entry));
};

const logger: LoggerApi = {
  debug: (message, fields) => {
    if (shouldLogDebug) log("debug", message, fields);
  },
  info: (message, fields) => log("info", message, fields),
  warn: (message, fields) => log("warn", message, fields),
  error: (message, fields) => log("error", message, fields),
};

export default logger;
