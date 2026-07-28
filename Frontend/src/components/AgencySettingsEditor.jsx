import { useEffect, useRef, useState } from 'react'
import apiFetch from '../lib/apiClient'

const inputBaseStyle = {
  width: '100%', marginTop: 6, padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1a1a2e',
  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
  background: '#fff',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function focusHandlers(setFocused) {
  return {
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  }
}

function withFocusStyle(focused) {
  return focused
    ? { borderColor: 'var(--brand)', boxShadow: '0 0 0 3px rgba(var(--brand-rgb, 16,185,129), 0.12)' }
    : {}
}

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
  const [dragOver, setDragOver] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
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

  function applyFile(file) {
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleFileChange(e) {
    applyFile(e.target.files?.[0])
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    applyFile(e.dataTransfer.files?.[0])
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!agencyName.trim()) {
      setError('Agency name is required.')
      return
    }

    setShowConfirm(true)
  }

  async function performSave() {
    setShowConfirm(false)
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
        await apiFetch('/settings/logo', { method: 'POST', body: formData })
      }

      setSuccess('Settings saved. Refreshing…')
      setTimeout(() => window.location.reload(), 900)
    } catch (err) {
      setError(err.message || 'Failed to save settings.')
      setSaving(false)
    }
  }

  if (loading) {
    return <p style={{ color: '#64748b', margin: 0 }}>Loading settings...</p>
  }

  const displayLogo = previewUrl || logoUrl

  return (
    <>
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 32, maxWidth: 720 }}>

      {/* Branding section: logo dropzone + agency name, side by side */}
      <section>
        <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
          Branding
        </p>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              width: 100, height: 100, borderRadius: 16, flexShrink: 0, cursor: 'pointer',
              background: dragOver ? '#f0fdf9' : '#f8fafc',
              border: `2px dashed ${dragOver ? 'var(--brand)' : '#dbe3ec'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative', transition: 'all 0.15s',
            }}
          >
            {displayLogo ? (
              <>
                <img src={displayLogo} alt="Agency logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div
                  style={{
                    position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)',
                    color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', opacity: 0,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = 1 }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = 0 }}
                >
                  Change
                </div>
              </>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '0 8px' }}>
                Drop logo or click
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 220, display: 'grid', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1a1a2e', fontWeight: 600 }}>Agency logo</p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
              PNG, JPG, WEBP or SVG. Shown in the header, footer, and browser tab across your site.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                marginTop: 6, width: 'fit-content', background: '#fff', color: '#1a1a2e',
                border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 14px',
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {displayLogo ? 'Change logo' : 'Upload logo'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Field label="Agency Name">
            <input
              type="text"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              placeholder="e.g. GariTrip Demo Agency"
              {...focusHandlers(v => setFocusedField(v ? 'agencyName' : null))}
              style={{ ...inputBaseStyle, ...withFocusStyle(focusedField === 'agencyName') }}
            />
          </Field>
        </div>
      </section>

      <div style={{ height: 1, background: '#eef1f4' }} />

      {/* Contact section: two-column grid */}
      <section>
        <p style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
          Contact details
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <Field label="Contact Email">
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="support@youragency.com"
              {...focusHandlers(v => setFocusedField(v ? 'contactEmail' : null))}
              style={{ ...inputBaseStyle, ...withFocusStyle(focusedField === 'contactEmail') }}
            />
          </Field>

          <Field label="Contact Phone">
            <input
              type="text"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="+92 3xx xxxxxxx"
              {...focusHandlers(v => setFocusedField(v ? 'contactPhone' : null))}
              style={{ ...inputBaseStyle, ...withFocusStyle(focusedField === 'contactPhone') }}
            />
          </Field>
        </div>
      </section>

      {(error || success) && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: error ? '#fef2f2' : '#f0fdf9',
          color: error ? '#dc2626' : 'var(--brand-2)',
          border: `1px solid ${error ? '#fecaca' : 'rgba(16,185,129,0.25)'}`,
        }}>
          {error || success}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eef1f4', paddingTop: 20 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: 'var(--brand)', color: 'var(--surface)', border: 'none',
            borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 14,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>

    {showConfirm && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20,
      }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1a1a2e', fontWeight: 800 }}>Save these changes?</h2>
          <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
            This updates your agency name, contact details{selectedFile ? ', and logo' : ''} across the site immediately. The page will refresh once it's done.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              style={{ background: '#f3f4f6', color: '#333', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={performSave}
              style={{ background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}
            >
              Yes, save
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
