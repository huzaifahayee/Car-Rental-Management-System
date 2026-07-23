// Frontend/src/pages/Home.jsx
import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiFetch from '../lib/apiClient'
import LocationAutocomplete from '../components/LocationAutocomplete'
import IOSDropdown from '../components/IOSDropdown'
import CustomDateTimePicker from '../components/CustomDateTimePicker'
import VehicleCard from '../components/VehicleCard'

const STAFF_ROLES = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']

const HERO_HEADLINE = 'Find the Best Deals for Your Car Rental in Pakistan'
const HERO_SUBHEADING = 'Rent a car anywhere in Pakistan — fast, affordable, and reliable'

// Real stats fetched from backend
const DEFAULT_STATS = [
  { value: 0, suffix: '+', label: 'Car Vendors' },
  { value: 0, suffix: '+', label: 'Cities Covered' },
  { value: 0, suffix: '+', label: 'Happy Travelers' },
  { value: '24/7', label: 'Customer Support' },
]

const POPULAR_CITIES = []

const CITY_CONTENT = [
  {
    city: 'Car Rental in Lahore',
    text: "Lahore, Pakistan's second-largest city and cultural capital, offers a rich blend of Mughal heritage and modern life. Whether you're visiting the Badshahi Mosque, exploring the Walled City, or attending a business meeting in Gulberg, renting a car in Lahore gives you the freedom to move at your own pace.",
  },
  {
    city: 'Car Rental in Islamabad',
    text: "Nestled against the backdrop of the Margalla Hills, Islamabad is Pakistan's modern, planned capital. Explore Faisal Mosque, the Pakistan Monument, or take a scenic drive to Murree with a comfortable rental car.",
  },
  {
    city: 'Car Rental in Rawalpindi',
    text: "Rawalpindi, the fourth largest city of Pakistan and twin city of Islamabad, is a bustling hub of commerce and culture. Having your own rental car in Rawalpindi lets you navigate the city's vibrant streets with ease.",
  },
  {
    city: 'Car Rental in Faisalabad',
    text: "Faisalabad, the hub of Pakistan's textile industry, is a city that never sleeps. Whether you're here for business at the textile markets or exploring the Clock Tower, a rental car ensures you reach every destination on time and in comfort.",
  },
  {
    city: 'Car Rental in Gujranwala',
    text: "Gujranwala, known as the City of Wrestlers, is a rapidly growing industrial and commercial city. With our car rental service, you can explore its markets, sports facilities, and surrounding areas without depending on public transport.",
  },
]

const HOW_TO_STEPS = [
  { step: 1, title: 'Visit Car Rental', desc: 'Open the website and navigate to the Car Rental section from the main menu.' },
  { step: 2, title: 'Enter Your Details', desc: 'Fill in your pickup location, drop-off destination, travel date, and preferred time of pickup.' },
  { step: 3, title: 'Browse Available Vehicles', desc: 'View a list of available cars and vans with pricing, vehicle details, and ratings.' },
  { step: 4, title: 'Select Your Vehicle', desc: 'Pick the vehicle that best fits your needs — economy, sedan, SUV, luxury, or coaster.' },
  { step: 5, title: 'Confirm Booking Details', desc: 'Review your trip details, passenger count, and any additional services before proceeding.' },
  { step: 6, title: 'Checkout and Confirm', desc: 'Complete the payment securely and receive your booking confirmation instantly.' },
]

const TRUST_POINTS = [
  { icon: '✓', title: 'Verified rental partners', text: 'Trusted vendors and transparent pricing.' },
  { icon: '⌁', title: 'Instant booking support', text: 'Help whenever your plans change.' },
  { icon: '🔒', title: 'Secure, simple booking', text: 'Your trip details stay protected.' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const isStaff = !loading && user && STAFF_ROLES.includes(user.role)
  const heroRef = useRef(null)

  // Trip Type: within city vs out of city
  const [tripType, setTripType] = useState('within')

  // Rental Mode: WITH_DRIVER vs SELF_DRIVE
  const [rentalMode, setRentalMode] = useState('WITH_DRIVER')

  // With-driver address state
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLat, setPickupLat] = useState(null)
  const [pickupLng, setPickupLng] = useState(null)

  const [dropoffAddress, setDropoffAddress] = useState('')
  const [dropoffLat, setDropoffLat] = useState(null)
  const [dropoffLng, setDropoffLng] = useState(null)

  // Self-drive outlet state
  const [outlets, setOutlets] = useState([])
  const [stats, setStats] = useState(DEFAULT_STATS)
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [loadingOutlets, setLoadingOutlets] = useState(false)
  const [outletError, setOutletError] = useState('')

  // Dates
  const [pickupTime, setPickupTime] = useState('')
  const [returnTime, setReturnTime] = useState('')

  const [validationError, setValidationError] = useState('')

  // Fetch active outlets (used across the Home page for city listing)
  useEffect(() => {
    setLoadingOutlets(true)
    setOutletError('')
    apiFetch('/outlets')
      .then((data) => {
        setOutlets(data)
        if (!selectedOutletId && data.length > 0) setSelectedOutletId(String(data[0].id))
      })
      .catch((err) => setOutletError(err.message))
      .finally(() => setLoadingOutlets(false))
  }, [])

  // Fetch public stats for homepage
  useEffect(() => {
    apiFetch('/public/stats')
      .then(data => {
        setStats([
          { value: data.vehiclesCount || 0, suffix: '+', label: 'Car Vendors' },
          { value: data.citiesCount || 0, suffix: '+', label: 'Cities Covered' },
          { value: data.completedBookings || 0, suffix: '+', label: 'Happy Travelers' },
          { value: '24/7', label: 'Customer Support' },
        ])
      })
      .catch(() => {})
  }, [])

  // Also fetch outlets when self-drive selection needs fresh list
  useEffect(() => {
    if (rentalMode === 'SELF_DRIVE' && outlets.length === 0) {
      setLoadingOutlets(true)
      apiFetch('/outlets')
        .then((data) => {
          setOutlets(data)
          if (!selectedOutletId && data.length > 0) setSelectedOutletId(String(data[0].id))
        })
        .catch((err) => setOutletError(err.message))
        .finally(() => setLoadingOutlets(false))
    }
  }, [rentalMode, outlets.length, selectedOutletId])

  // Group outlets by city to show unique city list with outlet mentions
  const cityGroups = useMemo(() => {
    const map = new Map()
    for (const o of outlets || []) {
      const city = (o.city || 'Unknown').trim()
      if (!map.has(city)) map.set(city, { city, outlets: [] })
      map.get(city).outlets.push({ id: o.id, name: o.name, address: o.addressText })
    }
    return Array.from(map.values())
  }, [outlets])

  function handleHeroMove(event) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !heroRef.current) return
    const bounds = heroRef.current.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    heroRef.current.style.setProperty('--hero-shift-x', `${x * -10}px`)
    heroRef.current.style.setProperty('--hero-shift-y', `${y * -7}px`)
    heroRef.current.style.setProperty('--card-shift-x', `${x * 8}px`)
    heroRef.current.style.setProperty('--card-shift-y', `${y * 6}px`)
  }

  function resetHeroMove() {
    heroRef.current?.style.setProperty('--hero-shift-x', '0px')
    heroRef.current?.style.setProperty('--hero-shift-y', '0px')
    heroRef.current?.style.setProperty('--card-shift-x', '0px')
    heroRef.current?.style.setProperty('--card-shift-y', '0px')
  }

  function handleSearch() {
    setValidationError('')

    if (rentalMode === 'WITH_DRIVER') {
      if (!pickupAddress.trim()) {
        setValidationError('Please enter a pickup location.')
        return
      }
    } else {
      if (!selectedOutletId) {
        setValidationError('Please select an outlet location.')
        return
      }
    }

    if (!pickupTime) {
      setValidationError('Please select a pickup date and time.')
      return
    }

    if (!returnTime) {
      setValidationError('Please select a return date and time.')
      return
    }

    const pickupDate = new Date(pickupTime)
    const returnDate = new Date(returnTime)
    const now = new Date()

    if (isNaN(pickupDate.getTime())) {
      setValidationError('Please enter a valid pickup date and time.')
      return
    }

    if (isNaN(returnDate.getTime())) {
      setValidationError('Please enter a valid return date and time.')
      return
    }

    if (returnDate <= pickupDate) {
      setValidationError('Return date and time must be after the pickup date and time.')
      return
    }

    const selectedOutlet = outlets.find((o) => o.id === Number(selectedOutletId))

    navigate('/search', {
      state: {
        tripType,
        rentalMode,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        outletId: selectedOutletId ? Number(selectedOutletId) : null,
        selectedOutlet: selectedOutlet || null,
        pickupTime,
        returnTime,
      },
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f7fa', color: '#667085' }}>
        Loading dashboard…
      </div>
    )
  }

  if (isStaff) {
    return <StaffHomeLanding user={user} />
  }

  return (
    <>
      {/* Hero */}
      <section
        ref={heroRef}
        className="hero-section"
        onMouseMove={handleHeroMove}
        onMouseLeave={resetHeroMove}
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          className="hero-background"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&h=600&fit=crop&auto=format)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.18,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,32,39,0.6) 0%, rgba(15,32,39,0.85) 100%)' }} />
        <div className="hero-ambient hero-ambient-one" aria-hidden="true" />
        <div className="hero-ambient hero-ambient-two" aria-hidden="true" />
        <div className="hero-road-lines" aria-hidden="true" />

        <div className="hero-content relative max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
          <p className="hero-enter hero-enter-1" style={{ color: 'var(--brand)', fontWeight: 700, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
            Car Rental Booking
          </p>
          <h1 className="hero-enter hero-enter-2" style={{ color: '#fff', fontWeight: 800, fontSize: 'clamp(24px, 4.5vw, 44px)', lineHeight: 1.2, marginBottom: 12 }}>
            {HERO_HEADLINE}
          </h1>
          <p className="hero-enter hero-enter-3" style={{ color: '#b0c4d4', fontSize: 15, marginBottom: 14 }}>{HERO_SUBHEADING}</p>
          <div className="hero-proof hero-enter hero-enter-3">
            <span className="hero-proof-stars">★★★★★</span>
            <span>Trusted by travellers across Pakistan</span>
          </div>

          <div className="hero-search-card hero-enter hero-enter-4" style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '28px 32px', textAlign: 'left' }}>
            
            {/* Toggles Row */}
            <div className="flex flex-wrap gap-6 mb-6 pb-4" style={{ borderBottom: '1px solid #f0f0f0' }}>
              {/* Trip Type Toggle */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Trip Type</p>
                <div className="flex gap-4">
                  {['within', 'out'].map(type => (
                    <label key={type} className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                      <div
                        onClick={() => setTripType(type)}
                        style={{
                          width: 18, height: 18, borderRadius: '50%',
                          border: `2px solid ${tripType === type ? 'var(--brand)' : '#ccc'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        {tripType === type && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--brand)' }} />}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#333', userSelect: 'none' }}>
                        {type === 'within' ? 'Within City' : 'Out of City'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rental Mode Toggle */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Rental Mode</p>
                <div className="flex gap-4">
                  {[
                    { mode: 'WITH_DRIVER', label: 'With-Driver' },
                    { mode: 'SELF_DRIVE', label: 'Self-Drive (Without Driver)' },
                  ].map(({ mode, label }) => (
                    <label key={mode} className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                      <div
                        onClick={() => setRentalMode(mode)}
                        style={{
                          width: 18, height: 18, borderRadius: '50%',
                          border: `2px solid ${rentalMode === mode ? 'var(--brand)' : '#ccc'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        {rentalMode === mode && <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--brand)' }} />}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#333', userSelect: 'none' }}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Inputs Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {rentalMode === 'WITH_DRIVER' ? (
                <>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Pickup Location</label>
                    <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', marginTop: 6 }}>
                      <LocationAutocomplete
                        value={pickupAddress}
                        onChange={(text) => setPickupAddress(text)}
                        onSelectLocation={({ address, lat, lng }) => {
                          setPickupAddress(address)
                          setPickupLat(lat)
                          setPickupLng(lng)
                        }}
                        placeholder="Enter pickup address or landmark"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Drop-off Location {tripType === 'within' ? '(Optional)' : ''}
                    </label>
                    <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', marginTop: 6 }}>
                      <LocationAutocomplete
                        value={dropoffAddress}
                        onChange={(text) => setDropoffAddress(text)}
                        onSelectLocation={({ address, lat, lng }) => {
                          setDropoffAddress(address)
                          setDropoffLat(lat)
                          setDropoffLng(lng)
                        }}
                        placeholder="Enter drop-off address or city"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2">
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Pick Branch / Outlet Location (Self-Drive)
                  </label>
                  <div style={{ marginTop: 6 }}>
                    {loadingOutlets ? (
                      <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px' }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#888' }}>Loading branch locations...</p>
                      </div>
                    ) : outletError ? (
                      <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px' }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#c53030' }}>{outletError}</p>
                      </div>
                    ) : outlets.length === 0 ? (
                      <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px' }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#c53030' }}>No outlets configured for this agency yet. Please contact support.</p>
                      </div>
                    ) : (
                      <IOSDropdown
                        value={selectedOutletId}
                        onChange={(e) => setSelectedOutletId(e.target.value)}
                        label="Select Branch / Outlet"
                        options={outlets.map((outlet) => ({
                          value: String(outlet.id),
                          label: `${outlet.city} — ${outlet.name} (${outlet.addressText})`
                        }))}
                        style={{ width: '100%' }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Custom Datetime Pickers */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Pickup Date and Time *</label>
                <div style={{ marginTop: 6 }}>
                  <CustomDateTimePicker
                    value={pickupTime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={val => setPickupTime(val)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Return Date and Time *</label>
                <div style={{ marginTop: 6 }}>
                  <CustomDateTimePicker
                    value={returnTime}
                    min={pickupTime || new Date().toISOString().slice(0, 16)}
                    onChange={val => setReturnTime(val)}
                  />
                </div>
              </div>
            </div>

            {/* Route preview */}
            <div className="route-preview" aria-label="Your planned route preview">
              <span className="route-place">
                {rentalMode === 'WITH_DRIVER'
                  ? (pickupAddress || 'Pickup location')
                  : (outlets.find(o => o.id === Number(selectedOutletId))?.name || 'Selected outlet')}
              </span>
              <span className="route-line" aria-hidden="true"><i /></span>
              <span className="route-place route-place-end">
                {rentalMode === 'WITH_DRIVER'
                  ? (dropoffAddress || (tripType === 'within' ? 'Same city return' : 'Drop-off location'))
                  : 'Self-Drive return to branch'}
              </span>
            </div>

            {validationError && (
              <p style={{ color: '#c53030', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                {validationError}
              </p>
            )}

            <button
              className="search-cta"
                style={{
                background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                color: 'var(--surface)', border: 'none', borderRadius: 12,
                padding: '14px 48px', fontWeight: 800, fontSize: 15,
                cursor: 'pointer', width: '100%', letterSpacing: 0.5,
                boxShadow: '0 4px 20px rgba(var(--brand-rgb),0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              onClick={handleSearch}
            >
              Search Available Cars
            </button>
          </div>

        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {stats.map((s, index) => <Stat key={s.label} {...s} delay={index * 90} />)}
        </div>
      </section>

      <section className="trust-section">
        <div className="max-w-6xl mx-auto px-6 py-7 grid grid-cols-1 md:grid-cols-3 gap-4">
          {TRUST_POINTS.map((point, index) => (
            <div className="trust-card" key={point.title} style={{ animationDelay: `${index * 100}ms` }}>
              <div className="trust-icon" aria-hidden="true">{point.icon}</div>
              <div>
                <h2>{point.title}</h2>
                <p>{point.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular destinations */}
      <section id="destinations" className="max-w-6xl mx-auto px-6 py-14 scroll-reveal">
        <h2 style={{ fontWeight: 800, fontSize: 22, color: '#1a1a2e', marginBottom: 6 }}>Popular Car Rental Destinations</h2>
        <p style={{ color: '#777', fontSize: 14, marginBottom: 20 }}>Explore car rental options across major cities in Pakistan</p>
        <div className="flex flex-wrap gap-3">
          {(cityGroups.length ? cityGroups : POPULAR_CITIES).map(item => (
            <button
              key={item.city}
              style={{
                padding: '8px 18px', borderRadius: 30,
                border: '1.5px solid #d8f5ea', background: '#f0fdf7',
                color: 'var(--brand-2)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.color = 'var(--surface)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf7'; e.currentTarget.style.color = 'var(--brand-2)' }}
            >
              {typeof item === 'string' ? item : item.city}
            </button>
          ))}
        </div>
      </section>

      {/* City editorial (dynamic from destinations) */}
      <section className="scroll-reveal" style={{ background: '#fff' }}>
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 style={{ fontWeight: 800, fontSize: 22, color: '#1a1a2e', marginBottom: 4 }}>Car Rental Services Across Pakistan</h2>
          <p style={{ color: '#777', fontSize: 14, marginBottom: 32 }}>Comprehensive car rental solutions in every major city</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(cityGroups.length ? cityGroups : CITY_CONTENT).slice(0, 6).map((item, idx) => (
              <div key={item.city || idx} style={{ borderLeft: '3px solid var(--brand)', paddingLeft: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 8 }}>{item.city || item.name || item}</h3>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.75 }}>{
                  item.outlets ? (
                    `${item.outlets.length} outlet${item.outlets.length === 1 ? '' : 's'} — ${item.outlets.map(o => o.name).join(', ')}`
                  ) : (item.tagline || item.text || '')
                }</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How-to steps */}
      <section id="how-it-works" className="scroll-reveal" style={{ background: 'linear-gradient(135deg, #f0fdf7 0%, #e8f8f0 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <ScrollWords as="h2" text="How to Book a Car" style={{ fontWeight: 800, fontSize: 26, color: '#1a1a2e', marginBottom: 8 }} />
            <ScrollWords text="Simple steps to get your rental car booked in minutes" style={{ color: '#666', fontSize: 15 }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {HOW_TO_STEPS.map(({ step, title, desc }) => (
              <div
                key={step}
                style={{
                  background: '#fff', borderRadius: 14, padding: '20px 24px',
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e8faf2',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(var(--brand-rgb),0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <div style={{
                  minWidth: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 16,
                }}>
                  {step}
                </div>
                <div>
                  <ScrollWords as="div" text={title} style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 4 }} />
                  <ScrollWords text={desc} style={{ fontSize: 13.5, color: '#666', lineHeight: 1.65 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function StaffHomeLanding({ user }) {
  const [vehicles, setVehicles] = useState([])
  const [showAllCars, setShowAllCars] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleViewAllCars() {
    setShowAllCars(true)
    if (vehicles.length > 0) return

    setLoading(true)
    setError('')
    apiFetch('/vehicles')
      .then(setVehicles)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <section
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&h=600&fit=crop&auto=format)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.18,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,32,39,0.6) 0%, rgba(15,32,39,0.85) 100%)' }} />

        <div className="max-w-4xl mx-auto px-6 py-20 text-center relative">
          <p style={{ color: 'var(--brand)', fontWeight: 700, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
            Staff Dashboard
          </p>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 'clamp(24px, 4.5vw, 40px)', lineHeight: 1.2, marginBottom: 12 }}>
            Fleet Overview
          </h1>
          <p style={{ color: '#b0c4d4', fontSize: 15, marginBottom: 28 }}>
            View every vehicle in the fleet and its current status.
          </p>

          <button
            type="button"
            onClick={handleViewAllCars}
            style={{
              background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 32px',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              letterSpacing: 0.5,
              boxShadow: '0 4px 20px rgba(var(--brand-rgb),0.35)',
            }}
          >
            View All Cars
          </button>
        </div>
      </section>

      {showAllCars && (
        <section className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 style={{ margin: 0, color: '#1a1a2e', fontSize: 20, fontWeight: 800 }}>
              All Vehicles
            </h2>
            <p style={{ margin: 0, color: '#667085', fontSize: 14 }}>
              {loading ? 'Loading…' : `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {loading && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: '#667085' }}>
              Loading vehicles…
            </div>
          )}

          {error && (
            <div style={{ background: '#fff5f5', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: '#c53030' }}>
              Could not load vehicles: {error}
            </div>
          )}

          {!loading && !error && vehicles.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: '#667085' }}>
              No vehicles found in the fleet.
            </div>
          )}

          {!loading && !error && vehicles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {vehicles.map(vehicle => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} currentUser={user} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ value, suffix = '', label, delay }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.35 })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={visible ? 'stat-visible' : 'stat-hidden'} style={{ transitionDelay: `${delay}ms` }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand)' }}>
        {typeof value === 'number' ? <CountUp target={value} active={visible} /> : value}{suffix}
      </div>
      <div style={{ fontSize: 13, color: '#777', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function CountUp({ target, active }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return undefined

    const duration = 850
    const startTime = performance.now()
    let frameId

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1)
      setCount(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [active, target])

  return count
}

function ScrollWords({ text, as: Tag = 'p', style }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [hasUserScrolled, setHasUserScrolled] = useState(false)

  useEffect(() => {
    function enableReveal() {
      setHasUserScrolled(true)
    }

    window.addEventListener('scroll', enableReveal, { once: true, passive: true })
    return () => window.removeEventListener('scroll', enableReveal)
  }, [])

  useEffect(() => {
    if (!hasUserScrolled) return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.2 })

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasUserScrolled])

  return (
    <Tag ref={ref} className={visible ? 'scroll-words scroll-words-visible' : 'scroll-words'} style={style || { fontSize: 14, color: '#555', lineHeight: 1.75 }}>
      {text.split(' ').map((word, index) => (
        <span key={`${word}-${index}`} style={{ transitionDelay: `${Math.min(index * 18, 520)}ms` }}>{word}&nbsp;</span>
      ))}
    </Tag>
  )
}
