import { useEffect, useState } from 'react'
import apiFetch from '../lib/apiClient'

const PLACEHOLDER_AGENCY_NAME = 'GariTrip Demo Agency'

// Shared avatar for the Login/Register cards — shows the agency's logo
// (from Agency Settings) when one is configured, falling back to a
// letter-avatar built from the agency name so it never renders broken.
export default function AuthAvatar({ size = 52 }) {
  const [agencyName, setAgencyName] = useState(PLACEHOLDER_AGENCY_NAME)
  const [agencyLogoUrl, setAgencyLogoUrl] = useState(null)

  useEffect(() => {
    let mounted = true
    apiFetch('/settings')
      .then(data => {
        if (!mounted || !data) return
        if (data.agencyName) setAgencyName(data.agencyName)
        if (data.logoUrl) setAgencyLogoUrl(data.logoUrl)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  return (
    <div style={{ background: 'var(--brand)', borderRadius: 12, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', overflow: 'hidden' }}>
      {agencyLogoUrl ? (
        <img src={agencyLogoUrl} alt={agencyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: '#fff', fontWeight: 900, fontSize: Math.round(size * 0.46) }}>{agencyName.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}
