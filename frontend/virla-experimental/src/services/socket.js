import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// Do NOT auto-connect on import — we call socket.connect() explicitly
// from the SocketProvider once we know the user is logged in.
export const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 10000,
  auth: (cb) => {
    // Called fresh on every (re)connect, so a page refresh picks up a new token
    cb({ token: localStorage.getItem('meuToken') })
  }
})