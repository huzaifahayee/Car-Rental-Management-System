import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiFetch from '../lib/apiClient'
import IOSDropdown from '../components/IOSDropdown'
import VehicleCard, { formatCategory } from '../components/VehicleCard'

const CATEGORIES = ['all', 'economy', 'sedan', 'suv', 'luxury', 'van', 'pickup']

export default function SearchResults() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const searchState = location.state || {}

  const {
    tripType,
    rentalMode,
    pickupAddress,
    pickupLat,
    pickupLng,
    dropoffAddress,
    dropoffLat,
    dropoffLng,
    outletId,
    selectedOutlet,
    pickupTime,
    returnTime,
  } = searchState

  const [vehicles, setVehicles] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recommended')
  const [withDriverOnly, setWithDriverOnly] = useState(rentalMode === 'WITH_DRIVER')
  const [acOnly, setAcOnly] = useState(false)
  const [availableOnly, setAvailableOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiFetch('/vehicles')
      .then(data => { if (active) setVehicles(data) })
      .catch(err => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => vehicles
    .filter(v => activeCategory === 'all' || v.category.toLowerCase() === activeCategory)
    .filter(v => !withDriverOnly || v.driverOption)
    .filter(v => !acOnly || v.hasAC)
    .filter(v => !availableOnly || v.status === 'AVAILABLE')
    .sort((a, b) => sortBy === 'price_asc' ? a.pricePerDay - b.pricePerDay : sortBy === 'price_desc' ? b.pricePerDay - a.pricePerDay : 0), [vehicles, activeCategory, withDriverOnly, acOnly, availableOnly, sortBy])

  function handleBook(vehicleId) {
    navigate(`/book/${vehicleId}`, {
      state: {
        tripType,
        rentalMode,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        outletId,
        selectedOutlet,
        pickupTime,
        returnTime,
      },
    })
  }

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Top Banner */}
      <div style={{ background: '#1a1a2e', color: '#ccd6df', fontSize: 13, padding: '14px 0' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <strong style={{ color: '#fff', fontSize: 15 }}>Find your perfect rental</strong>
            <span style={{ marginLeft: 10, color: 'var(--brand)' }}>Live availability</span>
          </div>
          
          {rentalMode && (
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl">
<span style={{ background: 'var(--brand)', color: 'var(--surface)', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                {rentalMode === 'WITH_DRIVER' ? 'WITH DRIVER' : 'SELF DRIVE'}
              </span>
              
              {rentalMode === 'WITH_DRIVER' && pickupAddress && (
                <span style={{ color: '#fff', fontSize: 13 }}>
                  📍 {pickupAddress}
                </span>
              )}

              {rentalMode === 'SELF_DRIVE' && selectedOutlet && (
                <div className="flex items-center gap-2">
                  <span style={{ color: '#fff', fontSize: 13 }}>
                    🏢 Outlet: {selectedOutlet.name} ({selectedOutlet.city})
                  </span>
                  {selectedOutlet.latitude && selectedOutlet.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOutlet.latitude},${selectedOutlet.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--brand)', fontWeight: 700, fontSize: 12, textDecoration: 'underline' }}
                    >
                      Get Directions ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="search-layout flex gap-6" style={{ alignItems: 'flex-start' }}>
          <aside style={{ width: 240, flexShrink: 0, background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,.06)', position: 'sticky', top: 80 }}>
            <h2 style={{ fontWeight: 800, fontSize: 15, color: '#1a1a2e', marginBottom: 20 }}>Filters</h2>
            <p style={filterLabel}>Options</p>
            <FilterToggle label="With Driver" value={withDriverOnly} onChange={setWithDriverOnly} />
            <FilterToggle label="Air Conditioned" value={acOnly} onChange={setAcOnly} />
            <FilterToggle label="Available Only" value={availableOnly} onChange={setAvailableOnly} />
            <p style={{ ...filterLabel, marginTop: 24 }}>Category</p>
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 12px', borderRadius: 8, marginBottom: 4,
                  border: 'none', cursor: 'pointer', fontSize: 14,
                  fontWeight: activeCategory === category ? 700 : 500,
                  background: activeCategory === category ? 'rgba(var(--brand-2-rgb), 0.12)' : 'transparent',
                  color: activeCategory === category ? 'var(--brand-2)' : '#555',
                }}
              >
                {category === 'all' ? 'All Vehicles' : formatCategory(category)}
              </button>
            ))}
          </aside>

          <main style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <p style={{ fontSize: 14, color: '#666' }}>
                <strong style={{ color: '#1a1a2e' }}>{loading ? 'Loading' : filtered.length} vehicles</strong> found
              </p>
              <IOSDropdown
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                label="Sort Vehicles"
                options={[
                  { value: 'recommended', label: 'Recommended' },
                  { value: 'price_asc', label: 'Price: Low to High' },
                  { value: 'price_desc', label: 'Price: High to Low' }
                ]}
                style={{ width: '180px' }}
              />
            </div>

            {loading && <StateCard title="Loading vehicles" text="Checking the latest rental availability…" />}
            {error && <StateCard title="Could not load vehicles" text={error} error />}
            {!loading && !error && filtered.length === 0 && <StateCard title="No vehicles found" text="Try adjusting your filters." />}
            {!loading && !error && filtered.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(vehicle => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} currentUser={user} onBook={() => handleBook(vehicle.id)} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

const filterLabel = { fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }

function FilterToggle({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, cursor: 'pointer', fontSize: 14, color: '#444' }}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} accentColor="var(--brand)" />
      {label}
    </label>
  )
}

function StateCard({ title, text, error }) {
  return (
    <div style={{ borderRadius: 16, padding: '56px 24px', textAlign: 'center', background: error ? '#fff5f5' : '#fff', color: error ? '#c53030' : '#777' }}>
      <h2 style={{ margin: '0 0 8px', color: error ? '#c53030' : '#1a1a2e', fontSize: 18 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14 }}>{text}</p>
    </div>
  )
}
