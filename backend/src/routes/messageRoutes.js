import express from "express"
import checkToken from "../middlewares/checkToken.js"
import upload from "../config/upload.js" // <--- Importamos o Multer
import { sendMessage, sendAudioMessage, getMessageHistory, getConversations } from "../controllers/messageController.js"

const router = express.Router()

// Rota de texto normal
router.post("/messages", checkToken, sendMessage)

// NOVA: Rota de áudio (o Multer intercepta o ficheiro "audio" antes de chegar ao controller)
router.post("/messages/audio", checkToken, upload.single("audio"), sendAudioMessage)

router.get("/messages/history/:userId", checkToken, getMessageHistory)
router.get("/conversations", checkToken, getConversations)

export default router