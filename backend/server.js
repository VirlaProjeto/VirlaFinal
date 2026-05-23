import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { Server as SocketServer } from 'socket.io'

import userRoutes from './src/routes/userRoutes.js'
import authRoutes from './src/routes/authRoutes.js'
import messageRoutes from './src/routes/messageRoutes.js'
import PaymentRoutes from './src/routes/paymentRoutes.js'

import { logger } from './src/lib/logger.js'
import { socketAuthMiddleware, registerConnectionEvents } from './src/events/authEvents.js'
import { registerMessageEvents } from './src/events/messageEvents.js'

const PORT = process.env.PORT || 3002

const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // Vite dev
  'http://localhost:3000',
  process.env.FRONTEND_URL   // Production — set in .env
].filter(Boolean)

// ─── Express app ────────────────────────────────────────────────
const app = express()

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '4mb' }))

// ─── HTTP routes (keep all existing endpoints) ───────────────────
app.use(userRoutes)
app.use(authRoutes)
app.use(messageRoutes)
app.use(PaymentRoutes)

// ─── Global error handler (NEW) ──────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('http:unhandled_error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })
  res.status(500).json({ msg: 'Internal server error' })
})

// ─── HTTP server (share with Socket.io) ──────────────────────────
const server = http.createServer(app)

// ─── Socket.io server ────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST']
  },
  // Reconnection handled on client side; server pings every 25s
  pingInterval: 25000,
  pingTimeout: 60000
})

// Auth middleware — runs before every connection
io.use(socketAuthMiddleware)

io.on('connection', (socket) => {
  registerConnectionEvents(socket, io)
  registerMessageEvents(socket, io)
})

// ─── Start server ────────────────────────────────────────────────
server.listen(PORT, (err) => {
  if (err) {
    logger.error('server:start_failed', { error: err.message })
    process.exit(1)
    return
  }
  logger.info(`server:started`, { port: PORT })
})

// ─── Graceful shutdown ───────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`server:shutdown`, { signal })
  io.close()
  server.close(() => {
    logger.info('server:closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export { io }   // Export so controllers can emit events from HTTP routes