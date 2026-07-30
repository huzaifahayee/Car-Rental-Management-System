import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import { phoneError, cnicError, formatCnic, passwordError } from '../lib/validation'

export default function Profile() {
  const { user, updateUser, loading: authLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cnic, setCnic] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({})
  const [passwordFormError, setPasswordFormError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

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
      const { syncWarnings, ...updatedUser } = updated
      updateUser(updatedUser)
      setFullName(updated.fullName || '')
      setPhone(updated.phone || '')
      setCnic(updated.cnic ? formatCnic(updated.cnic) : '')
      setSuccess(
        updated.syncWarnings?.length
          ? `Profile updated. Note: ${updated.syncWarnings.join(' ')}`
          : 'Profile updated successfully. Redirecting…'
      )

      // If we were sent here from another page (e.g. BookVehicle asking for
      // a missing CNIC), take the user back there. Otherwise, go home.
      const destination = location.state?.from || '/'
      setTimeout(() => {
        navigate(destination, { state: location.state?.formState ? { formState: location.state.formState } : undefined })
      }, 900)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    const errors = {}
    if (!currentPassword) errors.currentPassword = 'Current password is required.'
    const newPwErr = passwordError(newPassword)
    if (newPwErr) errors.newPassword = newPwErr
    if (newPassword && confirmNewPassword !== newPassword) errors.confirmNewPassword = 'Passwords do not match.'

    if (Object.keys(errors).length) {
      setPasswordFieldErrors(errors)
      setPasswordFormError('')
      setPasswordSuccess('')
      return
    }
    setPasswordFieldErrors({})
    setPasswordFormError('')
    setPasswordSuccess('')
    setChangingPassword(true)

    try {
      const result = await apiFetch('/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setPasswordSuccess(
        result.syncWarnings?.length
          ? `Password updated. Note: ${result.syncWarnings.join(' ')}`
          : 'Password updated successfully.'
      )
    } catch (err) {
      setPasswordFormError(err.message)
    } finally {
      setChangingPassword(false)
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

        {!loading && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', padding: '40px 36px', marginTop: 24 }}>
            <div className="mb-8">
              <h2 style={{ fontWeight: 800, fontSize: 20, color: '#1a1a2e', marginBottom: 6 }}>Change Password</h2>
              <p style={{ color: '#888', fontSize: 14 }}>
                {user.role === 'SUPERADMIN'
                  ? "Your account is duplicated across every agency's database — changing your password here syncs it everywhere automatically."
                  : 'Update the password used to sign in.'}
              </p>
            </div>

            {passwordFormError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
                {passwordFormError}
              </div>
            )}
            {passwordSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#15803d', fontSize: 13, marginBottom: 20 }}>
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ ...inputStyle, borderColor: passwordFieldErrors.currentPassword ? '#dc2626' : '#e0e0e0' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                {passwordFieldErrors.currentPassword && <p className="field-error">{passwordFieldErrors.currentPassword}</p>}
              </div>

              <div>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={{ ...inputStyle, borderColor: passwordFieldErrors.newPassword ? '#dc2626' : '#e0e0e0' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                {passwordFieldErrors.newPassword && <p className="field-error">{passwordFieldErrors.newPassword}</p>}
              </div>

              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={{ ...inputStyle, borderColor: passwordFieldErrors.confirmNewPassword ? '#dc2626' : '#e0e0e0' }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                {passwordFieldErrors.confirmNewPassword && <p className="field-error">{passwordFieldErrors.confirmNewPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                style={{
                  background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                  color: '#fff', border: 'none', borderRadius: 12,
                  padding: '13px', fontWeight: 800, fontSize: 15,
                  cursor: changingPassword ? 'default' : 'pointer', marginTop: 4,
                  boxShadow: '0 4px 20px rgba(var(--brand-rgb),0.35)',
                  opacity: changingPassword ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {changingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}