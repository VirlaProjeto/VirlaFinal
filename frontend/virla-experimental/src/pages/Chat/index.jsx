import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'

import ArrowBack from '@mui/icons-material/ArrowBack'
import Send from '@mui/icons-material/Send'
import Person from '@mui/icons-material/Person'
import Payments from '@mui/icons-material/Payments'
import Receipt from '@mui/icons-material/Receipt'

import api from '../../services/api'
import { PageLoader, ButtonSpinner } from '../../components/Spinner'
import GenerateChargeModal from '../../components/GenerateChargeModal'
import { formatCentsBRL } from '../../utils/paymentFees'
import { useSocket } from '../../hooks/useSocket'

function normalizeVirlaRole(role) {
  if (role == null) return ''
  return String(role).trim().toUpperCase()
}

export default function Chat() {
  const { userId: peerId } = useParams()
  const navigate = useNavigate()
  const meId = localStorage.getItem('meuId')

  const [peer, setPeer] = useState(null)
  const [myRole, setMyRole] = useState(localStorage.getItem('meuRole') ?? '')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imgErr, setImgErr] = useState(false)
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [pendingCharge, setPendingCharge] = useState(null)
  const [peerTyping, setPeerTyping] = useState(false)

  const listRef = useRef(null)
  const isChatVisible = useRef(true)

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // Monitora se a aba está em foco (para tocar som ou não)
  useEffect(() => {
    const onFocus = () => { isChatVisible.current = true }
    const onBlur  = () => { isChatVisible.current = false }
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur',  onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur',  onBlur)
    }
  }, [])

  const loadPendingCharge = useCallback(async () => {
    if (!peerId) return
    try {
      const res = await api.get(`/payments/charge-requests/pending/${peerId}`)
      setPendingCharge(res.data.charge)
    } catch {
      setPendingCharge(null)
    }
  }, [peerId])

  const fetchHistory = useCallback(async () => {
    const token = localStorage.getItem('meuToken')
    const id = localStorage.getItem('meuId')
    if (!token || !id || !peerId) {
      navigate('/login')
      return null
    }
    const res = await api.get(`/messages/history/${peerId}`)
    setPeer(res.data.peer)
    setMessages(res.data.messages ?? [])
    setImgErr(false)
    return res.data.messages?.length ?? 0
  }, [peerId, navigate])

  // Carregamento inicial
  useEffect(() => {
    if (!meId || peerId === meId) {
      navigate('/home')
      return
    }
    let cancelled = false
    setLoading(true)
    setPeer(null)
    setMessages([])
    setImgErr(false)
    
    ;(async () => {
      try {
        if (!myRole) {
          const meRes = await api.get(`/users/${meId}`)
          const role = meRes.data.user?.role ?? meRes.data.role
          const roleNorm = normalizeVirlaRole(role)
          if (roleNorm) {
            setMyRole(roleNorm)
            localStorage.setItem('meuRole', roleNorm)
          }
        }
        await fetchHistory()
        await loadPendingCharge()
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          const status = e.response?.status
          if (status === 401 || status === 403) {
            localStorage.clear()
            navigate('/login')
          } else {
            navigate('/feed')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [meId, peerId, navigate, fetchHistory, loadPendingCharge, myRole])

  // --- LÓGICA DO SOCKET.IO ---
  const handleIncomingMessage = useCallback((message) => {
    const isRelevant =
      (message.senderId === peerId && message.receiverId === meId) ||
      (message.senderId === meId   && message.receiverId === peerId)
    if (!isRelevant) return

    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id)
      if (exists) return prev
      const withoutOptimistic = prev.filter((m) => !m._optimistic)
      return [...withoutOptimistic, message]
    })
  }, [peerId, meId])

  const handleTyping = useCallback(({ isTyping }) => {
    setPeerTyping(isTyping)
    if (isTyping) setTimeout(() => setPeerTyping(false), 3000)
  }, [])

  const { sendMessage, emitTyping, emitRead, isConnected } = useSocket({
    peerId,
    onMessage: handleIncomingMessage,
    onTyping: handleTyping,
    isChatVisible: isChatVisible.current
  })

  // Scroll automático
  useEffect(() => {
    if (!loading) requestAnimationFrame(scrollToBottom)
  }, [loading, messages, peerTyping, scrollToBottom])

  // Emitir confirmação de leitura ao abrir
  useEffect(() => {
    if (peerId && isConnected && !loading) emitRead(peerId)
  }, [peerId, isConnected, loading, emitRead])

  // --- ENVIO DE MENSAGEM ---
  const handleSend = useCallback(async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    // UI Otimista
    const optimistic = {
      id: `opt-${Date.now()}`,
      _optimistic: true,
      content: text,
      senderId: meId,
      receiverId: peerId,
      createdAt: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      await sendMessage({ receiverId: peerId, content: text })
    } catch (err) {
      console.error('Erro no socket, tentando fallback HTTP...', err)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      try {
        await api.post('/messages', { receiverId: peerId, content: text })
        await fetchHistory()
      } catch (httpErr) {
        console.error('Falha no fallback HTTP', httpErr)
        alert('Não foi possível enviar a mensagem.')
      }
    } finally {
      setSending(false)
    }
  }, [input, sending, meId, peerId, sendMessage, fetchHistory])

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value)
    emitTyping(peerId)
  }, [peerId, emitTyping])

  // --- REGRAS DE PAGAMENTO ---
  const myRoleNorm = normalizeVirlaRole(myRole)
  const peerRoleNorm = normalizeVirlaRole(peer?.role)
  const isCaregiver = myRoleNorm === 'CUIDADOR'
  const isFamiliar = myRoleNorm === 'FAMILIAR'
  const peerIsCaregiver = peerRoleNorm === 'CUIDADOR'
  const canGenerateCharge = isCaregiver && !!peer
  const canPay = isFamiliar && peerIsCaregiver && pendingCharge && pendingCharge.familiarId === meId

  function goToPayment() {
    if (!pendingCharge) return
    navigate('/pagamento', {
      state: {
        amount: pendingCharge.totalAmount,
        baseAmount: pendingCharge.baseAmount,
        description: pendingCharge.description ?? 'Serviço Virla',
        payeeId: pendingCharge.caregiverId,
        chargeRequestId: pendingCharge.id,
      },
    })
  }

  // --- RENDERIZAÇÃO DA TELA ---
  if (loading) {
    return (
      <PageLoader label="Carregando conversa…">
        <div className="w-full max-w-md space-y-3 mt-2">
          <div className="h-12 rounded-xl bg-virla-roxo/10 animate-pulse" />
          <div className="h-20 rounded-xl bg-virla-roxo/5 animate-pulse" />
          <div className="h-20 rounded-xl bg-virla-roxo/5 animate-pulse ml-8" />
        </div>
      </PageLoader>
    )
  }

  return (
    <div className="h-[100dvh] min-h-0 pt-16 bg-[#e8e4ec] flex flex-col">
      {/* Aviso de Offline */}
      {!isConnected && (
        <div className="bg-amber-100 text-amber-800 text-xs text-center py-1 font-medium z-50">
          Sem conexão. Reconectando ao servidor...
        </div>
      )}

      {/* CABEÇALHO (MANTIDO IGUAL) */}
      <header className="flex-shrink-0 z-40 bg-virla-roxo text-white shadow-md px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/15 transition-colors" aria-label="Voltar">
          <ArrowBack sx={{ fontSize: 24 }} />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
          {peer?.profileImage && !imgErr ? (
            <img src={peer?.profileImage} alt="" className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          ) : (
            <Person sx={{ fontSize: 22 }} className="text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-lg truncate">{peer?.name ?? 'Conversa'}</h1>
          <p className="text-xs text-white/70 truncate">
            {peer?.approach || (peerRoleNorm === 'CUIDADOR' ? 'Cuidador' : peerRoleNorm === 'FAMILIAR' ? 'Familiar' : '')}
          </p>
        </div>

        {canGenerateCharge && (
          <button type="button" onClick={() => setShowChargeModal(true)} className="p-2 rounded-xl hover:bg-white/15 transition-colors flex-shrink-0" title="Gerar Cobrança">
            <Receipt sx={{ fontSize: 24 }} />
          </button>
        )}

        {canPay && (
          <button type="button" onClick={goToPayment} className="p-2 rounded-xl hover:bg-white/15 transition-colors flex-shrink-0" title={`Pagar ${formatCentsBRL(pendingCharge.totalAmount)}`}>
            <Payments sx={{ fontSize: 24 }} />
          </button>
        )}

        <Link to="/home?tab=mensagens" className="text-xs font-semibold text-white/90 hover:underline hidden sm:inline">
          Histórico
        </Link>
      </header>

      {/* AVISO DE COBRANÇA (MANTIDO IGUAL) */}
      {canPay && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-900">
          Cobrança pendente: <strong>{formatCentsBRL(pendingCharge.totalAmount)}</strong>
          <button type="button" onClick={goToPayment} className="ml-2 underline font-semibold">Pagar agora</button>
        </div>
      )}

      {/* LISTA DE MENSAGENS */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 space-y-3 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <p className="text-center text-sm text-virla-texto/50 py-8">Nenhuma mensagem ainda. Diga olá!</p>
        )}
        
        {messages.map((m) => {
          const mine = m.senderId === meId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-opacity duration-200
                  ${mine ? 'bg-virla-roxo text-white rounded-br-md' : 'bg-white text-virla-texto border border-virla-roxo/10 rounded-bl-md'}
                  ${m._optimistic ? 'opacity-60' : 'opacity-100'}
                `}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                <p className={`text-[10px] mt-1.5 ${mine ? 'text-white/70' : 'text-virla-texto/40'}`}>
                  {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}

        {/* INDICADOR DE DIGITAÇÃO COM TAILWIND */}
        {peerTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-virla-roxo/10 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-virla-roxo/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-virla-roxo/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-virla-roxo/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* FORMULÁRIO DE ENVIO */}
      <form onSubmit={handleSend} className="flex-shrink-0 bg-white/95 backdrop-blur border-t border-virla-roxo/15 px-4 py-3 shadow-[0_-4px_20px_rgba(128,0,128,0.08)]">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <textarea
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
            placeholder="Digite uma mensagem…"
            className="flex-1 min-h-[44px] max-h-32 resize-y rounded-xl border border-virla-roxo/20 bg-white px-4 py-3 text-sm text-virla-texto placeholder-virla-texto/40 focus:outline-none focus:ring-2 focus:ring-virla-roxo/30 focus:border-virla-roxo"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 rounded-xl bg-virla-roxo text-white flex items-center justify-center hover:bg-virla-roxohighlight shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Enviar"
          >
            {sending ? <ButtonSpinner size={22} /> : <Send sx={{ fontSize: 22 }} />}
          </button>
        </div>
      </form>

      {/* MODAL DE COBRANÇA */}
      {showChargeModal && canGenerateCharge && (
        <GenerateChargeModal
          key={peerId}
          familiarId={peerId}
          familiarName={peer?.name}
          onClose={() => setShowChargeModal(false)}
          onSuccess={() => loadPendingCharge()}
        />
      )}
    </div>
  )
}