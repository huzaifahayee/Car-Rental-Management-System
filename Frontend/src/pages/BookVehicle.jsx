import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'

export default function BookVehicle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [vehicle, setVehicle] = useState(null)
  const [pickupDateTime, setPickupDateTime] = useState('')
  const [returnDateTime, setReturnDateTime] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentReference, setPaymentReference] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    apiFetch(`/vehicles/${id}`).then(setVehicle).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [id])

  async function submitBooking(event) {
    event.preventDefault()
    if (!user) return navigate('/login')
    if (user.role !== 'CUSTOMER') return setError('Bookings can only be created from a customer account.')
    if (!pickupDateTime || !returnDateTime) return setError('Choose both pickup and return date and time.')
    if (new Date(pickupDateTime) < new Date()) return setError('Pickup date and time cannot be in the past.')
    if (new Date(returnDateTime) <= new Date(pickupDateTime)) return setError('Return date and time must be after pickup.')
    setError('')
    setSubmitting(true)
    try {
      const created = await apiFetch('/bookings', { method: 'POST', body: JSON.stringify({ vehiclePackageId: Number(id), pickupDateTime: new Date(pickupDateTime).toISOString(), returnDateTime: new Date(returnDateTime).toISOString(), paymentMethod, paymentReference: paymentReference.trim() || undefined }) })
      setBooking(created)
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  if (loading) return <PageState title="Loading your vehicle…" />
  if (error && !vehicle) return <PageState title="Vehicle unavailable" text={error} />
  if (booking) return <Confirmation booking={booking} vehicle={vehicle} />

  return <div style={{ background: '#f5f7fa', minHeight: '100vh', padding: '48px 16px' }}><div className="max-w-4xl mx-auto"><Link to="/search" style={{ color: '#00a85a', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>← Back to vehicles</Link><div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: 18 }}><section style={cardStyle}><p style={eyebrow}>Selected vehicle</p><h1 style={{ margin: '0 0 10px', color: '#1a1a2e', fontSize: 26 }}>{vehicle.make} {vehicle.model}</h1><p style={{ color: '#667085', lineHeight: 1.6 }}>{vehicle.category} · {vehicle.seatingCapacity} seats · {vehicle.transmission.toLowerCase()} · {vehicle.hasAC ? 'Air conditioned' : 'No AC'}</p><div style={{ borderTop: '1px solid #e8edf0', paddingTop: 18, marginTop: 22 }}><span style={{ color: '#667085', fontSize: 13 }}>From</span><div style={{ color: '#00a85a', fontWeight: 800, fontSize: 28 }}>Rs {vehicle.pricePerDay.toLocaleString()}<span style={{ color: '#667085', fontSize: 14 }}>/day</span></div></div></section><section style={cardStyle}><p style={eyebrow}>Complete your booking</p><h2 style={{ margin: '0 0 20px', color: '#1a1a2e', fontSize: 20 }}>{user ? 'Trip details' : 'Sign in to continue'}</h2>{!user ? <><p style={{ color: '#667085', lineHeight: 1.6 }}>Please sign in with a customer account before confirming this rental.</p><button onClick={() => navigate('/login')} style={buttonStyle}>Sign in to book</button></> : <form onSubmit={submitBooking} style={{ display: 'grid', gap: 15 }}><Field label="Pickup date and time"><input type="datetime-local" value={pickupDateTime} min={new Date().toISOString().slice(0, 16)} onChange={e => setPickupDateTime(e.target.value)} required style={inputStyle} /></Field><Field label="Return date and time"><input type="datetime-local" value={returnDateTime} min={pickupDateTime || new Date().toISOString().slice(0, 16)} onChange={e => setReturnDateTime(e.target.value)} required style={inputStyle} /></Field><Field label="Payment method"><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputStyle}><option value="CASH">Cash on pickup</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card</option></select></Field><Field label="Payment reference (optional)"><input value={paymentReference} maxLength={100} onChange={e => setPaymentReference(e.target.value)} placeholder="Transaction or reference number" style={inputStyle} /></Field>{error && <p style={{ margin: 0, color: '#c53030', fontSize: 13 }}>{error}</p>}<button disabled={submitting} style={{ ...buttonStyle, opacity: submitting ? .65 : 1 }}>{submitting ? 'Confirming booking…' : 'Confirm booking'}</button></form>}</section></div></div></div>
}

function Confirmation({ booking, vehicle }) { return <div style={{ background: '#f0fdf7', minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}><section style={{ ...cardStyle, maxWidth: 500, textAlign: 'center' }}><div style={{ width: 56, height: 56, margin: '0 auto 16px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#d8f8e8', color: '#009e5a', fontSize: 28 }}>✓</div><p style={eyebrow}>Booking received</p><h1 style={{ color: '#1a1a2e', margin: '0 0 10px' }}>Your request is confirmed</h1><p style={{ color: '#667085', lineHeight: 1.6 }}>Your {vehicle.make} {vehicle.model} booking reference is <strong style={{ color: '#00a85a' }}>{booking.bookingReference}</strong>. It is currently pending confirmation.</p><Link to="/search" style={{ ...buttonStyle, display: 'block', textDecoration: 'none', marginTop: 22 }}>Browse more vehicles</Link></section></div> }
function Field({ label, children }) { return <label style={{ display: 'grid', gap: 6, color: '#475467', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: .7 }}>{label}{children}</label> }
function PageState({ title, text }) { return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}><div><h1 style={{ color: '#1a1a2e' }}>{title}</h1>{text && <p style={{ color: '#667085' }}>{text}</p>}<Link to="/search" style={{ color: '#00a85a' }}>Back to search</Link></div></div> }
const cardStyle = { background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 8px 28px rgba(16,24,40,.08)' }
const eyebrow = { margin: '0 0 8px', color: '#00a85a', fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase' }
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1.5px solid #d8e0e5', borderRadius: 9, color: '#1a1a2e', background: '#fff', fontSize: 14 }
const buttonStyle = { width: '100%', border: 'none', borderRadius: 10, padding: '12px 16px', background: 'linear-gradient(90deg,#00c472,#00a85a)', color: '#fff', fontWeight: 800, cursor: 'pointer' }
