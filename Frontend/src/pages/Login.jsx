import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import { isValidEmail } from '../lib/validation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const { login } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    setError('')

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      login(data.token, data.user)
      navigate(data.user.role === 'ADMIN' || data.user.role === 'EMPLOYEE' ? '/admin' : '/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 130px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0fdf7 0%, #e8f8f0 100%)', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', padding: '40px 36px' }}>

          {/* Header */}
          <div className="text-center mb-8">
            <div style={{ background: '#00c472', borderRadius: 12, width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 24 }}>G</span>
            </div>
            <h1 style={{ fontWeight: 800, fontSize: 24, color: '#1a1a2e', marginBottom: 6 }}>Welcome back</h1>
            <p style={{ color: '#888', fontSize: 14 }}>Sign in to your account to continue</p>
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
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                maxLength={254}
                style={{
                  width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0',
                  borderRadius: 10, fontSize: 14, color: '#333', outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#00c472' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Password
                </label>
                <a href="#" style={{ fontSize: 13, color: '#00c472', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={72}
                  style={{
                    width: '100%', padding: '11px 44px 11px 14px', border: '1.5px solid #e0e0e0',
                    borderRadius: 10, fontSize: 14, color: '#333', outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#00c472' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0' }}
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
              Sign In
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
            <span style={{ color: '#bbb', fontSize: 13 }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#eee' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#666' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#00c472', fontWeight: 700, textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
