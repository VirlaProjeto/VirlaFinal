import { toast } from 'sonner'
import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Person from '@mui/icons-material/Person'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import Work from '@mui/icons-material/Work'
import Description from '@mui/icons-material/Description'
import Email from '@mui/icons-material/Email'
import Lock from '@mui/icons-material/Lock'
import PersonAdd from '@mui/icons-material/PersonAdd'
import ArrowBack from '@mui/icons-material/ArrowBack'
import FamilyRestroom from '@mui/icons-material/FamilyRestroom'
import Badge from '@mui/icons-material/Badge'
import Payments from '@mui/icons-material/Payments'
import Psychology from '@mui/icons-material/Psychology'
import LocalOffer from '@mui/icons-material/LocalOffer'
import LocationOn from '@mui/icons-material/LocationOn'
import PinDrop from '@mui/icons-material/PinDrop'
import VerifiedUser from '@mui/icons-material/VerifiedUser'
import api from '../../services/api'
import { FIELD_CLASS } from '../../constants/formStyles'
import { ButtonSpinner } from '../../components/Spinner'
import ProfileImageUpload from '../../components/ProfileImageUpload'
import { isValidCpf, isValidEmail, maskCpf, stripCpf } from '../../utils/validators'

function birthDateToISO(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toISOString()
}

function IconField({ icon: Icon, children, iconTop }) {
  return (
    <div className="relative">
      <Icon
        sx={{ fontSize: 18 }}
        className={`absolute left-3 text-virla-roxo/50 pointer-events-none ${
          iconTop ? 'top-3.5' : 'top-1/2 -translate-y-1/2'
        }`}
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
  const inputBirthDate = useRef()
  const inputBio = useRef()
  const inputEmail = useRef()
  const inputPassword = useRef()
  const inputHourlyRate = useRef()
  const inputRegisterNumber = useRef()
  const inputApproach = useRef()
  const inputSpecialties = useRef()
  const inputCity = useRef()
  const inputState = useRef()
  const inputBeneficiaryName = useRef()
  const inputRelationship = useRef()

  async function createUser() {
    if (submitting) return

    const email = inputEmail.current.value.trim()
    const cpfDigits = stripCpf(cpf)

    if (!isValidEmail(email)) {
    toast.warning('Informe um e-mail válido.')
      return
    }
    if (!isValidCpf(cpfDigits)) {
     toast.warning('CPF inválido. Verifique os dígitos.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: inputName.current.value.trim(),
        birthDate: birthDateToISO(inputBirthDate.current.value),
        role,
        bio: inputBio.current.value.trim(),
        email,
        cpf: cpfDigits,
        password: inputPassword.current.value,
      }

      if (profileImage) payload.profileImage = profileImage

      if (role === 'CUIDADOR') {
        const rateRaw = inputHourlyRate.current?.value?.trim().replace(/\s/g, '').replace(',', '.')
        if (rateRaw) {
          const n = parseFloat(rateRaw)
          if (Number.isFinite(n)) payload.hourlyRate = n
        }

        const registerNumber = inputRegisterNumber.current?.value?.trim()
        if (registerNumber) payload.registerNumber = registerNumber

        const approach = inputApproach.current?.value?.trim()
        if (approach) payload.approach = approach

        const specialties = inputSpecialties.current?.value?.trim()
        if (specialties) payload.specialties = specialties

        const city = inputCity.current?.value?.trim()
        if (city) payload.city = city

        const stateUf = inputState.current?.value?.trim()
        if (stateUf) payload.state = stateUf
      }

      if (role === 'FAMILIAR') {
        const beneficiary = inputBeneficiaryName.current?.value?.trim()
        const relationship = inputRelationship.current?.value?.trim()
        const parts = []
        if (beneficiary) parts.push(`Beneficiário: ${beneficiary}`)
        if (relationship) parts.push(`Parentesco: ${relationship}`)
        if (parts.length) payload.description = parts.join(' | ')
      }

      await api.post('/users', payload)
      navigate('/login')
    } catch (err) {
      console.error(err)
   toast.error(formatRegisterError(err))
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
          <h2 className="text-xl font-bold text-virla-texto mb-2">Cadastro</h2>

          <IconField icon={Person}>
            <input ref={inputName} type="text" placeholder="Nome completo" className={FIELD_CLASS} />
          </IconField>

          <IconField icon={CalendarMonth}>
            <input
              ref={inputBirthDate}
              type="date"
              className={`${FIELD_CLASS} cursor-pointer`}
              max={new Date().toISOString().split('T')[0]}
            />
          </IconField>

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

          <ProfileImageUpload value={profileImage} onChange={setProfileImage} />

          {role === 'CUIDADOR' && (
            <div className="space-y-4 pt-1 border-t border-virla-roxo/10">
              <p className="text-xs font-semibold text-virla-roxo/80 uppercase tracking-wide">
                Perfil profissional (Cuidador)
              </p>

              <IconField icon={Payments}>
                <input
                  ref={inputHourlyRate}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Valor por hora (R$, opcional)"
                  className={FIELD_CLASS}
                />
              </IconField>

              <IconField icon={Badge}>
                <input
                  ref={inputRegisterNumber}
                  type="text"
                  placeholder="Registro profissional — COREN, CRP… (opcional)"
                  className={FIELD_CLASS}
                />
              </IconField>

              <IconField icon={Psychology}>
                <input
                  ref={inputApproach}
                  type="text"
                  placeholder="Abordagem — ex.: TCC, home care (opcional)"
                  className={FIELD_CLASS}
                />
              </IconField>

              <IconField icon={LocalOffer} iconTop>
                <textarea
                  ref={inputSpecialties}
                  placeholder="Especialidades, separadas por vírgula (opcional)"
                  rows={2}
                  className={`${FIELD_CLASS} resize-none pt-3`}
                />
              </IconField>

              <IconField icon={LocationOn}>
                <input ref={inputCity} type="text" placeholder="Cidade (opcional)" className={FIELD_CLASS} />
              </IconField>

              <IconField icon={PinDrop}>
                <input
                  ref={inputState}
                  type="text"
                  placeholder="Estado — UF (opcional)"
                  className={FIELD_CLASS}
                  maxLength={2}
                />
              </IconField>
            </div>
          )}

          {role === 'FAMILIAR' && (
            <div className="space-y-4 pt-1 border-t border-virla-roxo/10">
              <p className="text-xs font-semibold text-virla-roxo/80 uppercase tracking-wide">
                Perfil familiar
              </p>
              <IconField icon={FamilyRestroom}>
                <input
                  ref={inputBeneficiaryName}
                  type="text"
                  placeholder="Nome do beneficiário (opcional)"
                  className={FIELD_CLASS}
                />
              </IconField>
              <IconField icon={Person}>
                <input
                  ref={inputRelationship}
                  type="text"
                  placeholder="Parentesco — ex.: filho(a), cônjuge (opcional)"
                  className={FIELD_CLASS}
                />
              </IconField>
              <p className="text-xs text-virla-texto/50">
                O pagamento via PIX é feito por você após o cuidador gerar a cobrança no chat.
              </p>
            </div>
          )}

          <IconField icon={Description} iconTop>
            <textarea
              ref={inputBio}
              placeholder="Fale um pouco sobre você…"
              rows={3}
              className={`${FIELD_CLASS} resize-none pt-3`}
            />
          </IconField>

          <IconField icon={Email}>
            <input ref={inputEmail} type="email" placeholder="seu@email.com" className={FIELD_CLASS} />
          </IconField>

          <IconField icon={Lock}>
            <input ref={inputPassword} type="password" placeholder="Senha segura" className={FIELD_CLASS} />
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
