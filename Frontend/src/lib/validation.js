export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidPhone(value) {
  const compact = value.replace(/[\s()-]/g, '')
  return !value.trim().startsWith('-') && /^\+?[1-9]\d{9,14}$/.test(compact)
}

export function passwordError(value) {
  if (value.length < 8) return 'Password must be at least 8 characters long.'
  if (value.length > 72) return 'Password must be 72 characters or fewer.'
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
  if (!/\d/.test(value)) return 'Password must include a number.'
  return ''
}
