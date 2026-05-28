import prisma from '../lib/prisma.js'
import { createBilling, getBillingStatus } from '../services/abacatePayService.js'
import { createEscrowForPayment, holdEscrowFunds } from '../services/escrowService.js'
import { validateAmountCents } from '../utils/validation.js'
import { markChargePaidForPayment } from '../services/chargeRequestService.js'

function normalizeGatewayStatus(status) {
  const up = String(status ?? '').toUpperCase()
  if (up === 'PAID') return 'PAID'
  if (up === 'EXPIRED') return 'EXPIRED'
  if (up === 'CANCELED' || up === 'CANCELLED') return 'CANCELED'
  return 'PENDING'
}

export const initiateBilling = async (req, res) => {
  try {
    const userId = req.userId

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ msg: 'Usuário não encontrado.' })
    }

    const { amount, description, taxId, cellphone, payeeId, chargeRequestId } = req.body

    const amountCheck = validateAmountCents(amount)
    if (!amountCheck.valid) {
      return res.status(422).json({ msg: amountCheck.error })
    }

    const payee = await prisma.user.findUnique({ where: { id: payeeId } })
    if (!payee) {
      return res.status(404).json({ msg: 'Cuidador não encontrado.' })
    }
    if (payee.role !== 'CUIDADOR') {
      return res.status(422).json({ msg: 'payeeId deve referenciar um usuário CUIDADOR.' })
    }
    if (payeeId === userId) {
      return res.status(422).json({ msg: 'O cuidador não pode ser o próprio pagador.' })
    }

    let chargeRequest = null
    if (chargeRequestId) {
      chargeRequest = await prisma.chargeRequest.findUnique({
        where: { id: chargeRequestId },
      })
      if (!chargeRequest || chargeRequest.status !== 'PENDING') {
        return res.status(404).json({ msg: 'Cobrança não encontrada ou já processada.' })
      }
      if (chargeRequest.familiarId !== userId) {
        return res.status(403).json({ msg: 'Esta cobrança não pertence a você.' })
      }
      if (chargeRequest.caregiverId !== payeeId) {
        return res.status(422).json({ msg: 'Cuidador não corresponde à cobrança.' })
      }
      if (chargeRequest.totalAmount !== amountCheck.amount) {
        return res.status(422).json({
          msg: 'Valor do pagamento não confere com a cobrança gerada pelo cuidador.',
        })
      }
    }

    let billing
    try {
      billing = await createBilling({
        user: { name: user.name, email: user.email, taxId, cellphone },
        amount: amountCheck.amount,
        description: description ?? chargeRequest?.description ?? 'Serviço Virla',
      })
    } catch (err) {
      console.error('[paymentController] Gateway error:', err.message)
      const isValidation =
        err.message.startsWith('CPF') ||
        err.message.startsWith('E-mail') ||
        err.message.startsWith('Valor inválido')
      return res.status(isValidation ? 422 : 502).json({
        msg: isValidation ? err.message : 'Falha ao comunicar com o gateway de pagamento.',
      })
    }

    const { payment, escrow } = await prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.payment.create({
        data: {
          billingId: billing.billingId,
          gatewayBillingId: null,
          userId,
          amount: amountCheck.amount,
          status: 'PENDING',
        },
      })

      const escrowRecord = await createEscrowForPayment(tx, {
        paymentId: paymentRecord.id,
        payerId: userId,
        payeeId,
        amount: amountCheck.amount,
        actorId: userId,
      })

      return { payment: paymentRecord, escrow: escrowRecord }
    })

    return res.status(201).json({
      billingId: billing.billingId,
      pixCode: billing.pixCode,
      qrCodeBase64: billing.qrCodeBase64,
      checkoutUrl: billing.checkoutUrl,
      status: billing.status,
      gatewayBillingId: billing.gatewayBillingId ?? null,
      expiresAt: billing.expiresAt ?? null,
      devMode: billing.devMode ?? false,
      escrowId: escrow.id,
      escrowStatus: escrow.status,
      paymentId: payment.id,
      chargeRequestId: chargeRequest?.id ?? null,
    })
  } catch (err) {
    console.error('[paymentController] initiateBilling:', err)
    return res.status(500).json({ msg: 'Erro interno ao iniciar pagamento.' })
  }
}

export const pollBillingStatus = async (req, res) => {
  try {
    const { billingId } = req.params

    const payment = await prisma.payment.findUnique({
      where: { billingId },
      include: { escrow: { select: { id: true, status: true } } },
    })

    if (!payment) {
      return res.status(404).json({ msg: 'Pagamento não encontrado.' })
    }

    if (payment.userId !== req.userId) {
      return res.status(403).json({ msg: 'Acesso negado.' })
    }

    // Se já estiver pago no nosso banco, responde direto
    if (payment.status === 'PAID') {
      return res.status(200).json({
        status: 'PAID',
        paidAt: payment.paidAt,
        escrowStatus: payment.escrow?.status ?? null,
        escrowId: payment.escrow?.id ?? null,
        expiresAt: null,
      })
    }

    let billing;
    try {
      billing = await getBillingStatus(billingId);
    } catch (apiError) {
      console.warn(`[Pagamento] Falha na API externa para o PIX ${billingId}:`, apiError.message);
      // Degradação graciosa: Se a API falhar ou der timeout, mantemos o status atual (PENDING)
      return res.status(200).json({
        status: payment.status,
        paidAt: payment.paidAt,
        escrowStatus: payment.escrow?.status ?? null,
        escrowId: payment.escrow?.id ?? null,
        expiresAt: null,
      });
    }

    const gatewayStatus = normalizeGatewayStatus(billing.status);

    if (gatewayStatus !== payment.status) {
      await prisma.payment.updateMany({
        where: { billingId, status: { not: gatewayStatus } },
        data: {
          status: gatewayStatus,
          paidAt: gatewayStatus === 'PAID' ? new Date() : null,
        },
      })

      if (gatewayStatus === 'PAID') {
        await holdEscrowFunds(payment.id)
        await markChargePaidForPayment(payment.id)
      }
    }

    const fresh = await prisma.payment.findUnique({
      where: { billingId },
      include: { escrow: { select: { id: true, status: true } } },
    })

    return res.status(200).json({
      status: fresh.status,
      paidAt: fresh.paidAt,
      escrowStatus: fresh.escrow?.status ?? null,
      escrowId: fresh.escrow?.id ?? null,
      expiresAt: billing.expiresAt ?? null,
    })
  } catch (err) {
    console.error('[paymentController] pollBillingStatus:', err.message)
    return res.status(500).json({ msg: 'Erro ao consultar status.' })
  }
}