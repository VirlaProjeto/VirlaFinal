import { useEffect, useCallback, useRef } from 'react'
import { useSocketContext } from '../context/SocketContext'
import { playNotificationSound, showBrowserNotification } from '../utils/notifications'

/**
 * @param {object} opts
 * @param {string}   opts.peerId          - The ID of the user you're chatting with
 * @param {function} opts.onMessage       - Called with a new Message object
 * @param {function} opts.onTyping        - Called with { senderId, isTyping }
 * @param {function} opts.onReadAck       - Called with { readerId }
 * @param {boolean}  opts.isChatVisible   - true when the chat window has focus
 */
export function useSocket({ peerId, onMessage, onTyping, onReadAck, isChatVisible }) {
  const { socket, isConnected } = useSocketContext()
  const typingTimerRef = useRef(null)

  // ── receive_message ───────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const handleReceive = (message) => {
      onMessage?.(message)

      // Only alert when the chat is in the background
      if (!isChatVisible) {
        playNotificationSound()
        showBrowserNotification(message)
      }
    }

    socket.on('receive_message', handleReceive)
    return () => socket.off('receive_message', handleReceive)
  }, [socket, onMessage, isChatVisible])

  // ── peer:typing ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    const handleTyping = ({ senderId, isTyping }) => {
      if (senderId === peerId) onTyping?.({ senderId, isTyping })
    }
    socket.on('peer:typing', handleTyping)
    return () => socket.off('peer:typing', handleTyping)
  }, [socket, peerId, onTyping])

  // ── message:read_ack ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('message:read_ack', onReadAck ?? (() => {}))
    return () => socket.off('message:read_ack', onReadAck ?? (() => {}))
  }, [socket, onReadAck])

  // ── send_message ──────────────────────────────────────────────
  const sendMessage = useCallback(
    ({ receiverId, content }) =>
      new Promise((resolve, reject) => {
        if (!socket || !isConnected) {
          return reject(new Error('Socket not connected'))
        }
        const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        socket.emit(
          'send_message',
          { receiverId, content, idempotencyKey },
          (ack) => {
            if (ack?.error) reject(new Error(ack.error))
            else resolve(ack)
          }
        )
      }),
    [socket, isConnected]
  )

  // ── user:typing ───────────────────────────────────────────────
  const emitTyping = useCallback(
    (receiverId) => {
      if (!socket || !isConnected) return
      socket.emit('user:typing', { receiverId, isTyping: true })

      // Auto-cancel after 2s of no keystrokes
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socket.emit('user:typing', { receiverId, isTyping: false })
      }, 2000)
    },
    [socket, isConnected]
  )

  // ── message:read ──────────────────────────────────────────────
  const emitRead = useCallback(
    (senderId) => {
      if (!socket || !isConnected) return
      socket.emit('message:read', { senderId })
    },
    [socket, isConnected]
  )

  // Cleanup typing timer on unmount
  useEffect(() => () => clearTimeout(typingTimerRef.current), [])

  return { sendMessage, emitTyping, emitRead, isConnected }
}