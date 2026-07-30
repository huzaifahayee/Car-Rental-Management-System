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

// Normalizes a Pakistani mobile number for display, e.g. +923001234567 or 03001234567 -> 0300-1234567
// Falls back to returning the original value if it doesn't match a recognized format.
export function formatPhone(value) {
  if (!value || typeof value !== 'string') return value
  let digits = value.replace(/[\s()\-]/g, '')

  if (digits.startsWith('+92')) digits = '0' + digits.slice(3)
  else if (/^92\d{10}$/.test(digits)) digits = '0' + digits.slice(2)

  if (/^03\d{9}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return value
}

export function fullNameError(value) {
  if (!value || !value.trim()) return 'Full name is required.'
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (trimmed.length < 2 || trimmed.length > 100 || !/^[\p{L}][\p{L}\s.'-]*$/u.test(trimmed)) {
    return 'Full name must be 2-100 characters and use letters, spaces, apostrophes, or hyphens only.'
  }
  return ''
}

export function licenseNumberError(value) {
  if (!value || !value.trim()) return 'License number is required.'
  if (!/^[A-Za-z]{3}-\d{4}-\d{4,7}$/.test(value.trim())) {
    return 'Enter a valid license number in the format LHR-2024-123456 (city code-year-sequence).'
  }
  return ''
}

// Formats raw input into the conventional city-year-sequence license display,
// e.g. LHR-2024-123456 — 3 letters, then 4-digit year, then up to 7 digits.
export function formatLicenseNumber(value) {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const part1 = raw.slice(0, 3).replace(/[^A-Z]/g, '')
  const rest = raw.slice(part1.length).replace(/[^0-9]/g, '')
  const part2 = rest.slice(0, 4)
  const part3 = rest.slice(4, 11)
  return [part1, part2, part3].filter(Boolean).join('-')
}

export function licenseExpiryError(value) {
  if (!value || isNaN(new Date(value).getTime())) return 'A valid license expiry date is required.'
  return ''
}

// Registration plate: 3 letters, then 4 digits, displayed/stored as ABC-1234
// (matches the hyphenated format already used elsewhere in this codebase).
export function registrationPlateError(value) {
  if (!value || !value.trim()) return 'Registration plate is required.'
  if (!/^[A-Z]{3}-\d{4}$/.test(value.trim())) {
    return 'Plate must be 3 letters followed by 4 digits, e.g. ABC-1234.'
  }
  return ''
}

export function formatRegistrationPlate(value) {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const letters = raw.slice(0, 3).replace(/[^A-Z]/g, '')
  const digits = raw.slice(letters.length).replace(/[^0-9]/g, '').slice(0, 4)
  return [letters, digits].filter(Boolean).join('-')
}

export function passwordError(value) {
  if (value.length < 8) return 'Password must be at least 8 characters long.'
  if (value.length > 72) return 'Password must be 72 characters or fewer.'
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
  if (!/\d/.test(value)) return 'Password must include a number.'
  return ''
}