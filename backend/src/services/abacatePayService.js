import dotenv from 'dotenv'

dotenv.config()

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1'
const API_TOKEN = process.env.ABACATEPAY_TOKEN

if (!API_TOKEN) {
  console.warn('[AbacatePay] ABACATEPAY_TOKEN não configurado.')
}

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_TOKEN}`,
  }
}

import { isValidCPF, stripCpf } from '../utils/cpf.js'
import { isValidEmail } from '../utils/email.js'

/**
 * Valida CPF (apenas 11 dígitos com checksum).
 * @param {string} value
 */
export function validateTaxId(value) {
  const cleaned = stripCpf(value)
  if (cleaned.length === 11) {
    return { valid: isValidCPF(cleaned), cleaned, type: 'CPF' }
  }
  return { valid: false, cleaned, type: null }
}

export function validateEmail(email) {
  return isValidEmail(email)
}

export function buildBillingPayload({
  user,
  amount,
  description = 'Serviço Virla',
  returnUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173',
  completionUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/pagamento/sucesso`,
  frequency = 'ONE_TIME',
}) {
  const taxIdResult = validateTaxId(user.taxId)
  if (!taxIdResult.valid) {
    throw new Error(`CPF inválido: "${user.taxId}".`)
  }
  if (!validateEmail(user.email)) {
    throw new Error(`E-mail inválido: "${user.email}".`)
  }
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Valor inválido: ${amount}. Informe centavos inteiros positivos.`)
  }

  return {
    frequency,
    methods: ['PIX'],
    products: [
      {
        externalId: `virla-${Date.now()}`,
        name: description,
        quantity: 1,
        price: amount,
      },
    ],
    returnUrl,
    completionUrl,
    customer: {
      name: user.name,
      email: user.email,
      taxId: taxIdResult.cleaned,
      ...(user.cellphone && { cellphone: String(user.cellphone).replace(/\D/g, '') }),
    },
  }
}

export async function createBilling(params) {
  const payload = buildBillingPayload(params)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  let response
  try {
    response = await fetch(`${ABACATEPAY_API_URL}/billing/create`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AbacatePay: timeout na criação da cobrança.')
    }
    throw new Error(`AbacatePay: falha de rede — ${err.message}`)
  } finally {
    clearTimeout(timeout)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      data?.error ??
      `AbacatePay HTTP ${response.status}: ${JSON.stringify(data)}`
    throw new Error(msg)
  }

  const billing = data?.data ?? data
  return {
    billingId: billing.id,
    pixCode: billing.pixQrCode ?? billing.pix?.code ?? '',
    qrCodeBase64: billing.pixQrCodeBase64 ?? billing.pix?.qrCodeBase64 ?? '',
    checkoutUrl: billing.url ?? billing.checkoutUrl ?? '',
    status: billing.status ?? 'PENDING',
    rawResponse: billing,
  }
}

export async function getBillingStatus(billingId) {
  const response = await fetch(`${ABACATEPAY_API_URL}/billing/${billingId}`, {
    method: 'GET',
    headers: buildHeaders(),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`AbacatePay status check failed (HTTP ${response.status})`)
  }
  return data?.data ?? data
}
