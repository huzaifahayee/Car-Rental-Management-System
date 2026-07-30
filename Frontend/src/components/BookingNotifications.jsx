import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'

const POLL_INTERVAL_MS = 20000
const AUTO_DISMISS_MS = 8000
const NOTIFY_ROLES = ['ADMIN', 'EMPLOYEE']

function storageKey(userId) {
  return `bookingNotif_lastSeenId_${userId}`
}

// Polls for newly-created PENDING bookings and pops a dismissible toast for
// Admin/Employee staff, from anywhere in the app (mounted once in Layout).
// Clicking it jumps to the Admin Panel's Bookings tab.
export default function BookingNotifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const lastSeenIdRef = useRef(null)
  const dismissTimerRef = useRef(null)

  const active = user && NOTIFY_ROLES.includes(user.role)

  useEffect(() => {
    if (!active) return

    // Pick up from wherever this staff member last left off (persisted per
    // user), or from 0 on a genuinely fresh session — either way, any
    // currently-PENDING booking newer than that gets surfaced, including on
    // the very first poll. A pending request sitting unnoticed is exactly
    // the case this feature exists for, so first-load should not be silent.
    const stored = localStorage.getItem(storageKey(user.id))
    lastSeenIdRef.current = stored ? Number(stored) : 0

    let cancelled = false

    async function poll() {
      try {
        const sinceId = lastSeenIdRef.current ?? 0
        const newBookings = await apiFetch(`/bookings/new-pending?sinceId=${sinceId}`)
        if (cancelled || !newBookings.length) return

        const maxId = Math.max(...newBookings.map(b => b.id))
        lastSeenIdRef.current = maxId
        localStorage.setItem(storageKey(user.id), String(maxId))

        showToast(newBookings)
      } catch (err) {
        console.error('Booking notification poll failed:', err.message)
      }
    }

    function showToast(newBookings) {
      const message = newBookings.length === 1
        ? `New booking request from ${newBookings[0].customer?.fullName || 'a customer'} — ${newBookings[0].vehiclePackage?.make || ''} ${newBookings[0].vehiclePackage?.model || ''}`.trim()
        : `${newBookings.length} new booking requests`

      setToast({ message })
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS)
    }

    poll()
    const intervalId = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(intervalId)
      clearTimeout(dismissTimerRef.current)
    }
  }, [active, user?.id])

  if (!active || !toast) return null

  function handleClick() {
    setToast(null)
    navigate('/admin', { state: { tab: 'bookings' } })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      style={{
        position: 'fixed', top: 20, right: 20, zIndex: 200,
        background: '#fff', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        border: '1.5px solid rgba(var(--brand-rgb), 0.35)', borderLeft: '5px solid var(--brand)',
        padding: '14px 18px', maxWidth: 340, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }}>New Booking Request</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>{toast.message}</p>
        <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--brand-2)' }}>Click to view →</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); clearTimeout(dismissTimerRef.current); setToast(null) }}
        style={{ background: 'none', border: 'none', fontSize: 16, color: '#94a3b8', cursor: 'pointer', padding: 0, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  )
}
