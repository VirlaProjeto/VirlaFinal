/** Validação de e-mail (formato RFC simplificado). */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export function isValidEmail(value) {
  const email = String(value ?? '').trim()
  if (!email || email.length > 254) return false
  return EMAIL_REGEX.test(email)
}
