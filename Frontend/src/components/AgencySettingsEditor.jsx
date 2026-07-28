import { useEffect, useRef, useState } from 'react'
import apiFetch from '../lib/apiClient'

export default function AgencySettingsEditor() {
  const [agencyName, setAgencyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [logoUrl, setLogoUrl] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    let mounted = true
    apiFetch('/settings')
      .then(data => {
        if (!mounted || !data) return
        setAgencyName(data.agencyName || '')
        setContactEmail(data.contactEmail || '')
        setContactPhone(data.contactPhone || '')
        setLogoUrl(data.logoUrl || null)
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!agencyName.trim()) {
      setError('Agency name is required.')
      return
    }

    setSaving(true)
    try {
      await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          agencyName: agencyName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || null,
        }),
      })

      if (selectedFile) {
        const formData = new FormData()
        formData.append('logo', selectedFile)
        const updated = await apiFetch('/settings/logo', { method: 'POST', body: formData })
        if (updated?.logoUrl) setLogoUrl(updated.logoUrl)
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }

      setSuccess('Settings saved. Refresh the site to see the change everywhere.')
    } catch (err) {
      setError(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p style={{ color: '#64748b', margin: 0 }}>Loading settings...</p>
  }

  const displayLogo = previewUrl || logoUrl

  return (
    <form onSubmit={handleSave} style={{ display: 'grid', gap: 20, maxWidth: 480 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Agency Name
        </label>
        <input
          type="text"
          value={agencyName}
          onChange={e => setAgencyName(e.target.value)}
          placeholder="e.g. GariTrip Demo Agency"
          style={{
            width: '100%', marginTop: 6, padding: '10px 14px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1a1a2e',
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Contact Email
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
          placeholder="support@youragency.com"
          style={{
            width: '100%', marginTop: 6, padding: '10px 14px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1a1a2e',
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Contact Phone
        </label>
        <input
          type="text"
          value={contactPhone}
          onChange={e => setContactPhone(e.target.value)}
          placeholder="+92 3xx xxxxxxx"
          style={{
            width: '100%', marginTop: 6, padding: '10px 14px', borderRadius: 10,
            border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1a1a2e',
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Agency Logo
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12, background: '#f1f5f9',
            border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center',
            justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
          }}>
            {displayLogo ? (
              <img src={displayLogo} alt="Agency logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>No logo</span>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              style={{ fontSize: 13 }}
            />
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>PNG, JPG, WEBP or SVG</p>
          </div>
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}
      {success && <p style={{ color: 'var(--brand-2)', fontSize: 13, margin: 0 }}>{success}</p>}

      <button
        type="submit"
        disabled={saving}
        style={{
          background: 'var(--brand)', color: 'var(--surface)', border: 'none',
          borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, width: 'fit-content',
        }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  )
}