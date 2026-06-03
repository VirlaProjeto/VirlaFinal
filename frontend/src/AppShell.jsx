import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { SocketProvider } from './context/SocketContext' 

import NotFound from './pages/NotFound'
import Cadastro from './pages/Cadastro'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Home from './pages/Home'
import Perfil from './pages/Perfil'
import Chat from './pages/Chat'
import Landing from './pages/Landing'
import Pagamento from './pages/Pagamento'
import PagamentoSucesso from './pages/Pagamento/Sucesso'
import Menu from './components/Menu'
import User from './pages/User'

const HIDDEN_MENU_ROUTES = ['/', '/login', '/cadastro']

/**
 * Guarda de autenticação genérica.
 * Redireciona para /login se não houver token + userId no localStorage.
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('meuToken')
  const userId = localStorage.getItem('meuId')
  if (!token || !userId) {
    return <Navigate to="/login" replace />
  }
  return children
}

/**
 * Guarda específica para a tela de pagamento (/pagamento).
 * Exige:
 * 1. Usuário autenticado (token + userId).
 * 2. Dados de pagamento presentes no location.state
 * (amount + payeeId são obrigatórios para iniciar um PIX).
 *
 * Sem esses dados o usuário não chegou aqui pelo fluxo correto
 * (botão de pagamento no chat) — redireciona para /home.
 */
function PagamentoRoute({ children }) {
  const location = useLocation()
  const token = localStorage.getItem('meuToken')
  const userId = localStorage.getItem('meuId')

  if (!token || !userId) {
    return <Navigate to="/login" replace />
  }

  const { amount, payeeId } = location.state ?? {}
  if (!amount || !payeeId) {
    return <Navigate to="/home" replace />
  }

  return children
}

/**
 * Guarda para a tela de sucesso do pagamento (/pagamento/sucesso).
 * Exige:
 * 1. Usuário autenticado.
 * 2. Flag `virla_pag_sessao` em sessionStorage — gravada em
 * Pagamento/index.jsx ao receber a resposta da API com sucesso.
 * Isso garante que só quem passou pela tela de pagamento acesse
 * a confirmação.
 */
function PagamentoSucessoRoute({ children }) {
  const token = localStorage.getItem('meuToken')
  const userId = localStorage.getItem('meuId')
  const sessaoValida = sessionStorage.getItem('virla_pag_sessao') === 'true'

  if (!token || !userId) {
    return <Navigate to="/login" replace />
  }

  if (!sessaoValida) {
    return <Navigate to="/home" replace />
  }

  return children
}

export default function AppShell() {
  const location = useLocation()
  const showMenu = !HIDDEN_MENU_ROUTES.includes(location.pathname)

  return (
    <SocketProvider>
      <Toaster position="top-right" richColors />
      {showMenu && <Menu />}
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        {/* Rotas autenticadas */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<ProtectedRoute><User /></ProtectedRoute>} />

        {/* Rotas de pagamento — proteção por sessão de pagamento */}
        <Route
          path="/pagamento"
          element={
            <PagamentoRoute>
              <Pagamento />
            </PagamentoRoute>
          }
        />
        <Route
          path="/pagamento/sucesso"
          element={
            <PagamentoSucessoRoute>
              <PagamentoSucesso />
            </PagamentoSucessoRoute>
          }
        />
        
        {/* Fallback 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SocketProvider>
  )
}