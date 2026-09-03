import winston from 'winston';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }),
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format,
  transports: [new winston.transports.Console()],
});

// Structured logging for agent observability
export function logAgentRun(meta: Record<string, unknown>, message = 'Agent run'): void {
  logger.info(`[Agent] ${message}`, meta);
}

export function logToolCall(meta: Record<string, unknown>, message = 'Tool call'): void {
  logger.info(`[Tool] ${message}`, meta);
}
