import { useEffect, useCallback, useRef } from 'react'
import { useSocketContext } from '../context/SocketContext'

export function useSocket({ peerId, onMessage, onTyping, onReadAck }) {
  const { socket, isConnected } = useSocketContext()
  const typingTimerRef = useRef(null)

  useEffect(() => {
    if (!socket) return
    const handleReceive = (message) => {
      onMessage?.(message)
      // Som e Toast foram movidos para o SocketContext para funcionarem globalmente!
    }
    socket.on('receive_message', handleReceive)
    return () => socket.off('receive_message', handleReceive)
  }, [socket, onMessage])

  useEffect(() => {
    if (!socket) return
    const handleTyping = ({ senderId, isTyping }) => {
      if (senderId === peerId) onTyping?.({ senderId, isTyping })
    }
    socket.on('peer:typing', handleTyping)
    return () => socket.off('peer:typing', handleTyping)
  }, [socket, peerId, onTyping])

  useEffect(() => {
    if (!socket) return
    socket.on('message:read_ack', onReadAck ?? (() => {}))
    return () => socket.off('message:read_ack', onReadAck ?? (() => {}))
  }, [socket, onReadAck])

  const sendMessage = useCallback(
    ({ receiverId, content }) =>
      new Promise((resolve, reject) => {
        if (!socket || !isConnected) return reject(new Error('Socket not connected'))
        const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        socket.emit('send_message', { receiverId, content, idempotencyKey }, (ack) => {
          if (ack?.error) reject(new Error(ack.error))
          else resolve(ack)
        })
      }),
    [socket, isConnected]
  )

  const emitTyping = useCallback(
    (receiverId) => {
      if (!socket || !isConnected) return
      socket.emit('user:typing', { receiverId, isTyping: true })
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        socket.emit('user:typing', { receiverId, isTyping: false })
      }, 2000)
    },
    [socket, isConnected]
  )

  const emitRead = useCallback(
    (senderId) => {
      if (!socket || !isConnected) return
      socket.emit('message:read', { senderId })
    },
    [socket, isConnected]
  )

  useEffect(() => () => clearTimeout(typingTimerRef.current), [])

  return { socket, sendMessage, emitTyping, emitRead, isConnected }
}