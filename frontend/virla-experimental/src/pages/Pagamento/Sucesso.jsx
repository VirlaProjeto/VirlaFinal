import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Home from '@mui/icons-material/Home'
import Chat from '@mui/icons-material/Chat'
import Download from '@mui/icons-material/Download'

function formatCentsBRL(value) {
  const amount = Number(value ?? 0) / 100
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

export default function PagamentoSucesso() {
  const navigate = useNavigate()
  const location = useLocation()
  const receipt = location.state ?? {}

  useEffect(() => {
    sessionStorage.removeItem('virla_pag_sessao')
  }, [])

  function handleDownloadReceipt() {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const paidAt = receipt.paidAt
      ? new Date(receipt.paidAt).toLocaleString('pt-BR')
      : new Date().toLocaleString('pt-BR')

    ctx.fillStyle = '#f8f7fb'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#5a2a82'
    ctx.fillRect(80, 80, 920, 150)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 54px Arial'
    ctx.fillText('Comprovante de Pagamento', 120, 175)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(80, 280, 920, 880)
    ctx.strokeStyle = '#d6c9e7'
    ctx.lineWidth = 3
    ctx.strokeRect(80, 280, 920, 880)

    ctx.fillStyle = '#2d2138'
    ctx.font = 'bold 42px Arial'
    ctx.fillText('Status: APROVADO', 130, 370)

    ctx.font = '32px Arial'
    ctx.fillText(`Valor: ${formatCentsBRL(receipt.amount)}`, 130, 470)
    ctx.fillText(`Descrição: ${receipt.description ?? 'Serviço Virla'}`, 130, 550)
    ctx.fillText(`Billing ID: ${receipt.billingId ?? '-'}`, 130, 630)
    ctx.fillText(`Data/Hora: ${paidAt}`, 130, 710)
    ctx.fillText('Processado por AbacatePay', 130, 790)

    ctx.fillStyle = '#6f5b85'
    ctx.font = '26px Arial'
    ctx.fillText('Virla - comprovante digital', 130, 1080)

    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `comprovante-${receipt.billingId ?? Date.now()}.png`
    a.click()
  }

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
            onClick={handleDownloadReceipt}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold shadow-md hover:bg-green-700 transition-all"
          >
            <Download sx={{ fontSize: 20 }} /> Baixar Comprovante
          </button>
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