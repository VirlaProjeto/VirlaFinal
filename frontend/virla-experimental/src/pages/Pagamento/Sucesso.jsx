// Tela de confirmação simples mostrada após um PIX ser confirmado.

import { useNavigate } from 'react-router-dom'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Home from '@mui/icons-material/Home'
import Chat from '@mui/icons-material/Chat'

export default function PagamentoSucesso() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen pt-16 bg-virla-neve flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center shadow-inner">
            <CheckCircle sx={{ fontSize: 48 }} className="text-green-500" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black text-virla-roxo" style={{ fontFamily: "'Playfair Display', serif" }}>
            Pagamento confirmado!
          </h1>
          <p className="text-virla-texto/60 text-sm mt-2">
            Seu pagamento foi processado com sucesso. Bem-vindo à Virla!
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-virla-roxo text-white font-semibold shadow-md hover:bg-virla-roxohighlight transition-all"
          >
            <Home sx={{ fontSize: 20 }} /> Ir para o painel
          </button>
          <button
            type="button"
            onClick={() => navigate('/feed')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-virla-roxo text-virla-roxo font-semibold hover:bg-virla-roxo/10 transition-all"
          >
            <Chat sx={{ fontSize: 20 }} /> Explorar profissionais
          </button>
        </div>
      </div>
    </div>
  )
}
