import { Routes, Route, useLocation } from 'react-router-dom'
import Cadastro from './pages/Cadastro'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Home from './pages/Home'
import Perfil from './pages/Perfil'
import Chat from './pages/Chat'
import Landing from './pages/Landing'
import Pagamento from './pages/Pagamento'
import Menu from './components/Menu'
import User from './pages/User'

const HIDDEN_MENU_ROUTES = ['/', '/login', '/cadastro']

export default function AppShell() {
  const location = useLocation()
  const showMenu = !HIDDEN_MENU_ROUTES.includes(location.pathname)

  return (
    <>
      {showMenu && <Menu />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/chat/:userId" element={<Chat />} />
        <Route path="/user/:userId" element={<User />} />
        <Route path="/pagamento" element={<Pagamento />} />
      </Routes>
    </>
  )
}
