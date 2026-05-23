import { createContext, useContext, useEffect, useState } from 'react'
import { socket } from '../services/socket'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [transport, setTransport] = useState('—')

  useEffect(() => {
    const userId = localStorage.getItem('meuId')

    // Only connect if the user is logged in
    if (!userId) return

    socket.connect()

    const onConnect = () => {
      setIsConnected(true)
      setTransport(socket.io.engine.transport.name)

      // Track transport upgrades (polling → websocket)
      socket.io.engine.on('upgrade', (t) => setTransport(t.name))
    }

    const onDisconnect = () => {
      setIsConnected(false)
      setTransport('—')
    }

    const onConnectError = (err) => {
      console.error('[Socket] Connection error:', err.message)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
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