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

/** Base URL do front-end (sem barra final). Usada em returnUrl/completionUrl do checkout hospedado. */
export function getFrontendBaseUrl() {
  const url = (process.env.FRONTEND_URL || 'http://localhost:5173').trim()
  return url.replace(/\/+$/, '')
}

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

/** Remove prefixo data-URL; o front monta `data:image/png;base64,...`. */
export function normalizeQrBase64(value) {
  if (!value) return ''
  const str = String(value)
  const prefix = 'data:image/png;base64,'
  return str.startsWith(prefix) ? str.slice(prefix.length) : str
}

/**
 * Payload para checkout hospedado (link AbacatePay) — mantido para uso futuro.
 */
export function buildBillingPayload({
  user,
  amount,
  description = 'Serviço Virla',
  returnUrl = getFrontendBaseUrl(),
  completionUrl = `${getFrontendBaseUrl()}/pagamento/sucesso`,
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

/**
 * Payload para PIX transparente (QR + copia-e-cola na própria tela).
 * @see https://docs.abacatepay.com/api-reference/criar-qrcode-pix
 */
export function buildPixQrCodePayload({ user, amount, description = 'Serviço Virla' }) {
  const taxIdResult = validateTaxId(user.taxId)
  if (!taxIdResult.valid) {
    throw new Error(`CPF inválido: "${user.taxId}".`)
  }
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Valor inválido: ${amount}. Informe centavos inteiros positivos.`)
  }

  const payload = {
    amount,
    description: String(description).slice(0, 37),
  }

  const cellphone = user.cellphone ? String(user.cellphone).replace(/\D/g, '') : ''
  if (user.name && validateEmail(user.email) && cellphone) {
    payload.customer = {
      name: user.name,
      email: user.email,
      taxId: taxIdResult.cleaned,
      cellphone,
    }
  }

  return payload
}

function mapPixResponse(pix) {
  return {
    billingId: pix.id,
    pixCode:
      pix.brCode ??
      pix.pixQrCode ??
      pix.pix?.code ??
      '',
    qrCodeBase64: normalizeQrBase64(
      pix.brCodeBase64 ?? pix.pixQrCodeBase64 ?? pix.pix?.qrCodeBase64 ?? '',
    ),
    checkoutUrl: pix.url ?? pix.checkoutUrl ?? '',
    status: pix.status ?? 'PENDING',
    rawResponse: pix,
  }
}

/**
 * Cria cobrança PIX com QR Code e código copia-e-cola (endpoint correto para checkout embutido).
 */
export async function createBilling(params) {
  const payload = buildPixQrCodePayload(params)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  let response
  try {
    response = await fetch(`${ABACATEPAY_API_URL}/pixQrCode/create`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AbacatePay: timeout na criação da cobrança PIX.')
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

  const pix = data?.data ?? data
  return mapPixResponse(pix)
}

export async function getBillingStatus(billingId) {
  const url = new URL(`${ABACATEPAY_API_URL}/pixQrCode/check`)
  url.searchParams.set('id', billingId)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`AbacatePay status check failed (HTTP ${response.status})`)
  }
  const pix = data?.data ?? data
  return {
    status: pix.status ?? 'UNKNOWN',
    expiresAt: pix.expiresAt ?? null,
  }
}
