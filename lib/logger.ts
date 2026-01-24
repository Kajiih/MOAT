/**
 * @file logger.ts
 * @description Configures the global logger using Pino.
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In development, use pino-pretty for readable logs.
  // In production, use standard JSON logs for structured logging systems (Datadog, CloudWatch, etc.)
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  browser: {
    asObject: true,
    // In the browser, we might want to just transmit the object to console
    // or eventually send to a remote logging service.
    transmit: {
      level: 'info',
      send: (level, logEvent) => {
        const msg = logEvent.messages[0];
        const args = logEvent.messages.slice(1);
        if (level === 'error') {
          console.error(msg, ...args);
        } else if (level === 'warn') {
          console.warn(msg, ...args);
        } else {
          console.log(msg, ...args);
        }
      },
    },
  },
});
