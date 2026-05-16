import prisma from '../lib/prisma.js'
import { holdEscrowFunds } from './escrowService.js'
import { markChargePaidForPayment } from './chargeRequestService.js'

const PAID_EVENT_TYPES = new Set([
  'BILLING.PAID',
  'billing.paid',
  'PAID',
  'checkout.completed',
  'transparent.completed',
  'pix.paid',
  'PIX.PAID',
])

/** Extrai o ID da cobrança (bill_*, pix_char_*, char_*, etc.) do payload do webhook. */
function extractBillingId(event) {
  const data = event?.data ?? event
  return (
    data?.id ??
    data?.billing?.id ??
    data?.checkout?.id ??
    data?.transparent?.id ??
    event?.billing?.id ??
    null
  )
}

/**
 * Processa evento do AbacatePay de forma síncrona (antes do HTTP 200).
 * Separa reconciliação de pagamento (DB) da custódia (HELD).
 *
 * @param {object} event - payload JSON do webhook
 * @returns {Promise<{ handled: boolean; billingId?: string }>}
 */
export async function processPaymentEvent(event) {
  const eventType = event?.event ?? event?.type ?? ''
  const billingId = extractBillingId(event)

  if (!PAID_EVENT_TYPES.has(eventType)) {
    console.info(`[webhook] Evento ignorado: "${eventType}"`)
    return { handled: false }
  }

  if (!billingId || typeof billingId !== 'string') {
    console.error('[webhook] Evento PAID sem billingId.')
    return { handled: false }
  }

  const paymentResult = await prisma.payment.updateMany({
    where: { billingId, status: { not: 'PAID' } },
    data: { status: 'PAID', paidAt: new Date() },
  })

  if (paymentResult.count === 0) {
    const existing = await prisma.payment.findUnique({ where: { billingId } })
    if (!existing) {
      console.error(`[webhook] Pagamento "${billingId}" não encontrado no banco.`)
      return { handled: false, billingId }
    }
    console.info(`[webhook] Pagamento "${billingId}" já PAID — idempotente.`)
  } else {
    console.info(`[webhook] Pagamento "${billingId}" marcado como PAID.`)
  }

  const payment = await prisma.payment.findUnique({
    where: { billingId },
    include: { escrow: true },
  })

  if (!payment?.escrow) {
    console.warn(`[webhook] Sem custódia para billing "${billingId}".`)
    return { handled: true, billingId }
  }

  await markChargePaidForPayment(payment.id)

  const holdResult = await holdEscrowFunds(payment.id)

  if (holdResult.updated) {
    console.info(
      `[webhook] Escrow ${holdResult.escrow.id} → HELD (billing="${billingId}").`,
    )
  } else {
    console.info(`[webhook] Escrow hold skip: ${holdResult.reason}`)
  }

  return { handled: true, billingId }
}
