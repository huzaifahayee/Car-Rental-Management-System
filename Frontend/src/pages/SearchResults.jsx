import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../lib/apiClient'

const CATEGORIES = ['all', 'economy', 'sedan', 'suv', 'luxury', 'van', 'pickup']

function formatCategory(category) {
  return category === 'van' ? 'Van / Coaster' : category.charAt(0).toUpperCase() + category.slice(1)
}

export default function SearchResults() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recommended')
  const [withDriverOnly, setWithDriverOnly] = useState(false)
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

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ background: '#1a1a2e', color: '#ccd6df', fontSize: 13, padding: '11px 0' }}>
        <div className="max-w-7xl mx-auto px-6"><strong style={{ color: '#fff' }}>Find your perfect rental</strong><span style={{ marginLeft: 10, color: '#00c472' }}>Live availability</span></div>
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
            {CATEGORIES.map(category => <button key={category} onClick={() => setActiveCategory(category)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8, marginBottom: 4, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: activeCategory === category ? 700 : 500, background: activeCategory === category ? '#e8faf2' : 'transparent', color: activeCategory === category ? '#00a85a' : '#555' }}>{category === 'all' ? 'All Vehicles' : formatCategory(category)}</button>)}
          </aside>
          <main style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <p style={{ fontSize: 14, color: '#666' }}><strong style={{ color: '#1a1a2e' }}>{loading ? 'Loading' : filtered.length} vehicles</strong> found</p>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort vehicles" style={{ border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                <option value="recommended">Recommended</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option>
              </select>
            </div>
            {loading && <StateCard title="Loading vehicles" text="Checking the latest rental availability…" />}
            {error && <StateCard title="Could not load vehicles" text={error} error />}
            {!loading && !error && filtered.length === 0 && <StateCard title="No vehicles found" text="Try adjusting your filters." />}
            {!loading && !error && filtered.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{filtered.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} onBook={() => navigate(`/book/${vehicle.id}`)} />)}</div>}
          </main>
        </div>
      </div>
    </div>
  )
}

const filterLabel = { fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }

function FilterToggle({ label, value, onChange }) {
  return <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, cursor: 'pointer', fontSize: 14, color: '#444' }}><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} accentColor="#00c472" />{label}</label>
}

function StateCard({ title, text, error }) {
  return <div style={{ borderRadius: 16, padding: '56px 24px', textAlign: 'center', background: error ? '#fff5f5' : '#fff', color: error ? '#c53030' : '#777' }}><h2 style={{ margin: '0 0 8px', color: error ? '#c53030' : '#1a1a2e', fontSize: 18 }}>{title}</h2><p style={{ margin: 0, fontSize: 14 }}>{text}</p></div>
}

function VehicleCard({ vehicle, onBook }) {
  const available = vehicle.status === 'AVAILABLE'
  const image = vehicle.imageUrls?.[0]
  return <article style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.07)', opacity: available ? 1 : .7 }}>
    <div style={{ height: 170, background: '#dce8e4', position: 'relative' }}>{image ? <img src={image} alt={`${vehicle.make} ${vehicle.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#527064', fontWeight: 700 }}>Vehicle image coming soon</div>}<span style={{ position: 'absolute', top: 12, left: 12, background: '#1a1a2e', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{formatCategory(vehicle.category)}</span></div>
    <div style={{ padding: '16px 18px' }}><div className="flex justify-between gap-3"><h2 style={{ margin: 0, fontSize: 16, color: '#1a1a2e' }}>{vehicle.make} {vehicle.model}</h2><strong style={{ color: '#00a85a', whiteSpace: 'nowrap' }}>Rs {vehicle.pricePerDay.toLocaleString()}/day</strong></div><p style={{ color: '#888', fontSize: 13 }}>{vehicle.pickupCity} · {vehicle.seatingCapacity} seats · {vehicle.transmission.toLowerCase()}</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>{[vehicle.hasAC && 'AC', vehicle.driverOption ? 'With Driver' : 'Self Drive', available ? 'Available' : vehicle.status.replace('_', ' ')].filter(Boolean).map(tag => <span key={tag} style={{ background: tag === 'Available' ? '#e8faf2' : '#f5f7fa', color: tag === 'Available' ? '#00a85a' : '#555', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{tag}</span>)}</div><button disabled={!available} onClick={onBook} style={{ width: '100%', border: 'none', borderRadius: 10, padding: 10, background: available ? 'linear-gradient(90deg,#00c472,#00a85a)' : '#e5e7eb', color: available ? '#fff' : '#9ca3af', fontWeight: 800, cursor: available ? 'pointer' : 'not-allowed' }}>{available ? 'Book this vehicle' : 'Currently unavailable'}</button></div>
  </article>
}
