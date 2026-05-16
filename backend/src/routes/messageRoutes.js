import express from "express"
import checkToken from "../middlewares/checkToken.js"
import { sendMessage, getMessageHistory, getConversations } from "../controllers/messageController.js"

const router = express.Router()

router.post("/messages", checkToken, sendMessage)
router.get("/messages/history/:userId", checkToken, getMessageHistory)
router.get("/conversations", checkToken, getConversations)

export default router
