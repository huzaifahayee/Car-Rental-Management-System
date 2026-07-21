import { useEffect, useMemo, useState } from 'react'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import LocationAutocomplete from '../components/LocationAutocomplete'

const STATUS_COLORS = {
  PENDING: ['#fef9c3', '#a16207'],
  CONFIRMED: ['#dbeafe', '#1d4ed8'],
  CANCELLED: ['#fee2e2', '#dc2626'],
  COMPLETED: ['#dcfce7', '#16a34a'],
  AVAILABLE: ['#dcfce7', '#16a34a'],
  BOOKED: ['#dbeafe', '#1d4ed8'],
  MAINTENANCE: ['#ffedd5', '#c2410c'],
  INACTIVE: ['#f3f4f6', '#6b7280'],
  ACTIVE: ['#dcfce7', '#16a34a'],
}

const label = value => String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const date = value => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))

export default function AdminPanel() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [outlets, setOutlets] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal State for Outlets
  const [showOutletModal, setShowOutletModal] = useState(false)
  const [editingOutlet, setEditingOutlet] = useState(null)
  const [outletForm, setOutletForm] = useState({
    name: '',
    city: '',
    addressText: '',
    latitude: '',
    longitude: '',
    isActive: true,
  })
  const [outletFormError, setOutletFormError] = useState('')
  const [outletSubmitting, setOutletSubmitting] = useState(false)

  const reloadData = () => {
    if (!user) return
    Promise.all([
      apiFetch('/dashboard'),
      apiFetch('/bookings'),
      apiFetch('/vehicles'),
      apiFetch('/outlets?isActive=all'),
    ])
      .then(([dashboard, liveBookings, liveVehicles, liveOutlets]) => {
        setStats(dashboard)
        setBookings(liveBookings)
        setVehicles(liveVehicles)
        setOutlets(liveOutlets)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) {
      setError('Sign in with an admin or employee account to view the dashboard.')
      setLoading(false)
      return
    }
    reloadData()
  }, [user])

  const totalBookings = stats ? Object.values(stats.bookings).reduce((sum, count) => sum + count, 0) : 0
  const activeVehicles = stats ? stats.vehicles.AVAILABLE : 0
  const pendingBookings = stats ? stats.bookings.PENDING : 0
  const revenueBookings = bookings.filter(booking => ['CONFIRMED', 'COMPLETED'].includes(booking.status)).length
  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings])

  function openCreateOutletModal() {
    setEditingOutlet(null)
    setOutletForm({ name: '', city: '', addressText: '', latitude: '', longitude: '', isActive: true })
    setOutletFormError('')
    setShowOutletModal(true)
  }

  function openEditOutletModal(outlet) {
    setEditingOutlet(outlet)
    setOutletForm({
      name: outlet.name,
      city: outlet.city,
      addressText: outlet.addressText,
      latitude: String(outlet.latitude),
      longitude: String(outlet.longitude),
      isActive: outlet.isActive,
    })
    setOutletFormError('')
    setShowOutletModal(true)
  }

  async function handleSaveOutlet(e) {
    e.preventDefault()
    setOutletFormError('')

    const { name, city, addressText, latitude, longitude, isActive } = outletForm
    if (!name.trim() || !city.trim() || !addressText.trim() || latitude === '' || longitude === '') {
      setOutletFormError('All fields (name, city, address, latitude, longitude) are required.')
      return
    }

    const latNum = Number(latitude)
    const lngNum = Number(longitude)
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setOutletFormError('Latitude must be a valid number between -90 and 90.')
      return
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setOutletFormError('Longitude must be a valid number between -180 and 180.')
      return
    }

    setOutletSubmitting(true)
    try {
      if (editingOutlet) {
        await apiFetch(`/outlets/${editingOutlet.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            city: city.trim(),
            addressText: addressText.trim(),
            latitude: latNum,
            longitude: lngNum,
            isActive,
          }),
        })
      } else {
        await apiFetch('/outlets', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            city: city.trim(),
            addressText: addressText.trim(),
            latitude: latNum,
            longitude: lngNum,
          }),
        })
      }
      setShowOutletModal(false)
      reloadData()
    } catch (err) {
      setOutletFormError(err.message)
    } finally {
      setOutletSubmitting(false)
    }
  }

  async function handleDeactivateOutlet(outletId) {
    if (!window.confirm('Are you sure you want to deactivate this outlet branch?')) return
    try {
      await apiFetch(`/outlets/${outletId}`, { method: 'DELETE' })
      reloadData()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <PanelState title="Loading dashboard…" />
  if (error) return <PanelState title="Dashboard unavailable" text={error} />

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <header style={{ background: '#1a1a2e', padding: '14px 0' }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 style={{ color: '#fff', fontSize: 18, margin: 0 }}>Admin Panel</h1>
            <p style={{ color: '#9ca3af', fontSize: 12, margin: '3px 0 0' }}>Live rental operations</p>
          </div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{user.fullName}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <nav style={{ display: 'flex', gap: 4, width: 'fit-content', background: '#fff', borderRadius: 12, padding: 5, marginBottom: 26, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          {['overview', 'bookings', 'vehicles', 'outlets'].map(item => (
            <button
              key={item}
              onClick={() => setTab(item)}
              style={{
                border: 0, borderRadius: 8, padding: '8px 20px', cursor: 'pointer',
                background: tab === item ? '#00c472' : 'transparent',
                color: tab === item ? '#fff' : '#667085',
                fontWeight: 800, textTransform: 'capitalize',
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              <Stat label="Total bookings" value={totalBookings} />
              <Stat label="Available vehicles" value={activeVehicles} />
              <Stat label="Pending approvals" value={pendingBookings} />
              <Stat label="Active outlets" value={outlets.filter(o => o.isActive).length} />
            </div>
            <DataCard title="Recent bookings"><BookingsTable bookings={recentBookings} compact /></DataCard>
            <div style={{ height: 24 }} />
            <DataCard title="Vehicle availability"><VehiclesTable vehicles={vehicles} compact /></DataCard>
          </>
        )}

        {tab === 'bookings' && <DataCard title={`All bookings (${bookings.length})`}><BookingsTable bookings={bookings} /></DataCard>}
        {tab === 'vehicles' && <DataCard title={`All vehicles (${vehicles.length})`}><VehiclesTable vehicles={vehicles} /></DataCard>}
        
        {/* Outlets Management Tab */}
        {tab === 'outlets' && (
          <DataCard
            title={`Branch Outlets (${outlets.length})`}
            action={
              <button
                onClick={openCreateOutletModal}
                style={{
                  background: '#00c472', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                + Add Outlet
              </button>
            }
          >
            <OutletsTable
              outlets={outlets}
              onEdit={openEditOutletModal}
              onDeactivate={handleDeactivateOutlet}
            />
          </DataCard>
        )}
      </main>

      {/* Outlet Modal Form */}
      {showOutletModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e' }}>
                {editingOutlet ? 'Edit Branch Outlet' : 'Add New Branch Outlet'}
              </h2>
              <button onClick={() => setShowOutletModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <form onSubmit={handleSaveOutlet} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={modalLabel}>Outlet Name</label>
                <input
                  type="text"
                  value={outletForm.name}
                  onChange={e => setOutletForm({ ...outletForm, name: e.target.value })}
                  placeholder="e.g. Lahore – Gulberg Branch"
                  required
                  style={modalInput}
                />
              </div>

              <div>
                <label style={modalLabel}>City</label>
                <input
                  type="text"
                  value={outletForm.city}
                  onChange={e => setOutletForm({ ...outletForm, city: e.target.value })}
                  placeholder="e.g. Lahore"
                  required
                  style={modalInput}
                />
              </div>

              <div>
                <label style={modalLabel}>Address (Autocomplete or Manual)</label>
                <div style={{ border: '1.5px solid #d8e0e5', borderRadius: 9, padding: '9px 12px' }}>
                  <LocationAutocomplete
                    value={outletForm.addressText}
                    onChange={text => setOutletForm({ ...outletForm, addressText: text })}
                    onSelectLocation={({ address, lat, lng }) => {
                      setOutletForm({
                        ...outletForm,
                        addressText: address,
                        latitude: String(lat),
                        longitude: String(lng),
                      })
                    }}
                    placeholder="Search place address..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={modalLabel}>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={outletForm.latitude}
                    onChange={e => setOutletForm({ ...outletForm, latitude: e.target.value })}
                    placeholder="31.5204"
                    required
                    style={modalInput}
                  />
                </div>

                <div>
                  <label style={modalLabel}>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={outletForm.longitude}
                    onChange={e => setOutletForm({ ...outletForm, longitude: e.target.value })}
                    placeholder="74.3587"
                    required
                    style={modalInput}
                  />
                </div>
              </div>

              {editingOutlet && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={outletForm.isActive}
                    onChange={e => setOutletForm({ ...outletForm, isActive: e.target.checked })}
                    accentColor="#00c472"
                  />
                  <label htmlFor="isActive" style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>
                    Active Status (visible to customers)
                  </label>
                </div>
              )}

              {outletFormError && (
                <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{outletFormError}</p>
              )}

              <div className="flex justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowOutletModal(false)}
                  style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={outletSubmitting}
                  style={{ background: '#00c472', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: outletSubmitting ? 0.7 : 1 }}
                >
                  {outletSubmitting ? 'Saving...' : 'Save Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label: statLabel, value }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}>
      <p style={{ margin: '0 0 8px', color: '#8b95a1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>{statLabel}</p>
      <p style={{ margin: 0, fontSize: 27, color: '#1a1a2e', fontWeight: 800 }}>{value}</p>
    </div>
  )
}

function DataCard({ title, action, children }) {
  return (
    <section style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ margin: 0, color: '#1a1a2e', fontSize: 17 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Badge({ value }) {
  const [background, color] = STATUS_COLORS[value] || ['#f3f4f6', '#555']
  return (
    <span style={{ background, color, fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {label(value)}
    </span>
  )
}

function BookingsTable({ bookings }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Reference', 'Customer', 'Vehicle', 'Mode', 'Pickup/Outlet', 'Return', 'Status'].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.length ? bookings.map(booking => (
            <tr key={booking.id} style={{ borderTop: '1px solid #f1f3f5' }}>
              <td style={td}><strong style={{ color: '#00a85a' }}>{booking.bookingReference}</strong></td>
              <td style={td}>{booking.customer?.fullName || '—'}<small style={small}>{booking.customer?.phone || ''}</small></td>
              <td style={td}>{booking.vehiclePackage.make} {booking.vehiclePackage.model}</td>
              <td style={td}>
                <span style={{ background: '#f0fdf7', color: '#00a85a', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                  {booking.rentalMode === 'WITH_DRIVER' ? 'With-Driver' : 'Self-Drive'}
                </span>
              </td>
              <td style={td}>
                {booking.rentalMode === 'WITH_DRIVER'
                  ? (booking.pickupAddress || 'Address specified')
                  : (booking.outlet ? `${booking.outlet.name} (${booking.outlet.city})` : 'Outlet')}
              </td>
              <td style={td}>{date(booking.returnDateTime)}</td>
              <td style={td}><Badge value={booking.status} /></td>
            </tr>
          )) : (
            <tr><td colSpan="7" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No bookings yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function VehiclesTable({ vehicles }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Vehicle', 'Category', 'Route', 'Price/day', 'Status'].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.length ? vehicles.map(vehicle => (
            <tr key={vehicle.id} style={{ borderTop: '1px solid #f1f3f5' }}>
              <td style={td}><strong>{vehicle.make} {vehicle.model}</strong><small style={small}>{vehicle.seatingCapacity} seats · {vehicle.transmission.toLowerCase()}</small></td>
              <td style={td}>{label(vehicle.category)}</td>
              <td style={td}>{vehicle.pickupCity} → {vehicle.dropoffCity}</td>
              <td style={td}>Rs {vehicle.pricePerDay.toLocaleString()}</td>
              <td style={td}><Badge value={vehicle.status} /></td>
            </tr>
          )) : (
            <tr><td colSpan="5" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No vehicles yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function OutletsTable({ outlets, onEdit, onDeactivate }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Outlet Name', 'City', 'Address', 'Coordinates', 'Status', 'Actions'].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {outlets.length ? outlets.map(outlet => (
            <tr key={outlet.id} style={{ borderTop: '1px solid #f1f3f5' }}>
              <td style={td}><strong>{outlet.name}</strong></td>
              <td style={td}>{outlet.city}</td>
              <td style={td}>{outlet.addressText}</td>
              <td style={td}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${outlet.latitude},${outlet.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#00a85a', textDecoration: 'underline' }}
                >
                  {outlet.latitude.toFixed(4)}, {outlet.longitude.toFixed(4)} ↗
                </a>
              </td>
              <td style={td}>
                <Badge value={outlet.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </td>
              <td style={td}>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(outlet)}
                    style={{ background: '#f3f4f6', color: '#333', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  {outlet.isActive && (
                    <button
                      onClick={() => onDeactivate(outlet.id)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="6" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No branch outlets configured yet. Click "+ Add Outlet" to create one.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function PanelState({ title, text }) {
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div>
        <h1 style={{ color: '#1a1a2e' }}>{title}</h1>
        {text && <p style={{ color: '#667085' }}>{text}</p>}
      </div>
    </div>
  )
}

const th = { padding: '10px 12px', textAlign: 'left', color: '#88929d', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }
const td = { padding: '13px 12px', color: '#475467', verticalAlign: 'middle' }
const small = { display: 'block', marginTop: 3, color: '#98a2b3', fontSize: 11 }
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 16 }
const modalCardStyle = { background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
const modalLabel = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475467', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }
const modalInput = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid #d8e0e5', borderRadius: 8, fontSize: 14, color: '#1a1a2e' }
