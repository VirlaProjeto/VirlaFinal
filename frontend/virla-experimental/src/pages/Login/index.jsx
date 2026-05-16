import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Email from '@mui/icons-material/Email'
import Lock from '@mui/icons-material/Lock'
import Login from '@mui/icons-material/Login'
import ArrowBack from '@mui/icons-material/ArrowBack'
import api from '../../services/api'
import { FIELD_CLASS } from '../../constants/formStyles'
import { ButtonSpinner } from '../../components/Spinner'
import { isValidEmail } from '../../utils/validators'

export default function LoginPage() {
  const navigate = useNavigate()
  const inputEmail = useRef()
  const inputPassword = useRef()
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (loading) return
    const email = inputEmail.current.value.trim()
    if (!isValidEmail(email)) {
      alert('Informe um e-mail válido.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/login', {
        email,
        password: inputPassword.current.value,
      })

      localStorage.setItem('meuToken', res.data.token)
      localStorage.setItem('meuId', res.data.user.id)
      localStorage.setItem('meuNome', res.data.user.name)
      if (res.data.user?.role) localStorage.setItem('meuRole', res.data.user.role)

      navigate('/home')
    } catch (err) {
      console.error(err)
      alert('E-mail ou senha incorretos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-virla-neve flex items-center justify-center px-4"
      style={{
        backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(128,0,128,0.12), transparent)',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <img src="/favicon.ico" alt="VIRLA Logo" className="w-12 h-12 object-contain mb-3" />
          <h1
            className="text-3xl font-black text-virla-roxo tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            VIRLA
          </h1>
          <p className="text-virla-texto/60 text-sm mt-1">Bem-vindo de volta</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-virla-roxo/10 p-8 space-y-4">
          <h2 className="text-xl font-bold text-virla-texto mb-2">Entrar na plataforma</h2>

          <div className="relative">
            <Email
              sx={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/50 pointer-events-none"
            />
            <input
              ref={inputEmail}
              type="email"
              placeholder="seu@email.com"
              className={FIELD_CLASS}
            />
          </div>

          <div className="relative">
            <Lock
              sx={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-virla-roxo/50 pointer-events-none"
            />
            <input
              ref={inputPassword}
              type="password"
              placeholder="Sua senha"
              className={FIELD_CLASS}
            />
          </div>

          <button
            onClick={handleLogin}
            type="button"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       bg-virla-roxo hover:bg-virla-roxohighlight text-white font-semibold
                       shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 mt-2
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? <ButtonSpinner size={20} /> : <Login sx={{ fontSize: 20 }} />}
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="text-center text-sm text-virla-texto/60 pt-1">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-virla-roxo font-semibold hover:underline">
              Criar conta grátis
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
