import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import { phoneError, cnicError, formatCnic } from '../lib/validation'

export default function Profile() {
  const { user, updateUser, loading: authLoading } = useAuth()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cnic, setCnic] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!user) return
    let cancelled = false
    apiFetch('/users/me')
      .then(data => {
        if (cancelled) return
        setFullName(data.fullName || '')
        setPhone(data.phone || '')
        setCnic(data.cnic ? formatCnic(data.cnic) : '')
      })
      .catch(err => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [user])

  if (authLoading) return null
  if (!user) return <Navigate to="/login" state={{ from: '/profile' }} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    const normalizedName = fullName.trim().replace(/\s+/g, ' ')
    const normalizedPhone = phone.replace(/[\s()-]/g, '')

    const errors = {}
    if (!normalizedName) errors.fullName = 'Full name is required.'
    else if (normalizedName.length < 2 || normalizedName.length > 100 || !/^[\p{L}][\p{L}\s.'-]*$/u.test(normalizedName)) errors.fullName = 'Use letters, spaces, apostrophes, or hyphens only.'
    const phoneErr = phoneError(phone)
    if (phoneErr) errors.phone = phoneErr
    const cnicErr = cnicError(cnic)
    if (cnicErr) errors.cnic = cnicErr

    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      setError('')
      setSuccess('')
      return
    }
    setFieldErrors({})
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const updated = await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: normalizedName,
          phone: normalizedPhone,
          cnic: cnic.replace(/-/g, ''),
        }),
      })
      updateUser(updated)
      setFullName(updated.fullName || '')
      setPhone(updated.phone || '')
      setCnic(updated.cnic ? formatCnic(updated.cnic) : '')
      setSuccess('Profile updated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0',
    borderRadius: 10, fontSize: 14, color: '#333', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }
  const readOnlyInputStyle = {
    ...inputStyle, background: '#f5f5f5', color: '#888', cursor: 'not-allowed',
  }
  const labelStyle = {
    fontSize: 12, fontWeight: 700, color: '#555',
    textTransform: 'uppercase', letterSpacing: 1,
    display: 'block', marginBottom: 6,
  }

  function focusHandler(e) { e.currentTarget.style.borderColor = 'var(--brand)' }
  function blurHandler(e) { e.currentTarget.style.borderColor = '#e0e0e0' }

  return (
    <div style={{ minHeight: 'calc(100vh - 130px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'linear-gradient(135deg, #f0fdf7 0%, #e8f8f0 100%)', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', padding: '40px 36px' }}>

          <div className="mb-8">
            <h1 style={{ fontWeight: 800, fontSize: 24, color: '#1a1a2e', marginBottom: 6 }}>My Profile</h1>
            <p style={{ color: '#888', fontSize: 14 }}>Update your details below.</p>
          </div>

          {!loading && !cnic && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', color: '#92400e', fontSize: 13, marginBottom: 20 }}>
              Add your CNIC below — it's required before you can book a vehicle.
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#15803d', fontSize: 13, marginBottom: 20 }}>
              {success}
            </div>
          )}

          {loading ? (
            <p style={{ color: '#888', fontSize: 14 }}>Loading your profile…</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={user.email} disabled style={readOnlyInputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Role</label>
                <input type="text" value={user.role} disabled style={readOnlyInputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  style={{ ...inputStyle, borderColor: fieldErrors.fullName ? '#dc2626' : '#e0e0e0' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                {fieldErrors.fullName && <p className="field-error">{fieldErrors.fullName}</p>}
              </div>

              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d+()\s-]/g, ''))}
                  placeholder="+92 300 0000000"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  maxLength={20}
                  style={{ ...inputStyle, borderColor: fieldErrors.phone ? '#dc2626' : '#e0e0e0' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
              </div>

              <div>
                <label style={labelStyle}>CNIC</label>
                <input
                  type="text"
                  value={cnic}
                  onChange={e => setCnic(formatCnic(e.target.value))}
                  placeholder="12345-1234567-1"
                  autoComplete="off"
                  inputMode="numeric"
                  required
                  maxLength={15}
                  style={{ ...inputStyle, borderColor: fieldErrors.cnic ? '#dc2626' : '#e0e0e0' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                {fieldErrors.cnic && <p className="field-error">{fieldErrors.cnic}</p>}
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                  color: '#fff', border: 'none', borderRadius: 12,
                  padding: '13px', fontWeight: 800, fontSize: 15,
                  cursor: saving ? 'default' : 'pointer', marginTop: 4,
                  boxShadow: '0 4px 20px rgba(var(--brand-rgb),0.35)',
                  opacity: saving ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
