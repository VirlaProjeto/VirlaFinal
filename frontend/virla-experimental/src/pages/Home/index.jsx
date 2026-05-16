import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Person from '@mui/icons-material/Person'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import Cake from '@mui/icons-material/Cake'
import Work from '@mui/icons-material/Work'
import Description from '@mui/icons-material/Description'
import Email from '@mui/icons-material/Email'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Schedule from '@mui/icons-material/Schedule'
import Chat from '@mui/icons-material/Chat'
import Payments from '@mui/icons-material/Payments'
import LocalOffer from '@mui/icons-material/LocalOffer'
import api from '../../services/api'
import { calculateAge, formatDateBR } from '../../utils/dateUtils'
import { formatHourly } from '../../utils/formatters'
import { PageLoader, Spinner, InlineSpinner } from '../../components/Spinner'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-virla-roxo/10 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-virla-roxo/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon sx={{ fontSize: 18 }} className="text-virla-roxo" />
      </div>
      <div>
        <p className="text-xs text-virla-texto/50 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-virla-texto font-semibold mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
      <div className="h-64 bg-white/60 rounded-2xl border border-virla-roxo/10" />
      <div className="h-64 bg-white/60 rounded-2xl border border-virla-roxo/10" />
      <div className="md:col-span-2 h-40 bg-white/60 rounded-2xl border border-virla-roxo/10" />
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'mensagens' ? 'mensagens' : 'dashboard'

  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [convLoading, setConvLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('meuToken')
    const id = localStorage.getItem('meuId')

    if (!token || !id) {
      navigate('/login')
      return
    }

    async function fetchUser() {
      try {
        const res = await api.get(`/users/${id}`)
        const user = res.data.user ?? res.data
        setUserData(user)
        if (user?.name) localStorage.setItem('meuNome', user.name)
      } catch (err) {
        console.error(err)
        const status = err.response?.status
        if (status === 401 || status === 403) {
          localStorage.clear()
          navigate('/login')
        } else {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [navigate])

  const loadConversations = useCallback(async () => {
    setConvLoading(true)
    try {
      const res = await api.get('/conversations')
      setConversations(res.data.conversations ?? [])
    } catch (e) {
      console.error(e)
      setConversations([])
    } finally {
      setConvLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'mensagens') return undefined
    const t = setTimeout(() => {
      loadConversations()
    }, 0)
    return () => clearTimeout(t)
  }, [activeTab, loadConversations])

  function selectTab(tab) {
    setSearchParams(tab === 'mensagens' ? { tab: 'mensagens' } : {})
  }

  if (loading || !userData) {
    return (
      <PageLoader label="Carregando painel…">
        <div className="w-full max-w-4xl mt-2">
          <DashboardSkeleton />
        </div>
      </PageLoader>
    )
  }

  const age = calculateAge(userData?.birthDate)
  const rateLabel = formatHourly(userData?.hourlyRate)
  const specialties = Array.isArray(userData?.specialties) ? userData.specialties : []

  return (
    <div
      className="min-h-screen pt-16 bg-virla-neve"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 50% at 70% 0%, rgba(128,0,128,0.08), transparent)',
      }}
    >
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-virla-roxo rounded-3xl p-8 text-white mb-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row gap-6 sm:items-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/30 bg-white/10 flex items-center justify-center">
              {userData?.profileImage ? (
                <img src={userData.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Person sx={{ fontSize: 48 }} className="text-white/80" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-sm font-medium mb-1">Bem-vindo de volta,</p>
              <h1
                className="text-3xl font-black tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {userData?.name}
              </h1>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <CheckCircle sx={{ fontSize: 14 }} />
                  {userData?.role === 'CUIDADOR' ? 'Cuidador Profissional' : 'Familiar'}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <Schedule sx={{ fontSize: 14 }} />
                  Conta ativa
                </span>
                {rateLabel && (
                  <span className="inline-flex items-center gap-1.5 bg-white/25 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm">
                    <Payments sx={{ fontSize: 14 }} />
                    {rateLabel}
                  </span>
                )}
              </div>
              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {specialties.slice(0, 6).map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/25"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-white/60 rounded-2xl border border-virla-roxo/10 shadow-sm w-fit">
          <button
            type="button"
            onClick={() => selectTab('dashboard')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
              ${
                activeTab === 'dashboard'
                  ? 'bg-virla-roxo text-white shadow-md'
                  : 'text-virla-texto/70 hover:text-virla-roxo'
              }`}
          >
            Painel
          </button>
          <button
            type="button"
            onClick={() => selectTab('mensagens')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 inline-flex items-center gap-2
              ${
                activeTab === 'mensagens'
                  ? 'bg-virla-roxo text-white shadow-md'
                  : 'text-virla-texto/70 hover:text-virla-roxo'
              }`}
          >
            <Chat sx={{ fontSize: 18 }} />
            Mensagens
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-virla-roxo/10 shadow-sm p-6">
              <h2 className="font-bold text-virla-texto mb-4 flex items-center gap-2">
                <Person sx={{ fontSize: 20 }} className="text-virla-roxo" />
                Dados pessoais
              </h2>

              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-virla-roxo/15 bg-virla-roxo/5 flex items-center justify-center">
                  {userData?.profileImage ? (
                    <img src={userData.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Person sx={{ fontSize: 40 }} className="text-virla-roxo/30" />
                  )}
                </div>
              </div>

              <InfoRow icon={CalendarMonth} label="Data de nascimento" value={formatDateBR(userData?.birthDate)} />
              <InfoRow icon={Cake} label="Idade" value={age !== null ? `${age} anos` : '—'} />
              <InfoRow
                icon={Work}
                label="Tipo de conta"
                value={userData?.role === 'CUIDADOR' ? 'Cuidador' : 'Familiar'}
              />
              <InfoRow icon={Email} label="E-mail" value={userData?.email} />
              {rateLabel && <InfoRow icon={Payments} label="Valor por hora" value={rateLabel} />}
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-virla-roxo/10 shadow-sm p-6">
              <h2 className="font-bold text-virla-texto mb-4 flex items-center gap-2">
                <Description sx={{ fontSize: 20 }} className="text-virla-roxo" />
                Apresentação
              </h2>
              <p className="text-virla-texto/70 text-sm leading-relaxed whitespace-pre-wrap">
                {userData?.bio || 'Nenhuma bio adicionada ainda. Acesse o Perfil para se apresentar!'}
              </p>
              {specialties.length > 0 && (
                <div className="mt-5 pt-5 border-t border-virla-roxo/10">
                  <p className="text-xs font-semibold text-virla-texto/50 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <LocalOffer sx={{ fontSize: 16 }} className="text-virla-roxo" />
                    Especialidades
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialties.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 border border-violet-200/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-virla-roxo/10 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-virla-roxo/10 flex items-center justify-between gap-3">
              <h2 className="font-bold text-virla-texto flex items-center gap-2">
                <Chat sx={{ fontSize: 22 }} className="text-virla-roxo" />
                Conversas recentes
              </h2>
              <button
                type="button"
                onClick={loadConversations}
                disabled={convLoading}
                className="text-xs font-semibold text-virla-roxo hover:underline disabled:opacity-50 inline-flex items-center gap-1"
              >
                {convLoading && <InlineSpinner size={14} />}
                Atualizar
              </button>
            </div>
            {convLoading && conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-virla-texto/50">
                <Spinner size={28} label="Carregando conversas…" />
                <div className="w-full max-w-md space-y-3 px-6 mt-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-virla-roxo/5 animate-pulse" />
                  ))}
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-6 py-16 text-center text-virla-texto/50 text-sm">
                Nenhuma conversa ainda. Visite o{' '}
                <button
                  type="button"
                  className="text-virla-roxo font-semibold underline"
                  onClick={() => navigate('/feed')}
                >
                  Feed
                </button>{' '}
                e envie uma mensagem.
              </div>
            ) : (
              <ul className="divide-y divide-virla-roxo/10">
                {conversations.map((c) => (
                  <li key={c.peerId}>
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${c.peerId}`)}
                      className="w-full text-left px-6 py-4 hover:bg-virla-roxo/5 transition-colors flex gap-4"
                    >
                      <div className="w-11 h-11 rounded-xl bg-virla-roxo/10 flex items-center justify-center flex-shrink-0">
                        <Person sx={{ fontSize: 24 }} className="text-virla-roxo" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-virla-texto truncate">{c.peerName}</p>
                        <p className="text-sm text-virla-texto/60 truncate mt-0.5">{c.lastMessage}</p>
                      </div>
                      <span className="text-xs text-virla-texto/40 flex-shrink-0 pt-1">
                        {c.lastMessageAt
                          ? new Date(c.lastMessageAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                            })
                          : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
