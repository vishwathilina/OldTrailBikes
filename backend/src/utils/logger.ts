import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'oldtrailbikes-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(env.isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname,service',
          },
        },
      }
    : {}),
});

export type Logger = typeof logger;
