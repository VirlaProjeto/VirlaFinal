import { createLogger, format, transports } from 'winston'
import { existsSync, mkdirSync } from 'fs'

const LOG_DIR = 'logs'
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR)

const shared = [
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json()
]

const makeFileTransport = (filename, level) =>
  new transports.File({ filename: `${LOG_DIR}/${filename}`, level })

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(...shared),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    }),
    makeFileTransport('app.log', 'info'),
    makeFileTransport('errors.log', 'error')
  ]
})

export const authLogger = createLogger({
  level: 'info',
  format: format.combine(...shared),
  transports: [
    makeFileTransport('auth.log', 'info'),
    makeFileTransport('errors.log', 'error')
  ]
})

export const messageLogger = createLogger({
  level: 'info',
  format: format.combine(...shared),
  transports: [
    makeFileTransport('messages.log', 'info'),
    makeFileTransport('errors.log', 'error')
  ]
})