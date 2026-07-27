export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidPhone(value) {
  if (!value || typeof value !== 'string') return false
  const stripped = value.replace(/[\s()\-]/g, '') // remove spaces, parens, dashes

  // Reject negatives or anything starting with minus
  if (stripped.startsWith('-')) return false

  // Pakistani mobile: 03XXXXXXXXX (11 digits, starts with 03)
  if (/^03\d{9}$/.test(stripped)) return true

  // Pakistani with country code: +923XXXXXXXXX or 923XXXXXXXXX (12–13 chars)
  if (/^(\+92|92)3\d{9}$/.test(stripped)) return true

  return false
}

export function phoneError(value) {
  if (!value || !value.trim()) return 'Phone number is required.'
  if (!isValidPhone(value)) return 'Enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567).'
  return ''
}

export function isValidCnic(value) {
  if (!value || typeof value !== 'string') return false
  const digits = value.replace(/-/g, '').trim()
  return /^\d{13}$/.test(digits)
}

export function cnicError(value) {
  if (!value || !value.trim()) return 'CNIC is required.'
  if (!isValidCnic(value)) return 'Enter a valid 13-digit CNIC (e.g. 12345-1234567-1).'
  return ''
}

// Formats raw digit input into the conventional 5-7-1 CNIC display, e.g. 12345-1234567-1
export function formatCnic(value) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  const part1 = digits.slice(0, 5)
  const part2 = digits.slice(5, 12)
  const part3 = digits.slice(12, 13)
  return [part1, part2, part3].filter(Boolean).join('-')
}

export function passwordError(value) {
  if (value.length < 8) return 'Password must be at least 8 characters long.'
  if (value.length > 72) return 'Password must be 72 characters or fewer.'
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
  if (!/\d/.test(value)) return 'Password must include a number.'
  return ''
}
