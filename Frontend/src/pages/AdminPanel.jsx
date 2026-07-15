// Frontend/src/pages/AdminPanel.jsx
import { useState } from 'react'

const PLACEHOLDER_AGENCY_NAME = 'GariTrip Demo Agency'

// PLACEHOLDER: dummy dashboard stats, replace with real computed values later
const STATS = [
  { label: 'Total Bookings', value: '1,284', change: '+12%', up: true },
  { label: 'Active Vehicles', value: '94', change: '+3', up: true },
  { label: 'Revenue (Jul)', value: 'Rs 4.2M', change: '+8%', up: true },
  { label: 'Pending Approvals', value: '7', change: '-2', up: false },
]

// PLACEHOLDER: dummy bookings, replace with real API data
const BOOKINGS = [
  { id: 'BK-1041', customer: 'Ahmed Raza', phone: '+92 301 1234567', vehicle: 'Toyota Fortuner', category: 'SUV', pickup: 'Lahore', dropoff: 'Islamabad', date: '14 Jul 2026', days: 2, amount: 19000, status: 'Confirmed' },
  { id: 'BK-1040', customer: 'Sara Malik', phone: '+92 312 9876543', vehicle: 'Honda Civic', category: 'Sedan', pickup: 'Karachi', dropoff: 'Karachi', date: '13 Jul 2026', days: 1, amount: 5200, status: 'Completed' },
  { id: 'BK-1039', customer: 'Usman Tariq', phone: '+92 333 4567890', vehicle: 'Mercedes E-Class', category: 'Luxury', pickup: 'Lahore', dropoff: 'Murree', date: '12 Jul 2026', days: 3, amount: 54000, status: 'Confirmed' },
  { id: 'BK-1038', customer: 'Fatima Khan', phone: '+92 321 3344556', vehicle: 'Suzuki Alto', category: 'Economy', pickup: 'Rawalpindi', dropoff: 'Rawalpindi', date: '11 Jul 2026', days: 1, amount: 2200, status: 'Cancelled' },
  { id: 'BK-1037', customer: 'Bilal Chaudhry', phone: '+92 345 6677889', vehicle: 'Toyota Coaster', category: 'Van', pickup: 'Multan', dropoff: 'Lahore', date: '10 Jul 2026', days: 2, amount: 28000, status: 'Pending' },
  { id: 'BK-1036', customer: 'Nadia Hussain', phone: '+92 311 2233445', vehicle: 'Honda BR-V', category: 'SUV', pickup: 'Faisalabad', dropoff: 'Faisalabad', date: '09 Jul 2026', days: 2, amount: 13600, status: 'Completed' },
  { id: 'BK-1035', customer: 'Kamran Ali', phone: '+92 300 9988776', vehicle: 'BMW 5 Series', category: 'Luxury', pickup: 'Islamabad', dropoff: 'Lahore', date: '08 Jul 2026', days: 1, amount: 20000, status: 'Pending' },
  { id: 'BK-1034', customer: 'Zainab Iqbal', phone: '+92 302 5566778', vehicle: 'Toyota Corolla', category: 'Sedan', pickup: 'Lahore', dropoff: 'Lahore', date: '07 Jul 2026', days: 3, amount: 13500, status: 'Completed' },
]

// PLACEHOLDER: dummy vehicles, replace with real API data
const VEHICLES = [
  { id: 1, name: 'Toyota Corolla', category: 'Sedan', vendor: 'Al-Noor Rentals', city: 'Lahore', pricePerDay: 4500, status: 'Active', bookings: 48 },
  { id: 2, name: 'Honda Civic', category: 'Sedan', vendor: 'City Drive PKR', city: 'Karachi', pricePerDay: 5200, status: 'Active', bookings: 37 },
  { id: 3, name: 'Toyota Fortuner', category: 'SUV', vendor: 'Premium Rides', city: 'Islamabad', pricePerDay: 9500, status: 'Active', bookings: 62 },
  { id: 4, name: 'Suzuki Alto', category: 'Economy', vendor: 'Budget Cars PK', city: 'Rawalpindi', pricePerDay: 2200, status: 'Inactive', bookings: 21 },
  { id: 5, name: 'Mercedes E-Class', category: 'Luxury', vendor: 'Luxury Wheels', city: 'Lahore', pricePerDay: 18000, status: 'Active', bookings: 19 },
  { id: 6, name: 'Toyota Coaster', category: 'Van', vendor: 'Group Tours PK', city: 'Multan', pricePerDay: 14000, status: 'Under Maintenance', bookings: 31 },
]

const STATUS_COLORS = {
  Confirmed: { bg: '#dbeafe', color: '#1d4ed8' },
  Pending: { bg: '#fef9c3', color: '#a16207' },
  Cancelled: { bg: '#fee2e2', color: '#dc2626' },
  Completed: { bg: '#dcfce7', color: '#16a34a' },
  Active: { bg: '#dcfce7', color: '#16a34a' },
  Inactive: { bg: '#f3f4f6', color: '#6b7280' },
  'Under Maintenance': { bg: '#ffedd5', color: '#c2410c' },
}

function Badge({ label }) {
  const s = STATUS_COLORS[label] ?? { bg: '#f3f4f6', color: '#555' }
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
      {label}
    </span>
  )
}

export default function AdminPanel() {
  const [tab, setTab] = useState('overview')
  const [bookingFilter, setBookingFilter] = useState('all')
  const [vehicleFilter, setVehicleFilter] = useState('all')

  const filteredBookings = bookingFilter === 'all'
    ? BOOKINGS
    : BOOKINGS.filter(b => b.status === bookingFilter)

  const filteredVehicles = vehicleFilter === 'all'
    ? VEHICLES
    : VEHICLES.filter(v => v.status === vehicleFilter)

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>

      <div style={{ background: '#1a1a2e', padding: '14px 0' }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: 0 }}>Admin Panel</h1>
            <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{PLACEHOLDER_AGENCY_NAME} — Dashboard</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#00c472', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>A</span>
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: 0 }}>Admin</p>
              <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>Super Admin</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 12, padding: 5, width: 'fit-content', marginBottom: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'bookings', label: 'Bookings' },
            { id: 'vehicles', label: 'Vehicles' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, transition: 'all 0.15s',
                background: tab === t.id ? '#00c472' : 'transparent',
                color: tab === t.id ? '#fff' : '#666',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              {STATS.map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{s.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px' }}>{s.value}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: s.up ? '#16a34a' : '#dc2626', margin: 0 }}>{s.change} this month</p>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', margin: 0 }}>Recent Bookings</h2>
                <button onClick={() => setTab('bookings')} style={{ color: '#00c472', background: 'none', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>View All</button>
              </div>
              <BookingsTable bookings={BOOKINGS.slice(0, 5)} />
            </div>

            <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', margin: 0 }}>Vehicle Status</h2>
                <button onClick={() => setTab('vehicles')} style={{ color: '#00c472', background: 'none', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Manage</button>
              </div>
              <VehiclesTable vehicles={VEHICLES} />
            </div>
          </>
        )}

        {tab === 'bookings' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontWeight: 800, fontSize: 17, color: '#1a1a2e', margin: 0 }}>All Bookings</h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['all', 'Confirmed', 'Pending', 'Completed', 'Cancelled'].map(f => (
                  <button
                    key={f}
                    onClick={() => setBookingFilter(f)}
                    style={{
                      padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${bookingFilter === f ? '#00c472' : '#e0e0e0'}`,
                      background: bookingFilter === f ? '#00c472' : '#fff',
                      color: bookingFilter === f ? '#fff' : '#555',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
            </div>
            <BookingsTable bookings={filteredBookings} />
          </div>
        )}

        {tab === 'vehicles' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontWeight: 800, fontSize: 17, color: '#1a1a2e', margin: 0 }}>All Vehicles</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {['all', 'Active', 'Inactive', 'Under Maintenance'].map(f => (
                  <button
                    key={f}
                    onClick={() => setVehicleFilter(f)}
                    style={{
                      padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${vehicleFilter === f ? '#00c472' : '#e0e0e0'}`,
                      background: vehicleFilter === f ? '#00c472' : '#fff',
                      color: vehicleFilter === f ? '#fff' : '#555',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
                <button style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: '#1a1a2e', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                  + Add Vehicle
                </button>
              </div>
            </div>
            <VehiclesTable vehicles={filteredVehicles} />
          </div>
        )}
      </div>
    </div>
  )
}

function BookingsTable({ bookings }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
            {['Booking ID', 'Customer', 'Vehicle', 'Route', 'Date', 'Days', 'Amount', 'Status'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b.id} style={{ borderBottom: '1px solid #f8f8f8', transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fafafa' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <td style={{ padding: '13px 12px', fontWeight: 700, color: '#00a85a' }}>{b.id}</td>
              <td style={{ padding: '13px 12px' }}>
                <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{b.customer}</div>
                <div style={{ color: '#aaa', fontSize: 12 }}>{b.phone}</div>
              </td>
              <td style={{ padding: '13px 12px' }}>
                <div style={{ fontWeight: 600, color: '#333' }}>{b.vehicle}</div>
                <div style={{ color: '#aaa', fontSize: 12 }}>{b.category}</div>
              </td>
              <td style={{ padding: '13px 12px', color: '#555', whiteSpace: 'nowrap' }}>{b.pickup} → {b.dropoff}</td>
              <td style={{ padding: '13px 12px', color: '#555', whiteSpace: 'nowrap' }}>{b.date}</td>
              <td style={{ padding: '13px 12px', color: '#555', textAlign: 'center' }}>{b.days}</td>
              <td style={{ padding: '13px 12px', fontWeight: 700, color: '#1a1a2e', whiteSpace: 'nowrap' }}>Rs {b.amount.toLocaleString()}</td>
              <td style={{ padding: '13px 12px' }}><Badge label={b.status} /></td>
            </tr>
          ))}
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
          <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
            {['Vehicle', 'Category', 'Vendor', 'City', 'Price/Day', 'Total Bookings', 'Status', 'Actions'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.map(v => (
            <tr key={v.id} style={{ borderBottom: '1px solid #f8f8f8' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fafafa' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <td style={{ padding: '13px 12px', fontWeight: 700, color: '#1a1a2e' }}>{v.name}</td>
              <td style={{ padding: '13px 12px', color: '#555' }}>{v.category}</td>
              <td style={{ padding: '13px 12px', color: '#555' }}>{v.vendor}</td>
              <td style={{ padding: '13px 12px', color: '#555' }}>{v.city}</td>
              <td style={{ padding: '13px 12px', fontWeight: 700, color: '#1a1a2e' }}>Rs {v.pricePerDay.toLocaleString()}</td>
              <td style={{ padding: '13px 12px', color: '#555', textAlign: 'center' }}>{v.bookings}</td>
              <td style={{ padding: '13px 12px' }}><Badge label={v.status} /></td>
              <td style={{ padding: '13px 12px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ padding: '4px 12px', borderRadius: 6, border: '1.5px solid #e0e0e0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#555' }}>Edit</button>
                  <button style={{ padding: '4px 12px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>Remove</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}