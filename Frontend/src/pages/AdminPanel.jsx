import { useEffect, useMemo, useState } from 'react'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = { PENDING: ['#fef9c3', '#a16207'], CONFIRMED: ['#dbeafe', '#1d4ed8'], CANCELLED: ['#fee2e2', '#dc2626'], COMPLETED: ['#dcfce7', '#16a34a'], AVAILABLE: ['#dcfce7', '#16a34a'], BOOKED: ['#dbeafe', '#1d4ed8'], MAINTENANCE: ['#ffedd5', '#c2410c'], INACTIVE: ['#f3f4f6', '#6b7280'] }
const label = value => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const date = value => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))

export default function AdminPanel() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setError('Sign in with an admin or employee account to view the dashboard.'); setLoading(false); return }
    Promise.all([apiFetch('/dashboard'), apiFetch('/bookings'), apiFetch('/vehicles')])
      .then(([dashboard, liveBookings, liveVehicles]) => { setStats(dashboard); setBookings(liveBookings); setVehicles(liveVehicles) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const totalBookings = stats ? Object.values(stats.bookings).reduce((sum, count) => sum + count, 0) : 0
  const activeVehicles = stats ? stats.vehicles.AVAILABLE : 0
  const pendingBookings = stats ? stats.bookings.PENDING : 0
  const revenueBookings = bookings.filter(booking => ['CONFIRMED', 'COMPLETED'].includes(booking.status)).length
  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings])

  if (loading) return <PanelState title="Loading dashboard…" />
  if (error) return <PanelState title="Dashboard unavailable" text={error} />

  return <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
    <header style={{ background: '#1a1a2e', padding: '14px 0' }}><div className="max-w-7xl mx-auto px-6 flex items-center justify-between"><div><h1 style={{ color: '#fff', fontSize: 18, margin: 0 }}>Admin Panel</h1><p style={{ color: '#9ca3af', fontSize: 12, margin: '3px 0 0' }}>Live rental operations</p></div><div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{user.fullName}</div></div></header>
    <main className="max-w-7xl mx-auto px-6 py-8">
      <nav style={{ display: 'flex', gap: 4, width: 'fit-content', background: '#fff', borderRadius: 12, padding: 5, marginBottom: 26, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>{['overview', 'bookings', 'vehicles'].map(item => <button key={item} onClick={() => setTab(item)} style={{ border: 0, borderRadius: 8, padding: '8px 20px', cursor: 'pointer', background: tab === item ? '#00c472' : 'transparent', color: tab === item ? '#fff' : '#667085', fontWeight: 800, textTransform: 'capitalize' }}>{item}</button>)}</nav>
      {tab === 'overview' && <><div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8"><Stat label="Total bookings" value={totalBookings} /><Stat label="Available vehicles" value={activeVehicles} /><Stat label="Pending approvals" value={pendingBookings} /><Stat label="Confirmed / completed" value={revenueBookings} /></div><DataCard title="Recent bookings"><BookingsTable bookings={recentBookings} compact /></DataCard><div style={{ height: 24 }} /><DataCard title="Vehicle availability"><VehiclesTable vehicles={vehicles} compact /></DataCard></>}
      {tab === 'bookings' && <DataCard title={`All bookings (${bookings.length})`}><BookingsTable bookings={bookings} /></DataCard>}
      {tab === 'vehicles' && <DataCard title={`All vehicles (${vehicles.length})`}><VehiclesTable vehicles={vehicles} /></DataCard>}
    </main>
  </div>
}

function Stat({ label: statLabel, value }) { return <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}><p style={{ margin: '0 0 8px', color: '#8b95a1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .8 }}>{statLabel}</p><p style={{ margin: 0, fontSize: 27, color: '#1a1a2e', fontWeight: 800 }}>{value}</p></div> }
function DataCard({ title, children }) { return <section style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}><h2 style={{ margin: '0 0 18px', color: '#1a1a2e', fontSize: 17 }}>{title}</h2>{children}</section> }
function Badge({ value }) { const [background, color] = STATUS_COLORS[value] || ['#f3f4f6', '#555']; return <span style={{ background, color, fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{label(value)}</span> }
function BookingsTable({ bookings }) { return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['Reference', 'Customer', 'Vehicle', 'Pickup', 'Return', 'Status'].map(heading => <th key={heading} style={th}>{heading}</th>)}</tr></thead><tbody>{bookings.length ? bookings.map(booking => <tr key={booking.id} style={{ borderTop: '1px solid #f1f3f5' }}><td style={td}><strong style={{ color: '#00a85a' }}>{booking.bookingReference}</strong></td><td style={td}>{booking.customer?.fullName || '—'}<small style={small}>{booking.customer?.phone || ''}</small></td><td style={td}>{booking.vehiclePackage.make} {booking.vehiclePackage.model}</td><td style={td}>{date(booking.pickupDateTime)}</td><td style={td}>{date(booking.returnDateTime)}</td><td style={td}><Badge value={booking.status} /></td></tr>) : <tr><td colSpan="6" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No bookings yet.</td></tr>}</tbody></table></div> }
function VehiclesTable({ vehicles }) { return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['Vehicle', 'Category', 'Route', 'Price/day', 'Status'].map(heading => <th key={heading} style={th}>{heading}</th>)}</tr></thead><tbody>{vehicles.length ? vehicles.map(vehicle => <tr key={vehicle.id} style={{ borderTop: '1px solid #f1f3f5' }}><td style={td}><strong>{vehicle.make} {vehicle.model}</strong><small style={small}>{vehicle.seatingCapacity} seats · {vehicle.transmission.toLowerCase()}</small></td><td style={td}>{label(vehicle.category)}</td><td style={td}>{vehicle.pickupCity} → {vehicle.dropoffCity}</td><td style={td}>Rs {vehicle.pricePerDay.toLocaleString()}</td><td style={td}><Badge value={vehicle.status} /></td></tr>) : <tr><td colSpan="5" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No vehicles yet.</td></tr>}</tbody></table></div> }
function PanelState({ title, text }) { return <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}><div><h1 style={{ color: '#1a1a2e' }}>{title}</h1>{text && <p style={{ color: '#667085' }}>{text}</p>}</div></div> }
const th = { padding: '10px 12px', textAlign: 'left', color: '#88929d', fontSize: 11, textTransform: 'uppercase', letterSpacing: .6, whiteSpace: 'nowrap' }
const td = { padding: '13px 12px', color: '#475467', verticalAlign: 'middle', whiteSpace: 'nowrap' }
const small = { display: 'block', marginTop: 3, color: '#98a2b3', fontSize: 11 }
