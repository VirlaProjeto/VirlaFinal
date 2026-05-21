import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Person from '@mui/icons-material/Person'
import Work from '@mui/icons-material/Work'
import Email from '@mui/icons-material/Email'
import Lock from '@mui/icons-material/Lock'
import PersonAdd from '@mui/icons-material/PersonAdd'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Badge from '@mui/icons-material/Badge'
import VerifiedUser from '@mui/icons-material/VerifiedUser'
import api from '../../services/api'
import { FIELD_CLASS } from '../../constants/formStyles'
import { ButtonSpinner } from '../../components/Spinner'
import ProfileImageUpload from '../../components/ProfileImageUpload'
import { isValidCpf, isValidEmail, maskCpf, stripCpf } from '../../utils/validators'

function IconField({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon
        sx={{ fontSize: 18 }}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/50 pointer-events-none"
      />
      {children}
    </div>
  )
}

function formatRegisterError(err) {
  const data = err.response?.data
  const msg = data?.msg ?? data?.message
  if (typeof msg === 'string') return msg
  if (Array.isArray(msg)) return msg.join('\n')
  if (msg && typeof msg === 'object') return JSON.stringify(msg)
  return err.message || 'Erro ao criar conta. Verifique os dados e tente novamente.'
}

export default function Cadastro() {
  const navigate = useNavigate()
  const [role, setRole] = useState('CUIDADOR')
  const [submitting, setSubmitting] = useState(false)
  const [cpf, setCpf] = useState('')
  const [profileImage, setProfileImage] = useState('')

  const inputName = useRef()
  const inputEmail = useRef()
  const inputPassword = useRef()
  const inputCrmCrf = useRef()

  async function createUser() {
    if (submitting) return

    const name = inputName.current?.value?.trim()
    const email = inputEmail.current?.value?.trim()
    const password = inputPassword.current?.value
    const cpfDigits = stripCpf(cpf)

    if (!name) {
      alert('Informe seu nome.')
      return
    }
    if (!isValidEmail(email)) {
      alert('Informe um e-mail válido (ex.: nome@provedor.com).')
      return
    }
    if (!isValidCpf(cpfDigits)) {
      alert('CPF inválido. Verifique os dígitos.')
      return
    }
    if (!password || password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name,
        role,
        bio: '',
        email,
        cpf: cpfDigits,
        password,
      }

      if (profileImage) payload.profileImage = profileImage

      if (role === 'CUIDADOR') {
        const crmCrf = inputCrmCrf.current?.value?.trim()
        if (crmCrf) payload.crm_crf = crmCrf
      }

      await api.post('/users', payload)
      navigate('/login')
    } catch (err) {
      console.error(err)
      alert(formatRegisterError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-virla-neve flex items-center justify-center px-4 py-12"
      style={{
        backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(128,0,128,0.12), transparent)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/favicon.ico" alt="VIRLA Logo" className="w-12 h-12 object-contain mb-3" />
          <h1
            className="text-3xl font-black text-virla-roxo tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            VIRLA
          </h1>
          <p className="text-virla-texto/60 text-sm mt-1">Crie sua conta gratuita</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-virla-roxo/10 p-8 space-y-4">
          <h2 className="text-xl font-bold text-virla-texto mb-1">Cadastro</h2>

          <div className="relative">
            <Work
              sx={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/50 pointer-events-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`${FIELD_CLASS} appearance-none cursor-pointer`}
            >
              <option value="CUIDADOR">Cuidador</option>
              <option value="FAMILIAR">Familiar</option>
            </select>
          </div>

          <ProfileImageUpload value={profileImage} onChange={setProfileImage} />

          <IconField icon={Person}>
            <input ref={inputName} type="text" placeholder="Nome completo *" className={FIELD_CLASS} />
          </IconField>

          <IconField icon={VerifiedUser}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="CPF *"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              className={FIELD_CLASS}
              maxLength={14}
            />
          </IconField>

          {role === 'CUIDADOR' && (
            <IconField icon={Badge}>
              <input
                ref={inputCrmCrf}
                type="text"
                placeholder="CRM / CRF (opcional)"
                className={FIELD_CLASS}
              />
            </IconField>
          )}

          <IconField icon={Email}>
            <input
              ref={inputEmail}
              type="email"
              placeholder="seu@email.com *"
              className={FIELD_CLASS}
              autoComplete="email"
            />
          </IconField>

          <IconField icon={Lock}>
            <input
              ref={inputPassword}
              type="password"
              placeholder="Senha (mín. 6 caracteres) *"
              className={FIELD_CLASS}
              autoComplete="new-password"
            />
          </IconField>

          <button
            onClick={createUser}
            type="button"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       bg-virla-roxo hover:bg-virla-roxohighlight text-white font-semibold
                       shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 mt-2
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {submitting ? <ButtonSpinner size={22} /> : <PersonAdd sx={{ fontSize: 20 }} />}
            {submitting ? 'Criando conta…' : 'Criar conta'}
          </button>

          <p className="text-center text-sm text-virla-texto/60 pt-1">
            Já tem conta?{' '}
            <Link to="/login" className="text-virla-roxo font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>

        <Link
          to="/"
          className="flex items-center justify-center gap-1 mt-6 text-sm text-virla-texto/50 hover:text-virla-roxo transition-colors"
        >
          <ArrowBack sx={{ fontSize: 16 }} />
          Voltar à página inicial
        </Link>
      </div>
    </div>
  )
}
