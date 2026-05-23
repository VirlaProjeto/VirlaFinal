import prisma from '../lib/prisma.js'
// IMPORTAMOS O NOSSO CADEADO:
import { encrypt, decrypt } from '../lib/crypto.js'

/** POST body: { receiverId, content } — sender is req.userId from JWT */
export const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body
        const senderId = req.userId

        if (!content || typeof content !== "string" || !content.trim()) {
            return res.status(422).json({ msg: "Mensagem não pode ser vazia" })
        }
        if (!receiverId) {
            return res.status(422).json({ msg: "Destinatário é obrigatório" })
        }
        if (receiverId === senderId) {
            return res.status(400).json({ msg: "Não é possível enviar mensagem para si mesmo" })
        }

        const receiver = await prisma.user.findUnique({ where: { id: receiverId } })
        if (!receiver) {
            return res.status(404).json({ msg: "Usuário destinatário não encontrado" })
        }

        // CRIPTOGRAFANDO antes de salvar no Prisma
        const encryptedContent = encrypt(content.trim())

        const message = await prisma.message.create({
            data: {
                content: encryptedContent, 
                senderId,
                receiverId,
                read: false 
            },
            select: {
                id: true, content: true, audioUrl: true, createdAt: true,
                senderId: true, receiverId: true, read: true
            },
        })

        // DECRIPTOGRAFANDO a resposta para o Front-end receber o texto legível
        message.content = decrypt(message.content)

        res.status(201).json({ message })
    } catch (e) {
        console.error(e)
        res.status(500).json({ msg: "Erro ao enviar mensagem" })
    }
}

/** POST para enviar áudios */
export const sendAudioMessage = async (req, res) => {
    try {
        const { receiverId } = req.body
        const senderId = req.userId
        const file = req.file

        if (!file) return res.status(400).json({ msg: "Nenhum arquivo de áudio" })
        if (!receiverId) return res.status(422).json({ msg: "Destinatário é obrigatório" })

        // Criptografando o texto de aviso do áudio também
        const encryptedContent = encrypt("🎵 Mensagem de Áudio")

        const message = await prisma.message.create({
            data: {
                content: encryptedContent,
                audioUrl: `/uploads/${file.filename}`,
                senderId,
                receiverId,
                read: false
            },
            select: {
                id: true, content: true, audioUrl: true, createdAt: true,
                senderId: true, receiverId: true, read: true
            },
        })

        message.content = decrypt(message.content)

        res.status(201).json({ message })
    } catch (e) {
        console.error("Erro ao fazer upload do áudio:", e)
        res.status(500).json({ msg: "Erro ao enviar mensagem de áudio" })
    }
}

/** Histórico completo entre usuário e :userId */
export const getMessageHistory = async (req, res) => {
    try {
        const me = req.userId
        const otherId = req.params.userId

        const other = await prisma.user.findUnique({
            where: { id: otherId },
            select: { id: true, name: true, role: true, profileImage: true, approach: true, crm_crf: true },
        })
        if (!other) return res.status(404).json({ msg: "Usuário não encontrado" })

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: me, receiverId: otherId },
                    { senderId: otherId, receiverId: me },
                ],
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true, content: true, audioUrl: true, createdAt: true,
                senderId: true, receiverId: true, read: true
            },
        })

        // MAPEAR as mensagens para DESTRANCAR (Descriptografar) cada uma delas
        const decryptedMessages = messages.map(m => ({
            ...m,
            content: decrypt(m.content)
        }))

        res.status(200).json({ peer: other, messages: decryptedMessages })
    } catch (e) {
        console.error(e)
        res.status(500).json({ msg: "Erro ao buscar mensagens" })
    }
}

/** Lista conversas recentes para o dashboard */
export const getConversations = async (req, res) => {
    try {
        const me = req.userId
        const recent = await prisma.message.findMany({
            where: { OR: [{ senderId: me }, { receiverId: me }] },
            orderBy: { createdAt: "desc" },
            take: 400,
            include: {
                sender: { select: { id: true, name: true } },
                receiver: { select: { id: true, name: true } },
            },
        })

        const byPeer = new Map()
        for (const m of recent) {
            const peerId = m.senderId === me ? m.receiverId : m.senderId
            if (byPeer.has(peerId)) continue
            
            byPeer.set(peerId, {
                peerId,
                peerName: m.senderId === me ? m.receiver.name : m.sender.name,
                // DESTRANCANDO a última mensagem que aparece na lista
                lastMessage: decrypt(m.content), 
                lastMessageAt: m.createdAt,
            })
        }

        res.status(200).json({ conversations: [...byPeer.values()] })
    } catch (e) {
        console.error(e)
        res.status(500).json({ msg: "Erro ao listar conversas" })
    }
}

/** Contar mensagens não lidas */
export const getUnreadCount = async (req, res) => {
    try {
        const count = await prisma.message.count({
            where: { receiverId: req.userId, read: false }
        })
        res.status(200).json({ count })
    } catch (e) {
        res.status(500).json({ msg: "Erro ao buscar notificações" })
    }
}

/** Marcar mensagens de um usuário como lidas */
export const markAsRead = async (req, res) => {
    try {
        const { userId } = req.params
        await prisma.message.updateMany({
            where: { senderId: userId, receiverId: req.userId, read: false },
            data: { read: true }
        })
        res.status(200).json({ msg: "Mensagens lidas" })
    } catch (e) {
        res.status(500).json({ msg: "Erro ao marcar como lida" })
    }
}