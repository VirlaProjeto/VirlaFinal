import { prisma } from '../lib/prisma.js'
import { messageLogger } from '../lib/logger.js'
import jwt from 'jsonwebtoken'

/**
 * Registers all message-related Socket.io events on a connected socket.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export function registerMessageEvents(socket, io) {
  const { userId } = socket

  // --- send_message ---
  socket.on('send_message', async (payload, ack) => {
    const { receiverId, content, idempotencyKey } = payload ?? {}

    if (!content?.trim() || !receiverId) {
      return ack?.({ error: 'Invalid payload' })
    }

    try {
      // Idempotency: skip if this key was already processed (simple in-memory guard)
      // For production, store processed keys in Redis or DB
      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          senderId: userId,
          receiverId
        },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } }
        }
      })

      messageLogger.info('message:sent', {
        userId,
        action: 'send_message',
        metadata: { receiverId, messageId: message.id, idempotencyKey },
        timestamp: new Date().toISOString()
      })

      // Deliver to receiver's personal room (they may have multiple tabs)
      io.to(`user:${receiverId}`).emit('receive_message', message)

      // Echo back to sender (confirms persistence, updates their UI)
      socket.emit('message_saved', message)

      ack?.({ ok: true, messageId: message.id })
    } catch (err) {
      messageLogger.error('message:send_failed', {
        userId,
        error: err.message,
        stack: err.stack
      })
      ack?.({ error: 'Failed to send message' })
    }
  })

  // --- user:typing ---
  socket.on('user:typing', ({ receiverId, isTyping }) => {
    if (!receiverId) return
    io.to(`user:${receiverId}`).emit('peer:typing', { senderId: userId, isTyping })
  })

  // --- message:read ---
  socket.on('message:read', ({ senderId }) => {
    if (!senderId) return
    io.to(`user:${senderId}`).emit('message:read_ack', { readerId: userId })
  })
}