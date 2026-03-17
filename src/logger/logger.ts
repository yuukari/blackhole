import type { Logger, LoggerOptions } from 'pino'
import { pino } from 'pino'

export function createLogger(debugMode: boolean): Logger {
    const loggerOptions: LoggerOptions = {
        level: debugMode ? 'debug' : 'info',
    }
    if (debugMode) {
        loggerOptions.transport = {
            target: 'pino-pretty',
        }
    }
    return pino(loggerOptions)
}