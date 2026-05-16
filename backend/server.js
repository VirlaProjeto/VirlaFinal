import 'dotenv/config'
import express from "express"
import cors from "cors"
import userRoutes from "./src/routes/userRoutes.js"
import authRoutes from "./src/routes/authRoutes.js"
import messageRoutes from "./src/routes/messageRoutes.js"
import PaymentRoutes from "./src/routes/paymentRoutes.js"

const app = express()
const PORT = 3002
// Limite maior para fotos de perfil em base64 (data URL)
app.use(express.json({ limit: '4mb' }))
app.use(cors())

app.use(userRoutes)
app.use(authRoutes)
app.use(messageRoutes)
app.use(PaymentRoutes)

// Express 5: o último callback de `listen` é também registrado em `server.once('error', ...)`.
// Se a porta estiver em uso (ou o bind falhar), essa função é chamada com `err` — sem tratar,
// ainda logamos "rodando" e o processo encerra na hora (sem socket ativo no event loop).
app.listen(PORT, (err) => {
  if (err) {
    console.error('Não foi possível iniciar o servidor:', err.message)
    process.exit(1)
    return
  }
  console.log(`Servidor rodando na porta ${PORT}`)
})