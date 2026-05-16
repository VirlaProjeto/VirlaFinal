import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Logout from '@mui/icons-material/Logout'

export default function Menu() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hoverTop, setHoverTop] = useState(true)

  const fazerLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const links = [
    { to: '/home', label: 'Início' },
    { to: '/feed', label: 'Feed' },
    { to: '/perfil', label: 'Perfil' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 overflow-hidden transition-[max-height] duration-300 ease-out shadow-sm"
      style={{ maxHeight: hoverTop ? '4rem' : '0.75rem' }}
      onMouseEnter={() => setHoverTop(true)}
      onMouseLeave={() => setHoverTop(false)}
    >
      <nav
        className={`h-16 flex items-center bg-white/85 backdrop-blur-md border-b border-virla-roxomid/40 font-body
                    transition-transform duration-300 ease-out ${hoverTop ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-4xl mx-auto px-4 w-full flex items-center justify-between gap-4">
          <Link to="/home" className="flex items-center gap-2 flex-shrink-0">
            <img src="/favicon.ico" alt="VIRLA Logo" className="w-10 h-10 object-contain shrink-0" />
            <span className="font-display font-black text-xl tracking-wide text-virla-roxodark">VIRLA</span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                            ${
                              isActive(to)
                                ? 'bg-virla-roxo/10 text-virla-roxo font-semibold'
                                : 'text-virla-muted hover:text-virla-roxo hover:bg-virla-roxo/8'
                            }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={fazerLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-virla-roxomid/50
                       text-sm font-medium text-virla-muted
                       hover:border-virla-roxo hover:text-virla-roxo hover:bg-virla-roxo/8
                       transition-all duration-150"
          >
            <Logout sx={{ fontSize: 16 }} />
            Sair
          </button>
        </div>
      </nav>
    </div>
  )
}
