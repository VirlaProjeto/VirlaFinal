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

/**
 * Extrai os campos do QR Code PIX da resposta bruta da AbacatePay.
 *
 * A AbacatePay retorna os dados do PIX dentro do objeto `pix` aninhado:
 *   billing.pix.brCode       → código Pix copia-e-cola
 *   billing.pix.brCodeBase64 → imagem do QR Code em Base64
 *
 * Versões anteriores do código tentavam `pixQrCode` e `pix.code` /
 * `pix.qrCodeBase64`, que não existem na resposta real da API — por
 * isso o QR Code nunca chegava ao cliente.
 *
 * Também sanitizamos o base64: se vier com prefixo "data:image/...;base64,"
 * removemos, pois o frontend já o concatena manualmente.
 *
 * @param {object} billing - Objeto `data` da resposta da AbacatePay
 * @returns {{ pixCode: string, qrCodeBase64: string }}
 */
function extractPixFields(billing) {
  // CORREÇÃO PRINCIPAL: campo correto é billing.pix.brCode
  const pixCode =
    billing.pix?.brCode ??
    billing.pix?.qrCode ??
    billing.pixQrCode ??
    billing.pix?.code ??
    ''

  // CORREÇÃO PRINCIPAL: campo correto é billing.pix.brCodeBase64
  let qrCodeBase64 =
    billing.pix?.brCodeBase64 ??
    billing.pix?.qrCodeBase64 ??
    billing.pixQrCodeBase64 ??
    ''

  // Remove prefixo "data:image/...;base64," se presente
  if (qrCodeBase64.startsWith('data:')) {
    const commaIdx = qrCodeBase64.indexOf(',')
    if (commaIdx !== -1) {
      qrCodeBase64 = qrCodeBase64.slice(commaIdx + 1)
    }
  }

  return { pixCode, qrCodeBase64 }
}

export function buildBillingPayload({
  user,
  amount,
  description = 'Serviço Virla',
  returnUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173',
  completionUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/pagamento/sucesso`,
  frequency = 'ONE_TIME',
  // NOVO: expiração em segundos — 300 = 5 minutos
  expiresIn = 300,
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
    // NOVO: define expiração de 5 minutos (300 segundos)
    expiresIn,
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

  // Log de diagnóstico: ajuda a identificar alterações futuras nos campos da API
  console.info('[AbacatePay] Campos retornados na cobrança:', {
    id: billing.id,
    status: billing.status,
    pixKeys: billing.pix ? Object.keys(billing.pix) : 'pix ausente',
    topLevelKeys: Object.keys(billing),
  })

  const { pixCode, qrCodeBase64 } = extractPixFields(billing)

  return {
    billingId: billing.id,
    pixCode,
    qrCodeBase64,
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
