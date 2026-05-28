import dotenv from 'dotenv'
import { stripCpf } from '../utils/cpf.js'
import { isValidEmail } from '../utils/email.js'

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

function getFrontendBaseUrl() {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173').trim().replace(/\/$/, '')
}

function normalizeQrBase64(raw) {
  if (!raw) return ''
  if (raw.startsWith('data:')) {
    const comma = raw.indexOf(',')
    return comma === -1 ? raw : raw.slice(comma + 1)
  }
  return raw
}

export function validateEmail(email) {
  return isValidEmail(email)
}

export function validateTaxId(value) {
  const cleaned = String(value ?? '').replace(/\D/g, '')
  return { valid: cleaned.length === 11, cleaned, type: cleaned.length === 11 ? 'CPF' : null }
}

async function abacatePost(path, body, label = path) {
  const url = `${ABACATEPAY_API_URL}${path}`
  console.info(`[AbacatePay] -> ${label}`, JSON.stringify(body))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    console.info(`[AbacatePay] <- ${label} HTTP ${res.status}`, JSON.stringify(data))
    if (!res.ok) {
      const msg = data?.error ?? data?.message ?? data?.msg ?? `AbacatePay ${label} HTTP ${res.status}`
      const error = new Error(msg)
      error.status = res.status
      error.responseBody = data
      throw error
    }
    return data?.data ?? data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AbacatePay: timeout na requisição.')
    }
    throw new Error(`AbacatePay: falha de rede — ${err.message}`)
  } finally {
    clearTimeout(timeout)
  }
}

export function buildBillingPayload({
  user,
  amount,
  description = 'Serviço Virla',
  returnUrl = getFrontendBaseUrl(),
  completionUrl = `${getFrontendBaseUrl()}/pagamento/sucesso`,
  frequency = 'ONE_TIME',
  expiresIn = 300,
  externalId,
} = {}) {
  const taxIdResult = validateTaxId(user.taxId)
  if (!taxIdResult.valid) throw new Error(`CPF inválido: "${user.taxId}".`)
  if (!validateEmail(user.email)) throw new Error(`E-mail inválido: "${user.email}".`)
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Valor inválido: ${amount}. Informe centavos inteiros positivos.`)
  }

  const payload = {
    externalId: externalId ?? `virla-${Date.now()}`,
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
    expiresIn,
  }

  const cellphone = user.cellphone ? String(user.cellphone).replace(/\D/g, '') : ''
  if (user.name && validateEmail(user.email)) {
    payload.customer = {
      name: user.name,
      email: user.email,
      taxId: stripCpf(taxIdResult.cleaned),
      ...(cellphone && { cellphone }),
    }
  }

  return payload
}

export function buildPixQrCodePayload({ user, amount, description = 'Serviço Virla', metadata, expiresInSeconds = 300 } = {}) {
  const taxIdResult = validateTaxId(user.taxId)
  if (!taxIdResult.valid) throw new Error(`CPF inválido: "${user.taxId}".`)
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Valor inválido: ${amount}. Informe centavos inteiros positivos.`)
  }

  const payload = {
    amount,
    description: String(description).slice(0, 37),
    expires_in: expiresInSeconds,
    ...(metadata && Object.keys(metadata).length > 0 && { metadata }),
  }

  const cellphone = user.cellphone ? String(user.cellphone).replace(/\D/g, '') : ''
  if (user.name && validateEmail(user.email)) {
    payload.customer = {
      name: user.name,
      email: user.email,
      taxId: stripCpf(taxIdResult.cleaned),
      ...(cellphone && { cellphone }),
    }
  }

  return payload
}

function mapPixResponse(pix, { gatewayBillingId = null, checkoutUrl = '' } = {}) {
  return {
    billingId: pix.id,
    gatewayBillingId,
    pixCode: pix.brCode ?? pix.pixQrCode ?? pix.pix?.code ?? '',
    qrCodeBase64: normalizeQrBase64(pix.brCodeBase64 ?? pix.pixQrCodeBase64 ?? pix.pix?.qrCodeBase64 ?? ''),
    checkoutUrl: checkoutUrl || pix.url || pix.checkoutUrl || '',
    status: pix.status ?? 'PENDING',
    expiresAt: pix.expiresAt ?? pix.expireAt ?? null,
    devMode: pix.devMode ?? false,
    rawResponse: pix,
  }
}

export async function createHostedBilling(params) {
  const externalId = `virla-${Date.now()}`
  const payload = buildBillingPayload({ ...params, externalId })
  const billing = await abacatePost('/billing/create', payload, 'billing/create')
  console.info(`[AbacatePay] Cobrança registrada no painel: ${billing.id} (devMode=${billing.devMode ?? '?'})`)
  return billing
}

export async function createPixQrCharge(params, { linkedBillingId } = {}) {
  const metadata = {
    virlaSource: 'virla-app',
    ...(linkedBillingId && { virlaBillingId: linkedBillingId }),
  }
  const payload = buildPixQrCodePayload({ ...params, metadata, expiresInSeconds: 300 })
  const pix = await abacatePost('/pixQrCode/create', payload, 'pixQrCode/create')
  console.info(`[AbacatePay] PIX QR criado: ${pix.id} (devMode=${pix.devMode ?? '?'})`)
  return pix
}

export async function createBilling(params) {
  const externalId = `virla-${Date.now()}`

  const hosted = await createHostedBilling({ ...params, externalId }).catch((err) => {
    console.error('[AbacatePay] FALHA billing/create:', {
      message: err.message,
      status: err.status,
      responseBody: err.responseBody,
    })
    throw err
  })

  const pix = await createPixQrCharge(params, { linkedBillingId: hosted.id }).catch((err) => {
    console.error('[AbacatePay] FALHA pixQrCode/create:', { message: err.message, status: err.status })
    throw err
  })

  return mapPixResponse(pix, { gatewayBillingId: hosted.id, checkoutUrl: hosted.url ?? hosted.checkoutUrl })
}

export async function getBillingStatus(billingId) {
  // Query the PIX check endpoint which is the reliable source for payment status
  const url = `${ABACATEPAY_API_URL}/pixQrCode/check?id=${encodeURIComponent(billingId)}`
  const res = await fetch(url, { method: 'GET', headers: buildHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`AbacatePay status check failed (HTTP ${res.status})`)
  }
  const payload = data?.data ?? data
  return { status: payload.status ?? 'PENDING', expiresAt: payload.expiresAt ?? payload.expireAt ?? null }
}
 
