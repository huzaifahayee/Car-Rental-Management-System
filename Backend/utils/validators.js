// Pakistani CNIC: 13 digits, conventionally displayed as 5-7-1 (e.g. 12345-1234567-1).
// We store the normalized digits-only form and accept either dashed or
// plain input from clients.
function normalizeCnic(value) {
  if (!value || typeof value !== 'string') return ''
  return value.replace(/-/g, '').trim()
}

function isValidCnic(value) {
  const digits = normalizeCnic(value)
  return /^\d{13}$/.test(digits)
}

module.exports = { normalizeCnic, isValidCnic }
