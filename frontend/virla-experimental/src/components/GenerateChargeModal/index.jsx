import { useState } from 'react'
import { createPortal } from 'react-dom'
import Close from '@mui/icons-material/Close'
import Receipt from '@mui/icons-material/Receipt'
import api from '../../services/api'
import { FIELD_CLASS } from '../../constants/formStyles'
import { ButtonSpinner } from '../Spinner'
import { calculateChargeTotalCents, formatCentsBRL, reaisToCents } from '../../utils/paymentFees'

export default function GenerateChargeModal({ familiarId, familiarName, onClose, onSuccess }) {
  const [baseReais, setBaseReais] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** Quem pode ver este modal é decidido só no pai (Chat). Aqui apenas montamos UI. */

  const baseCents = reaisToCents(baseReais)
  const fees = baseCents ? calculateChargeTotalCents(baseCents) : null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!baseCents) {
      const msg = 'Informe um valor base válido em reais.'
      setError(msg)
      alert(msg)
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/payments/charge-requests', {
        familiarId,
        baseAmount: baseCents,
        description:
          description.trim() ||
          (familiarName ? `Serviço Virla — atendimento (${familiarName})` : 'Serviço Virla'),
      })
      onSuccess?.(res.data)
      onClose()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.msg ?? 'Erro ao gerar cobrança. Tente novamente.'
      setError(msg)
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] isolate flex items-center justify-center bg-black/50 p-4 supports-[backdrop-filter]:backdrop-blur-[2px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="charge-modal-title"
        className="relative z-[1] w-full max-w-md rounded-2xl border border-virla-roxo/10 bg-white p-6 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="charge-modal-title" className="text-lg font-bold text-virla-roxo flex items-center gap-2">
            <Receipt sx={{ fontSize: 22 }} />
            Gerar Cobrança
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-virla-roxo/10 text-virla-texto/60"
            aria-label="Fechar"
          >
            <Close sx={{ fontSize: 22 }} />
          </button>
        </div>

        <p className="text-sm text-virla-texto/60">
          A cobrança será enviada para <strong>{familiarName ?? 'o familiar'}</strong> pagar via PIX.
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
              Valor base do serviço (R$) *
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex.: 150,00"
              value={baseReais}
              onChange={(e) => setBaseReais(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          {fees && (
            <div className="text-sm bg-virla-roxo/5 rounded-xl p-3 space-y-1 border border-virla-roxo/10">
              {/* Total = x + (x * 0.07) + 0.80 — x = valor base (R$) informado pelo cuidador */}
              <p className="flex justify-between">
                <span>Valor base</span>
                <span>{formatCentsBRL(fees.baseCents)}</span>
              </p>
              <p className="flex justify-between text-virla-texto/70">
                <span>Taxa plataforma (7%)</span>
                <span>{formatCentsBRL(fees.platformFeeCents)}</span>
              </p>
              <p className="flex justify-between text-virla-texto/70">
                <span>Taxa fixa</span>
                <span>{formatCentsBRL(fees.fixedFeeCents)}</span>
              </p>
              <p className="flex justify-between font-bold text-virla-roxo pt-1 border-t border-virla-roxo/10">
                <span>Total a pagar</span>
                <span>{formatCentsBRL(fees.totalCents)}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-virla-texto/60 uppercase tracking-wide mb-1.5">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={FIELD_CLASS}
              placeholder="Serviço Virla"
              maxLength={200}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-virla-roxo text-white font-semibold
                       hover:bg-virla-roxohighlight disabled:opacity-60"
          >
            {loading ? <ButtonSpinner size={20} /> : <Receipt sx={{ fontSize: 20 }} />}
            {loading ? 'Gerando…' : 'Enviar cobrança ao familiar'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
