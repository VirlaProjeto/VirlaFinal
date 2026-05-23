import { prisma } from '../lib/prisma.js'
import { messageLogger } from '../lib/logger.js'
import { encrypt, decrypt } from '../lib/crypto.js'

/**
 * Registers all message-related Socket.io events on a connected socket.
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
export function registerMessageEvents(socket, io) {
  const { userId } = socket

  // --- send_message (Mensagens de Texto) ---
  socket.on('send_message', async (payload, ack) => {
    const { receiverId, content, idempotencyKey } = payload ?? {}

    if (!content?.trim() || !receiverId) {
      return ack?.({ error: 'Invalid payload' })
    }

    try {
      // Criptografa o conteúdo antes de persistir
      const encryptedContent = encrypt(content.trim())

      const message = await prisma.message.create({
        data: {
          content: encryptedContent,
          senderId: userId,
          receiverId
        },
        include: {
          // CORRIGIDO: avatarUrl alterado para profileImage!
          sender: { select: { id: true, name: true, profileImage: true } }
        }
      })

      messageLogger.info('message:sent', {
        userId,
        action: 'send_message',
        metadata: { receiverId, messageId: message.id, idempotencyKey },
        timestamp: new Date().toISOString()
      })

      // Descriptografa antes de enviar aos clientes para que recebam texto legível
      message.content = decrypt(message.content)

      // Entrega na "sala" do destinatário
      io.to(`user:${receiverId}`).emit('receive_message', message)

      // Ecoa de volta para o remetente
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

  // --- NOVO: Repassa o aviso de áudio em tempo real ---
  socket.on('audio_uploaded', (message) => {
    if (!message || !message.receiverId) return
    // Apenas encaminha a mensagem pronta (que veio do Multer) para o destinatário
    io.to(`user:${message.receiverId}`).emit('receive_message', message)
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