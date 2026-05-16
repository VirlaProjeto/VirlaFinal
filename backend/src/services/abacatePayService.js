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
 * Payload para cobrança no painel AbacatePay (menu "Cobranças" / bill_*).
 * @see https://docs.abacatepay.com/api-reference/criar-uma-nova-cobran%C3%A7a
 */
export function buildBillingPayload({
  user,
  amount,
  description = 'Serviço Virla',
  returnUrl = getFrontendBaseUrl(),
  completionUrl = `${getFrontendBaseUrl()}/pagamento/sucesso`,
  frequency = 'ONE_TIME',
  externalId,
}) {
  const taxIdResult = validateTaxId(user.taxId)
  if (!taxIdResult.valid) {
    throw new Error(`CPF inválido: "${user.taxId}".`)
  }
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Valor inválido: ${amount}. Informe centavos inteiros positivos.`)
  }

  const payload = {
    frequency,
    methods: ['PIX'],
    products: [
      {
        externalId: externalId ?? `virla-bill-${Date.now()}`,
        name: description,
        quantity: 1,
        price: amount,
      },
    ],
    returnUrl,
    completionUrl,
    externalId: externalId ?? `virla-${Date.now()}`,
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

/**
 * Payload para PIX embutido (QR + copia-e-cola na tela Virla).
 * @see https://docs.abacatepay.com/api-reference/criar-qrcode-pix
 */
export function buildPixQrCodePayload({ user, amount, description = 'Serviço Virla', metadata }) {
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
    ...(metadata && Object.keys(metadata).length > 0 && { metadata }),
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

function mapPixResponse(pix, { gatewayBillingId = null, checkoutUrl = '' } = {}) {
  return {
    billingId: pix.id,
    gatewayBillingId,
    pixCode:
      pix.brCode ??
      pix.pixQrCode ??
      pix.pix?.code ??
      '',
    qrCodeBase64: normalizeQrBase64(
      pix.brCodeBase64 ?? pix.pixQrCodeBase64 ?? pix.pix?.qrCodeBase64 ?? '',
    ),
    checkoutUrl: checkoutUrl || pix.url || pix.checkoutUrl || '',
    status: pix.status ?? 'PENDING',
    devMode: pix.devMode ?? false,
    rawResponse: pix,
  }
}

async function abacatePost(path, body, label) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(`${ABACATEPAY_API_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg =
        data?.error ??
        `AbacatePay ${label} HTTP ${response.status}: ${JSON.stringify(data)}`
      throw new Error(msg)
    }

    return data?.data ?? data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`AbacatePay: timeout em ${label}.`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Registra cobrança no painel AbacatePay (lista "Cobranças", id bill_*).
 * Falha não bloqueia o PIX embutido.
 */
export async function createHostedBilling(params) {
  const externalId = `virla-${Date.now()}`
  const payload = buildBillingPayload({ ...params, externalId })
  const billing = await abacatePost('/billing/create', payload, 'billing/create')
  console.info(
    `[AbacatePay] Cobrança registrada no painel: ${billing.id} (devMode=${billing.devMode ?? '?'})`,
  )
  return billing
}

/**
 * Gera QR Code PIX para exibição na aplicação (id pix_char_*).
 */
export async function createPixQrCharge(params, { linkedBillingId } = {}) {
  const metadata = {
    virlaSource: 'virla-app',
    ...(linkedBillingId && { virlaBillingId: linkedBillingId }),
  }
  const payload = buildPixQrCodePayload({ ...params, metadata })
  const pix = await abacatePost('/pixQrCode/create', payload, 'pixQrCode/create')
  console.info(
    `[AbacatePay] PIX QR criado: ${pix.id} (devMode=${pix.devMode ?? '?'})`,
  )
  return pix
}

/**
 * Cria cobrança no painel + PIX embutido (QR na tela Virla).
 * O pagamento é rastreado pelo id do PIX (pix_char_*); a cobrança bill_* espelha no dashboard.
 */
export async function createBilling(params) {
  const externalId = `virla-${Date.now()}`

  let hosted = null
  try {
    hosted = await createHostedBilling({ ...params, externalId })
  } catch (err) {
    console.warn('[AbacatePay] Falha ao registrar cobrança no painel:', err.message)
  }

  const pix = await createPixQrCharge(params, {
    linkedBillingId: hosted?.id ?? null,
  })

  return mapPixResponse(pix, {
    gatewayBillingId: hosted?.id ?? null,
    checkoutUrl: hosted?.url ?? '',
  })
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
