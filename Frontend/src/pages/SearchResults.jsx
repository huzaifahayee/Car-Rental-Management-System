// Frontend/src/pages/SearchResults.jsx
import { useState } from 'react'

const CATEGORIES = [
  { id: 'all', label: 'All Vehicles' },
  { id: 'economy', label: 'Economy' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'van', label: 'Van / Coaster' },
  { id: 'pickup', label: 'Pickup' },
]

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
]

// PLACEHOLDER: dummy vehicle data, replace with real API data once backend exists
const VEHICLES = [
  { id: 1, name: 'Toyota Corolla', category: 'sedan', vendor: 'Al-Noor Rentals', city: 'Lahore', seats: 5, transmission: 'Automatic', pricePerDay: 4500, rating: 4.7, reviews: 128, image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: true },
  { id: 2, name: 'Honda Civic', category: 'sedan', vendor: 'City Drive PKR', city: 'Karachi', seats: 5, transmission: 'Automatic', pricePerDay: 5200, rating: 4.5, reviews: 94, image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: true },
  { id: 3, name: 'Toyota Fortuner', category: 'suv', vendor: 'Premium Rides', city: 'Islamabad', seats: 7, transmission: 'Automatic', pricePerDay: 9500, rating: 4.9, reviews: 211, image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: true },
  { id: 4, name: 'Suzuki Alto', category: 'economy', vendor: 'Budget Cars PK', city: 'Rawalpindi', seats: 4, transmission: 'Manual', pricePerDay: 2200, rating: 4.1, reviews: 57, image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=360&fit=crop&auto=format', withDriver: false, ac: false, available: true },
  { id: 5, name: 'Mercedes E-Class', category: 'luxury', vendor: 'Luxury Wheels', city: 'Lahore', seats: 5, transmission: 'Automatic', pricePerDay: 18000, rating: 4.8, reviews: 43, image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: true },
  { id: 6, name: 'Toyota Coaster', category: 'van', vendor: 'Group Tours PK', city: 'Multan', seats: 22, transmission: 'Manual', pricePerDay: 14000, rating: 4.6, reviews: 76, image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: true },
  { id: 7, name: 'Honda BR-V', category: 'suv', vendor: 'Safe Travels', city: 'Faisalabad', seats: 7, transmission: 'Automatic', pricePerDay: 6800, rating: 4.4, reviews: 88, image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: false },
  { id: 8, name: 'Suzuki Cultus', category: 'economy', vendor: 'Pak Economy Cars', city: 'Peshawar', seats: 5, transmission: 'Manual', pricePerDay: 2600, rating: 4.0, reviews: 39, image: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=600&h=360&fit=crop&auto=format', withDriver: false, ac: true, available: true },
  { id: 9, name: 'Toyota Land Cruiser', category: 'luxury', vendor: 'Elite Rides', city: 'Islamabad', seats: 8, transmission: 'Automatic', pricePerDay: 24000, rating: 4.9, reviews: 61, image: 'https://images.unsplash.com/photo-1568844293986-ca047c3d9f16?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: true },
  { id: 10, name: 'Hiace Grand Cabin', category: 'van', vendor: 'Family Rides PK', city: 'Karachi', seats: 14, transmission: 'Manual', pricePerDay: 9000, rating: 4.3, reviews: 52, image: 'https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: true },
  { id: 11, name: 'Toyota Hilux', category: 'pickup', vendor: 'Cargo Rentals', city: 'Quetta', seats: 5, transmission: 'Manual', pricePerDay: 7500, rating: 4.2, reviews: 29, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=360&fit=crop&auto=format', withDriver: false, ac: true, available: true },
  { id: 12, name: 'BMW 5 Series', category: 'luxury', vendor: 'Prestige Motors', city: 'Lahore', seats: 5, transmission: 'Automatic', pricePerDay: 20000, rating: 4.7, reviews: 34, image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&h=360&fit=crop&auto=format', withDriver: true, ac: true, available: true },
]

function StarRating({ rating }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
    </span>
  )
}

export default function SearchResults() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recommended')
  const [withDriverOnly, setWithDriverOnly] = useState(false)
  const [acOnly, setAcOnly] = useState(false)
  const [availableOnly, setAvailableOnly] = useState(false)

  const filtered = VEHICLES
    .filter(v => activeCategory === 'all' || v.category === activeCategory)
    .filter(v => !withDriverOnly || v.withDriver)
    .filter(v => !acOnly || v.ac)
    .filter(v => !availableOnly || v.available)
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.pricePerDay - b.pricePerDay
      if (sortBy === 'price_desc') return b.pricePerDay - a.pricePerDay
      if (sortBy === 'rating') return b.rating - a.rating
      return 0
    })

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>

      {/* Search summary bar */}
      <div style={{ background: '#1a1a2e', color: '#ccc', fontSize: 13, padding: '10px 0' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-3 items-center">
          <span style={{ color: '#fff', fontWeight: 600 }}>Lahore</span>
          <span style={{ color: '#555' }}>→</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>Islamabad</span>
          <span style={{ color: '#555' }}>|</span>
          <span>14 Jul 2026, 09:00</span>
          <span style={{ color: '#555' }}>—</span>
          <span>16 Jul 2026, 18:00</span>
          <button style={{ marginLeft: 'auto', color: '#00c472', background: 'none', border: '1px solid #00c472', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            Modify Search
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6" style={{ alignItems: 'flex-start' }}>

          {/* Sidebar filters */}
          <aside style={{ width: 240, flexShrink: 0, background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', position: 'sticky', top: 80 }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: '#1a1a2e', marginBottom: 20 }}>Filters</h3>

            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Options</p>
              {[
                { label: 'With Driver', state: withDriverOnly, setter: setWithDriverOnly },
                { label: 'Air Conditioned', state: acOnly, setter: setAcOnly },
                { label: 'Available Only', state: availableOnly, setter: setAvailableOnly },
              ].map(({ label, state, setter }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
                  <div
                    onClick={() => setter(v => !v)}
                    style={{
                      width: 18, height: 18, borderRadius: 5,
                      border: `2px solid ${state ? '#00c472' : '#ddd'}`,
                      background: state ? '#00c472' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                    }}
                  >
                    {state && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: '#444', userSelect: 'none' }}>{label}</span>
                </label>
              ))}
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Category</p>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 12px', borderRadius: 8, marginBottom: 4,
                    border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: activeCategory === cat.id ? 700 : 500,
                    background: activeCategory === cat.id ? '#e8faf2' : 'transparent',
                    color: activeCategory === cat.id ? '#00a85a' : '#555',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Results */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <p style={{ fontSize: 14, color: '#666' }}>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{filtered.length} vehicles</span> found
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>Sort by:</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{ border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#333', outline: 'none', cursor: 'pointer' }}
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: '6px 16px', borderRadius: 30, fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${activeCategory === cat.id ? '#00c472' : '#e0e0e0'}`,
                    background: activeCategory === cat.id ? '#00c472' : '#fff',
                    color: activeCategory === cat.id ? '#fff' : '#555',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No vehicles found</p>
                <p style={{ fontSize: 14 }}>Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(v => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function VehicleCard({ vehicle: v }) {
  const [booked, setBooked] = useState(false)

  return (
    <div
      style={{
        background: '#fff', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #f0f0f0',
        transition: 'transform 0.15s, box-shadow 0.15s',
        opacity: v.available ? 1 : 0.65,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)' }}
    >
      <div style={{ position: 'relative', height: 170, background: '#e8f0f0', overflow: 'hidden' }}>
        <img src={v.image} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{
          position: 'absolute', top: 12, left: 12,
          background: '#1a1a2e', color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', letterSpacing: 0.5,
        }}>
          {v.category === 'van' ? 'Van / Coaster' : v.category}
        </span>
        {!v.available && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: 8 }}>Unavailable</span>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, color: '#1a1a2e', margin: 0 }}>{v.name}</h3>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#00a85a' }}>Rs {v.pricePerDay.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#999' }}>per day</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>{v.vendor} — {v.city}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <StarRating rating={v.rating} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{v.rating}</span>
          <span style={{ fontSize: 12, color: '#aaa' }}>({v.reviews} reviews)</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {[
            `${v.seats} Seats`,
            v.transmission,
            v.ac ? 'AC' : 'No AC',
            v.withDriver ? 'With Driver' : 'Self Drive',
          ].map(tag => (
            <span key={tag} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px',
              borderRadius: 20, background: '#f5f7fa', color: '#555',
              border: '1px solid #ebebeb',
            }}>
              {tag}
            </span>
          ))}
        </div>

        <button
          disabled={!v.available}
          onClick={() => setBooked(b => !b)}
          style={{
            width: '100%', padding: '10px', borderRadius: 10,
            fontWeight: 700, fontSize: 14, cursor: v.available ? 'pointer' : 'not-allowed',
            background: !v.available ? '#e0e0e0' : booked ? '#e8faf2' : 'linear-gradient(90deg, #00c472, #00a85a)',
            color: !v.available ? '#aaa' : booked ? '#00a85a' : '#fff',
            transition: 'all 0.2s',
            border: booked ? '1.5px solid #00c472' : 'none',
          }}
        >
          {!v.available ? 'Unavailable' : booked ? 'Booking Confirmed' : 'Book Now'}
        </button>
      </div>
    </div>
  )
}