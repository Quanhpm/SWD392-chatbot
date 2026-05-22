type LogLevel = 'info' | 'warn' | 'error';

const write = (level: LogLevel, message: string, detail?: unknown): void => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (level === 'error') {
    console.error(line, detail ?? '');
    return;
  }

  if (level === 'warn') {
    console.warn(line, detail ?? '');
    return;
  }

  console.info(line, detail ?? '');
};

export const logger = {
  info: (message: string, detail?: unknown): void => {
    write('info', message, detail);
  },
  warn: (message: string, detail?: unknown): void => {
    write('warn', message, detail);
  },
  error: (message: string, detail?: unknown): void => {
    write('error', message, detail);
  },
};
