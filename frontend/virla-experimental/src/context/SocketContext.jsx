import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { socket } from '../services/socket'
import { playNotificationSound, showBrowserNotification } from '../utils/notifications'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [transport, setTransport] = useState('—')

  useEffect(() => {
    const userId = localStorage.getItem('meuId')
    if (!userId) return

    socket.connect()

    const onConnect = () => {
      setIsConnected(true)
      setTransport(socket.io.engine.transport.name)
      socket.io.engine.on('upgrade', (t) => setTransport(t.name))
    }

    const onDisconnect = () => {
      setIsConnected(false)
      setTransport('—')
    }

    const onConnectError = (err) => {
      console.error('[Socket] Connection error:', err.message)
    }

    // --- MÁGICA DAS NOTIFICAÇÕES GLOBAIS ---
    const onReceiveMessageGlobal = (message) => {
      if (message.senderId === userId) return; // Ignora se fui eu mesmo que mandei

      const currentPath = window.location.pathname;
      const isChattingWithSender = currentPath === `/chat/${message.senderId}`;

      // Se a janela estiver fora de foco OU o usuário não estiver na tela do chat específico
      if (!document.hasFocus() || !isChattingWithSender) {
        playNotificationSound() // Toca o Plim!

        if (!document.hasFocus()) {
          showBrowserNotification(message) // Notificação nativa do Windows/Mac/Android
        } else {
          // Toast elegante dentro do aplicativo
          toast.info(`Nova mensagem de ${message.sender?.name || 'um usuário'}`, {
            description: message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content,
            action: {
              label: 'Abrir Chat',
              onClick: () => window.location.href = `/chat/${message.senderId}`
            }
          })
        }
      }
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('receive_message', onReceiveMessageGlobal) // Escuta as mensagens de qualquer lugar!

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('receive_message', onReceiveMessageGlobal)
      socket.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected, transport }}>
      {children}
    </SocketContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocketContext() {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocketContext must be used inside <SocketProvider>')
  return ctx
}