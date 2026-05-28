import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

export const socket = io(URL, {
  // ESSENCIAL: Garante que o cliente siga a mesma ordem de transporte do servidor
  transports: ['polling', 'websocket'],
  
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 10000,
  withCredentials: true, // Necessário quando usamos CORS com cookies/auth
  auth: (cb) => {
    cb({ token: localStorage.getItem('meuToken') })
  }
})