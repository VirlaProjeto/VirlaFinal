import prisma from '../lib/prisma.js'

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

        const message = await prisma.message.create({
            data: {
                content: content.trim(),
                senderId,
                receiverId,
            },
            select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                receiverId: true,
            },
        })

        res.status(201).json({ message })
    } catch (e) {
        console.error(e)
        res.status(500).json({ msg: "Erro ao enviar mensagem" })
    }
}

/** Full history between authenticated user and :userId (chronological) */
export const getMessageHistory = async (req, res) => {
    try {
        const me = req.userId
        const otherId = req.params.userId

        if (!otherId) {
            return res.status(400).json({ msg: "Usuário inválido" })
        }
        if (otherId === me) {
            return res.status(400).json({ msg: "Conversa inválida" })
        }

        const other = await prisma.user.findUnique({
            where: { id: otherId },
            select: { id: true, name: true, role: true, profileImage: true, approach: true },
        })
        if (!other) {
            return res.status(404).json({ msg: "Usuário não encontrado" })
        }

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: me, receiverId: otherId },
                    { senderId: otherId, receiverId: me },
                ],
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                receiverId: true,
            },
        })

        res.status(200).json({ peer: other, messages })
    } catch (e) {
        console.error(e)
        const dbDown = e?.name === 'PrismaClientInitializationError' || String(e?.message ?? '').includes('DNS')
        res.status(dbDown ? 503 : 500).json({
            msg: dbDown
                ? 'Não foi possível conectar ao banco de dados. Verifique internet e DATABASE_URL no .env.'
                : 'Erro ao buscar mensagens',
        })
    }
}

/**
 * Recent conversations for dashboard: one row per other user,
 * with last message preview (scan messages, dedupe by partner — OK for MVP volumes).
 */
export const getConversations = async (req, res) => {
    try {
        const me = req.userId

        const recent = await prisma.message.findMany({
            where: {
                OR: [{ senderId: me }, { receiverId: me }],
            },
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
            const peerName = m.senderId === me ? m.receiver.name : m.sender.name
            byPeer.set(peerId, {
                peerId,
                peerName,
                lastMessage: m.content,
                lastMessageAt: m.createdAt,
            })
        }

        const conversations = [...byPeer.values()].sort(
            (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        )

        res.status(200).json({ conversations })
    } catch (e) {
        console.error(e)
        const dbDown = e?.name === 'PrismaClientInitializationError' || String(e?.message ?? '').includes('DNS')
        res.status(dbDown ? 503 : 500).json({
            msg: dbDown
                ? 'Não foi possível conectar ao banco de dados. Verifique internet e DATABASE_URL no .env.'
                : 'Erro ao listar conversas',
        })
    }
}
