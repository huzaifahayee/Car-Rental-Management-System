import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'

const statusStyle = { PENDING: ['#fef9c3', '#a16207'], CONFIRMED: ['#dbeafe', '#1d4ed8'], CANCELLED: ['#fee2e2', '#dc2626'], COMPLETED: ['#dcfce7', '#16a34a'] }

export default function MyBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    apiFetch('/bookings').then(setBookings).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [user])

  if (!user) return <State title="Sign in to view your bookings" action="/login" actionText="Sign in" />
  if (loading) return <State title="Loading your bookings…" />
  if (error) return <State title="Could not load bookings" text={error} />
  return <div style={{ background: 'var(--page-bg)', minHeight: '100vh', padding: '48px 16px' }}><main style={{ maxWidth: 920, margin: '0 auto' }}><Link to="/search" style={{ color: 'var(--brand-2)', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>← Find a vehicle</Link><h1 style={{ color: 'var(--text)', margin: '18px 0 6px' }}>My Bookings</h1><p style={{ color: 'var(--muted)', marginTop: 0 }}>Track your rental requests and upcoming trips.</p>{bookings.length ? <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>{bookings.map(booking => <BookingCard key={booking.id} booking={booking} />)}</div> : <State title="No bookings yet" text="Find a vehicle to start your first trip." action="/search" actionText="Browse vehicles" />}</main></div>
}

function BookingCard({ booking }) { const vehicle = booking.vehiclePackage; const [bg, color] = statusStyle[booking.status] || ['#f3f4f6', '#555']; return <article style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}><div className="flex justify-between gap-4 flex-wrap"><div><p style={{ color: 'var(--brand-2)', fontSize: 12, fontWeight: 800, margin: '0 0 5px' }}>{booking.bookingReference}</p><h2 style={{ color: 'var(--text)', fontSize: 18, margin: 0 }}>{vehicle.make} {vehicle.model}</h2><p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>{vehicle.pickupCity} → {vehicle.dropoffCity}</p></div><span style={{ alignSelf: 'flex-start', background: bg, color, padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>{booking.status.toLowerCase()}</span></div><div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', borderTop: '1px solid #edf0f2', marginTop: 16, paddingTop: 14, color: '#475467', fontSize: 13 }}><span><strong>Pickup:</strong> {formatDate(booking.pickupDateTime)}</span><span><strong>Return:</strong> {formatDate(booking.returnDateTime)}</span><span><strong>Payment:</strong> {booking.paymentMethod.replaceAll('_', ' ').toLowerCase()}</span></div></article> }
function State({ title, text, action, actionText }) { return <div style={{ minHeight: '45vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}><div><h1 style={{ color: '#1a1a2e' }}>{title}</h1>{text && <p style={{ color: '#667085' }}>{text}</p>}{action && <Link to={action} className="ui-button" style={{ display: 'inline-block', marginTop: 12 }}>{actionText}</Link>}</div></div> }
function formatDate(value) { return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
