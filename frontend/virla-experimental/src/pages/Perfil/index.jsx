import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Person from '@mui/icons-material/Person'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import Cake from '@mui/icons-material/Cake'
import Description from '@mui/icons-material/Description'
import Save from '@mui/icons-material/Save'
import DeleteForever from '@mui/icons-material/DeleteForever'
import CheckCircle from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { PageLoader, ButtonSpinner } from '../../components/Spinner'
import Image from '@mui/icons-material/Image'
import Payments from '@mui/icons-material/Payments'
import Badge from '@mui/icons-material/Badge'
import Psychology from '@mui/icons-material/Psychology'
import LocalOffer from '@mui/icons-material/LocalOffer'
import Shield from '@mui/icons-material/Shield'
import api from '../../services/api'
import { calculateAge } from '../../utils/dateUtils'
import ProfileImageUpload from '../../components/ProfileImageUpload'

const FIELD_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-virla-texto text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-virla-roxo/30 focus:border-virla-roxo transition-all duration-200'

const DISABLED_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-virla-texto/40 text-sm cursor-not-allowed'

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2 font-bold text-virla-texto text-base mb-4">
      <Icon sx={{ fontSize: 20 }} className="text-virla-roxo" />
      {children}
    </h2>
  )
}

function emptyUserForm() {
  return {
    name: '',
    birthDate: '',
    bio: '',
    email: '',
    role: '',
    profileImage: '',
    hourlyRate: '',
    registerNumber: '',
    approach: '',
    specialtiesStr: '',
    description: '',
    city: '',
    state: '',
  }
}

function mapUserToForm(user) {
  if (!user) return emptyUserForm()
  return {
    name: user.name ?? '',
    birthDate: user.birthDate ?? '',
    bio: user.bio ?? '',
    email: user.email ?? '',
    role: user.role ?? '',
    profileImage: user.profileImage ?? '',
    hourlyRate: user.hourlyRate != null && user.hourlyRate !== '' ? String(user.hourlyRate) : '',
    registerNumber: user.registerNumber ?? '',
    approach: user.approach ?? '',
    specialtiesStr: Array.isArray(user.specialties) ? user.specialties.join(', ') : '',
    description: user.description ?? '',
    city: user.city ?? '',
    state: user.state ?? '',
  }
}

function PerfilFormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6 animate-pulse">
      <div className="h-9 bg-virla-roxo/15 rounded w-48" />
      <div className="h-4 bg-virla-roxo/10 rounded w-64" />
      <div className="bg-white/80 rounded-2xl border border-virla-roxo/10 p-6 space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 bg-virla-roxo/10 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function Perfil() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [userData, setUserData] = useState(emptyUserForm)

  const id = localStorage.getItem('meuId')
  const token = localStorage.getItem('meuToken')

  useEffect(() => {
    if (!token || !id) {
      navigate('/login')
      return
    }

    async function loadUser() {
      try {
        const res = await api.get(`/users/${id}`)
        const user = res.data.user ?? res.data
        setUserData(mapUserToForm(user))
      } catch {
        setMessage({ type: 'error', text: 'Erro ao carregar dados do perfil.' })
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [id, token, navigate])

  async function handleUpdate(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    try {
      setSaving(true)
      const isFamiliar = userData.role === 'FAMILIAR'
      const basePayload = {
        name: userData.name,
        birthDate: userData.birthDate ? new Date(userData.birthDate).toISOString() : undefined,
        bio: userData.bio,
        profileImage: userData.profileImage.trim() || null,
      }
      let payload = basePayload
      if (!isFamiliar) {
        const specialties = userData.specialtiesStr
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
        payload = {
          ...basePayload,
          city: userData.city.trim() || null,
          state: userData.state.trim() || null,
          registerNumber: userData.registerNumber.trim() || null,
          approach: userData.approach.trim() || null,
          description: userData.description.trim() || null,
          specialties,
          hourlyRate:
            userData.hourlyRate === '' || userData.hourlyRate == null
              ? null
              : Number(String(userData.hourlyRate).replace(',', '.')),
        }
      }
      const res = await api.put(`/users/${id}`, payload)
      const updated = res.data.user ?? res.data
      if (updated?.name) localStorage.setItem('meuNome', updated.name)
      setUserData(mapUserToForm(updated))
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    } catch {
      setMessage({ type: 'error', text: 'Erro ao atualizar perfil. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Atenção: deseja realmente excluir sua conta permanentemente?\n\nEsta ação não pode ser desfeita.'
    )
    if (!confirmed) return

    try {
      setDeleting(true)
      await api.delete(`/users/${id}`)
      localStorage.clear()
      navigate('/login')
    } catch {
      setMessage({ type: 'error', text: 'Erro ao excluir conta. Tente novamente.' })
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <PageLoader label="Carregando perfil…">
        <PerfilFormSkeleton />
      </PageLoader>
    )
  }

  const age = calculateAge(userData.birthDate)
  const isFamiliar = userData.role === 'FAMILIAR'

  return (
    <div
      className="min-h-screen pt-16 bg-virla-neve"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 50% at 30% 0%, rgba(128,0,128,0.07), transparent)',
      }}
    >
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1
            className="text-3xl font-black text-virla-roxo"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Meu Perfil
          </h1>
          <p className="text-virla-texto/50 text-sm mt-1">Gerencie suas informações pessoais e profissionais</p>
        </div>

        {message.text && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
            ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle sx={{ fontSize: 20 }} className="flex-shrink-0" />
            ) : (
              <ErrorIcon sx={{ fontSize: 20 }} className="flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-virla-roxo/10 shadow-sm p-6">
          <SectionTitle icon={Person}>Informações Pessoais</SectionTitle>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                Tipo de conta
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 bg-virla-roxo/10 text-virla-roxo
                                 text-xs font-bold px-3 py-1.5 rounded-full"
                >
                  {userData.role === 'CUIDADOR' ? 'Cuidador Profissional' : 'Familiar'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                Nome completo
              </label>
              <div className="relative">
                <Person
                  sx={{ fontSize: 16 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/40 pointer-events-none"
                />
                <input
                  type="text"
                  value={userData.name}
                  onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  className={`${FIELD_CLASS} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                E-mail (não editável)
              </label>
              <input type="text" value={userData.email} disabled className={DISABLED_CLASS} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                Data de Nascimento
              </label>
              <div className="relative">
                <CalendarMonth
                  sx={{ fontSize: 16 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/40 pointer-events-none"
                />
                <input
                  type="date"
                  value={userData.birthDate ? userData.birthDate.split('T')[0] : ''}
                  onChange={(e) => setUserData({ ...userData, birthDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className={`${FIELD_CLASS} pl-9 cursor-pointer`}
                />
              </div>
              {age !== null && (
                <p className="flex items-center gap-1.5 mt-1.5 text-xs text-virla-roxo/70 font-medium">
                  <Cake sx={{ fontSize: 14 }} />
                  {age} anos
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                Bio / Apresentação
              </label>
              <div className="relative">
                <Description
                  sx={{ fontSize: 16 }}
                  className="absolute left-3 top-3.5 text-virla-roxo/40 pointer-events-none"
                />
                <textarea
                  rows={4}
                  value={userData.bio ?? ''}
                  onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                  className={`${FIELD_CLASS} pl-9 resize-none`}
                  placeholder="Resumo curto para o feed…"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-virla-roxo/10">
              <SectionTitle icon={Image}>{isFamiliar ? 'Foto de perfil' : 'Imagem e valor'}</SectionTitle>
            </div>

            <ProfileImageUpload
              value={userData.profileImage}
              onChange={(v) => setUserData({ ...userData, profileImage: v })}
            />

            {!isFamiliar && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                    Valor por hora (R$)
                  </label>
                  <div className="relative">
                    <Payments
                      sx={{ fontSize: 16 }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/40 pointer-events-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={userData.hourlyRate}
                      onChange={(e) => setUserData({ ...userData, hourlyRate: e.target.value })}
                      className={`${FIELD_CLASS} pl-9`}
                      placeholder="Ex.: 150"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                    Registro profissional (COREN, CRP, etc.)
                  </label>
                  <div className="relative">
                    <Badge
                      sx={{ fontSize: 16 }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/40 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={userData.registerNumber}
                      onChange={(e) => setUserData({ ...userData, registerNumber: e.target.value })}
                      className={`${FIELD_CLASS} pl-9`}
                      placeholder="Número do conselho"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                    Abordagem (ex.: TCC, home care)
                  </label>
                  <div className="relative">
                    <Psychology
                      sx={{ fontSize: 16 }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/40 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={userData.approach}
                      onChange={(e) => setUserData({ ...userData, approach: e.target.value })}
                      className={`${FIELD_CLASS} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                    Especialidades (separadas por vírgula)
                  </label>
                  <div className="relative">
                    <LocalOffer
                      sx={{ fontSize: 16 }}
                      className="absolute left-3 top-3.5 text-virla-roxo/40 pointer-events-none"
                    />
                    <textarea
                      rows={2}
                      value={userData.specialtiesStr}
                      onChange={(e) => setUserData({ ...userData, specialtiesStr: e.target.value })}
                      className={`${FIELD_CLASS} pl-9 resize-none`}
                      placeholder="Idosos, pós-cirúrgico, Alzheimer…"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                    Descrição longa (opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={userData.description}
                    onChange={(e) => setUserData({ ...userData, description: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Currículo, experiência, formação…"
                  />
                </div>
              </>
            )}

            {!isFamiliar && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={userData.city}
                    onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={userData.state}
                    onChange={(e) => setUserData({ ...userData, state: e.target.value })}
                    className={FIELD_CLASS}
                    maxLength={2}
                    placeholder="PE"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || deleting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-virla-roxo hover:bg-virla-roxohighlight text-white font-semibold
                         shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {saving ? (
                <>
                  <ButtonSpinner size={20} />
                  Salvando…
                </>
              ) : (
                <>
                  <Save sx={{ fontSize: 20 }} />
                  Salvar alterações
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-red-200 shadow-sm p-6">
          <SectionTitle icon={Shield}>Zona de perigo</SectionTitle>

          <p className="text-sm text-virla-texto/60 mb-4">
            Excluir sua conta é uma ação <strong>permanente e irreversível</strong>. Todos os seus dados serão removidos
            do sistema.
          </p>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-red-600 hover:bg-red-700 text-white font-semibold text-sm
                       shadow-sm hover:shadow-md transition-all duration-200
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <>
                <ButtonSpinner size={18} />
                Excluindo…
              </>
            ) : (
              <>
                <DeleteForever sx={{ fontSize: 18 }} />
                Excluir minha conta permanentemente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
