import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreed) {
      setError('Please agree to the Terms and Conditions.')
      return
    }
    setError('')
    // TODO (Phase 5): call POST /auth/register (Customer role only)
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0',
    borderRadius: 10, fontSize: 14, color: '#333', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  const labelStyle = {
    fontSize: 12, fontWeight: 700, color: '#555',
    textTransform: 'uppercase', letterSpacing: 1,
    display: 'block', marginBottom: 6,
  }

  function focusHandler(e) {
    e.currentTarget.style.borderColor = '#00c472'
  }
  function blurHandler(e) {
    e.currentTarget.style.borderColor = '#e0e0e0'
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 130px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0fdf7 0%, #e8f8f0 100%)', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', padding: '40px 36px' }}>

          {/* Header */}
          <div className="text-center mb-8">
            <div style={{ background: '#00c472', borderRadius: 12, width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 24 }}>G</span>
            </div>
            <h1 style={{ fontWeight: 800, fontSize: 24, color: '#1a1a2e', marginBottom: 6 }}>Create an account</h1>
            <p style={{ color: '#888', fontSize: 14 }}>Sign up to start booking</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>

            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={focusHandler}
                  onBlur={blurHandler}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 13, fontWeight: 600 }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>

            {/* Terms */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setAgreed(v => !v)}
                style={{
                  minWidth: 18, height: 18, borderRadius: 5,
                  border: `2px solid ${agreed ? '#00c472' : '#ccc'}`,
                  background: agreed ? '#00c472' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', marginTop: 1, transition: 'all 0.15s',
                }}
              >
                {agreed && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                I agree to the{' '}
                <a href="#" style={{ color: '#00c472', textDecoration: 'none', fontWeight: 600 }}>Terms and Conditions</a>
                {' '}and{' '}
                <a href="#" style={{ color: '#00c472', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              style={{
                background: 'linear-gradient(90deg, #00c472, #00a85a)',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '13px', fontWeight: 800, fontSize: 15,
                cursor: 'pointer', marginTop: 4,
                boxShadow: '0 4px 20px rgba(0,196,114,0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Create Account
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
            <span style={{ color: '#bbb', fontSize: 13 }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#666' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#00c472', fontWeight: 700, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}