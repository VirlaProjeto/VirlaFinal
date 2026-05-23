import express from 'express';
import checkToken from '../middlewares/checkToken.js';
import upload from '../config/upload.js';
import { 
    sendMessage, 
    sendAudioMessage, 
    getMessageHistory, 
    getConversations,
    getUnreadCount,
    markAsRead
} from '../controllers/messageController.js';

const router = express.Router();

// Rota de texto normal
router.post('/messages', checkToken, sendMessage);

// Rota de áudio (o Multer intercepta o arquivo "audio" antes de chegar ao controller)
router.post('/messages/audio', checkToken, upload.single('audio'), sendAudioMessage);

// Histórico e Lista de Conversas
router.get('/messages/history/:userId', checkToken, getMessageHistory);
router.get('/conversations', checkToken, getConversations);

// Rotas de notificação (O nosso contador e o marcador de leitura)
router.get('/messages/unread-count', checkToken, getUnreadCount);
router.patch('/messages/read/:userId', checkToken, markAsRead);

export default router;