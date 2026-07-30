// Derives the backend URL from the page's own hostname (same subdomain,
// backend's port) so `<tenant-slug>.localhost:5173` talks to
// `<tenant-slug>.localhost:5000` automatically — required for the backend's
// subdomain-based tenant resolution to see the right Host header.
// VITE_API_BASE_URL remains a hard override for environments where the API
// isn't reachable on the same hostname (e.g. a fixed deployed backend URL).
function computeApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL
  const port = import.meta.env.VITE_API_PORT || '5000'
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${port}`
  }
  return `http://localhost:${port}`
}

const API_BASE_URL = computeApiBaseUrl()

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    // The tenant-resolver blocks every route (including public ones) for an
    // archived tenant's subdomain with this exact shape — redirect to a
    // dedicated page instead of letting each caller show its own generic
    // error. Guarded against redirect loops since this page itself still
    // triggers a /settings call from the navbar.
    if (data?.tenantArchived && typeof window !== 'undefined' && window.location.pathname !== '/agency-inactive') {
      window.location.assign('/agency-inactive')
    }
    const message = data?.error || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data
}

export default apiFetch
