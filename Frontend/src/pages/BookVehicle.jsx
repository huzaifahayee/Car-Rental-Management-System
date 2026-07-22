import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import LocationAutocomplete from '../components/LocationAutocomplete'
import IOSDropdown from '../components/IOSDropdown'
import CustomDateTimePicker from '../components/CustomDateTimePicker'

const SESSION_KEY = 'bookVehicleSearchState'

export default function BookVehicle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // Use location.state if available, otherwise fall back to sessionStorage so
  // that returning from "Back to vehicles" doesn't lose the search context.
  const searchState = location.state && Object.keys(location.state).length > 0
    ? location.state
    : (() => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') } catch { return {} } })()

  // Persist the search state whenever we have a real one
  const savedRef = useRef(false)
  if (!savedRef.current && location.state && Object.keys(location.state).length > 0) {
    savedRef.current = true
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(location.state)) } catch {}
  }

  const { user } = useAuth()
  const [vehicle, setVehicle] = useState(null)

  // Booking fields prefilled from state if coming from Search
  const [rentalMode, setRentalMode] = useState(searchState.rentalMode || 'WITH_DRIVER')

  // With-Driver fields
  const [pickupAddress, setPickupAddress] = useState(searchState.pickupAddress || '')
  const [pickupLat, setPickupLat] = useState(searchState.pickupLat || null)
  const [pickupLng, setPickupLng] = useState(searchState.pickupLng || null)

  const [dropoffAddress, setDropoffAddress] = useState(searchState.dropoffAddress || '')
  const [dropoffLat, setDropoffLat] = useState(searchState.dropoffLat || null)
  const [dropoffLng, setDropoffLng] = useState(searchState.dropoffLng || null)

  // Self-Drive fields
  const [outletId, setOutletId] = useState(searchState.outletId ? String(searchState.outletId) : '')
  const [outlets, setOutlets] = useState([])
  const [loadingOutlets, setLoadingOutlets] = useState(false)

  // Common fields
  const [pickupDateTime, setPickupDateTime] = useState(searchState.pickupTime || '')
  const [returnDateTime, setReturnDateTime] = useState(searchState.returnTime || '')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentReference, setPaymentReference] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null)

  useEffect(() => {
    apiFetch(`/vehicles/${id}`)
      .then(setVehicle)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (rentalMode === 'SELF_DRIVE' && outlets.length === 0) {
      setLoadingOutlets(true)
      apiFetch('/outlets')
        .then(data => {
          setOutlets(data)
          if (!outletId && data.length > 0) {
            setOutletId(String(data[0].id))
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoadingOutlets(false))
    }
  }, [rentalMode, outlets.length, outletId])

  async function submitBooking(event) {
    event.preventDefault()
    if (!user) return navigate('/login')
    if (user.role !== 'CUSTOMER') return setError('Bookings can only be created from a customer account.')

    if (!pickupDateTime || !returnDateTime) return setError('Choose both pickup and return date and time.')
    if (new Date(pickupDateTime) < new Date()) return setError('Pickup date and time cannot be in the past.')
    if (new Date(returnDateTime) <= new Date(pickupDateTime)) return setError('Return date and time must be after pickup.')

    // Rental mode validation
    if (rentalMode === 'WITH_DRIVER') {
      if (!pickupAddress.trim()) {
        return setError('Please enter a valid pickup address for With-Driver booking.')
      }
    } else if (rentalMode === 'SELF_DRIVE') {
      if (!outletId) {
        return setError('Please select a branch outlet for Self-Drive booking.')
      }
    }

    setError('')
    setSubmitting(true)

    try {
      const payload = {
        vehiclePackageId: Number(id),
        pickupDateTime: new Date(pickupDateTime).toISOString(),
        returnDateTime: new Date(returnDateTime).toISOString(),
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        rentalMode,
        ...(rentalMode === 'WITH_DRIVER' ? {
          pickupAddress: pickupAddress.trim(),
          pickupLat: pickupLat != null ? Number(pickupLat) : 31.5204, // Default dev coordinates if unverified
          pickupLng: pickupLng != null ? Number(pickupLng) : 74.3587,
          ...(dropoffAddress ? {
            dropoffAddress: dropoffAddress.trim(),
            dropoffLat: dropoffLat != null ? Number(dropoffLat) : 31.5204,
            dropoffLng: dropoffLng != null ? Number(dropoffLng) : 74.3587,
          } : {}),
        } : {
          outletId: Number(outletId),
        }),
      }

      const created = await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setBooking(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageState title="Loading your vehicle…" />
  if (error && !vehicle) return <PageState title="Vehicle unavailable" text={error} />
  if (booking) return <Confirmation booking={booking} vehicle={vehicle} />

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh', padding: '48px 16px' }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#00a85a', fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0 }}
        >
          ← Back to vehicles
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start" style={{ marginTop: 18 }}>
          {/* Selected Vehicle Info */}
          <section style={cardStyle}>
            <p style={eyebrow}>Selected vehicle</p>
            <h1 style={{ margin: '0 0 10px', color: '#1a1a2e', fontSize: 26 }}>{vehicle.make} {vehicle.model}</h1>
            {vehicle.imageUrls?.[0] && (
              <div style={{ height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <img src={vehicle.imageUrls[0]} alt={`${vehicle.make} ${vehicle.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <p style={{ color: '#667085', lineHeight: 1.6 }}>
              {vehicle.category} · {vehicle.seatingCapacity} seats · {vehicle.transmission.toLowerCase()} · {vehicle.hasAC ? 'Air conditioned' : 'No AC'}
            </p>
            
            <div style={{ borderTop: '1px solid #e8edf0', paddingTop: 18, marginTop: 22 }}>
              <span style={{ color: '#667085', fontSize: 13 }}>From</span>
              <div style={{ color: '#00a85a', fontWeight: 800, fontSize: 28 }}>
                Rs {vehicle.pricePerDay.toLocaleString()}<span style={{ color: '#667085', fontSize: 14 }}>/day</span>
              </div>
            </div>
          </section>

          {/* Booking Form */}
          <section style={cardStyle}>
            <p style={eyebrow}>Complete your booking</p>
            <h2 style={{ margin: '0 0 20px', color: '#1a1a2e', fontSize: 20 }}>
              {user ? 'Trip & Payment Details' : 'Sign in to continue'}
            </h2>

            {!user ? (
              <>
                <p style={{ color: '#667085', lineHeight: 1.6 }}>Please sign in with a customer account before confirming this rental.</p>
                <button onClick={() => navigate('/login')} style={buttonStyle}>Sign in to book</button>
              </>
            ) : (
              <form onSubmit={submitBooking} style={{ display: 'flex', flexDirection: 'column', gap: 15, width: '100%', minWidth: 0 }}>
                {/* Rental Mode (Fixed from Search Selection) */}
                <Field label="Rental Mode">
                  <div style={{ marginTop: 4 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#e8faf2',
                        color: '#00a85a',
                        border: '1.5px solid #00c472',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}
                    >
                      ✓ {rentalMode === 'WITH_DRIVER' ? 'With-Driver Rental' : 'Self-Drive (Without Driver)'}
                    </span>
                  </div>
                </Field>

                {/* Location Inputs based on Rental Mode */}
                {rentalMode === 'WITH_DRIVER' ? (
                  <>
                    <Field label="Pickup Location">
                      <div style={inputContainerStyle}>
                        <LocationAutocomplete
                          value={pickupAddress}
                          onChange={setPickupAddress}
                          onSelectLocation={({ address, lat, lng }) => {
                            setPickupAddress(address)
                            setPickupLat(lat)
                            setPickupLng(lng)
                          }}
                          placeholder="Enter pickup address"
                        />
                      </div>
                    </Field>

                    <Field label="Drop-off Location (Optional)">
                      <div style={inputContainerStyle}>
                        <LocationAutocomplete
                          value={dropoffAddress}
                          onChange={setDropoffAddress}
                          onSelectLocation={({ address, lat, lng }) => {
                            setDropoffAddress(address)
                            setDropoffLat(lat)
                            setDropoffLng(lng)
                          }}
                          placeholder="Enter drop-off address"
                        />
                      </div>
                    </Field>
                  </>
                ) : (
                  <Field label="Pickup Outlet / Branch">
                    {loadingOutlets ? (
                      <p style={{ margin: 0, fontSize: 13, color: '#888' }}>Loading outlets...</p>
                    ) : (
                      <IOSDropdown
                        value={outletId}
                        onChange={(e) => setOutletId(e.target.value)}
                        label="Pickup Outlet / Branch"
                        options={outlets.map((o) => ({
                          value: String(o.id),
                          label: `${o.city} — ${o.name} (${o.addressText})`
                        }))}
                        style={{ width: '100%' }}
                      />
                    )}
                  </Field>
                )}

                {/* Dates */}
                <Field label="Pickup date and time">
                  <CustomDateTimePicker
                    value={pickupDateTime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={val => setPickupDateTime(val)}
                  />
                </Field>

                <Field label="Return date and time">
                  <CustomDateTimePicker
                    value={returnDateTime}
                    min={pickupDateTime || new Date().toISOString().slice(0, 16)}
                    onChange={val => setReturnDateTime(val)}
                  />
                </Field>

                {/* Payment */}
                <Field label="Payment method">
                  <IOSDropdown
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    label="Payment Method"
                    options={[
                      { value: 'CASH', label: 'Cash on pickup' },
                      { value: 'BANK_TRANSFER', label: 'Bank transfer' },
                      { value: 'CARD', label: 'Card' }
                    ]}
                    style={{ width: '100%' }}
                  />
                </Field>

                <Field label="Payment reference (optional)">
                  <input
                    value={paymentReference}
                    maxLength={100}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="Transaction or reference number"
                    style={inputStyle}
                  />
                </Field>

                {error && <p style={{ margin: 0, color: '#c53030', fontSize: 13 }}>{error}</p>}

                <button disabled={submitting} style={{ ...buttonStyle, opacity: submitting ? 0.65 : 1 }}>
                  {submitting ? 'Confirming booking…' : 'Confirm booking'}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Confirmation({ booking, vehicle }) {
  return (
    <div style={{ background: '#f0fdf7', minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section style={{ ...cardStyle, maxWidth: 520, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, margin: '0 auto 16px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#d8f8e8', color: '#009e5a', fontSize: 28 }}>
          ✓
        </div>
        <p style={eyebrow}>Booking received</p>
        <h1 style={{ color: '#1a1a2e', margin: '0 0 10px' }}>Your request is confirmed</h1>
        
        <p style={{ color: '#667085', lineHeight: 1.6, marginBottom: 18 }}>
          Your {vehicle.make} {vehicle.model} booking reference is{' '}
          <strong style={{ color: '#00a85a' }}>{booking.bookingReference}</strong>.
        </p>

        <div style={{ background: '#fff', border: '1px solid #d8f8e8', borderRadius: 12, padding: 16, textAlign: 'left', fontSize: 13, color: '#444', marginBottom: 20 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#1a1a2e' }}>Trip Details:</p>
          <p style={{ margin: '0 0 4px' }}><strong>Rental Mode:</strong> {booking.rentalMode === 'WITH_DRIVER' ? 'With-Driver' : 'Self-Drive'}</p>
          {booking.rentalMode === 'WITH_DRIVER' ? (
            <p style={{ margin: 0 }}><strong>Pickup Address:</strong> {booking.pickupAddress}</p>
          ) : (
            <p style={{ margin: 0 }}><strong>Branch Outlet:</strong> {booking.outlet ? `${booking.outlet.name} (${booking.outlet.city})` : 'Selected Branch'}</p>
          )}
        </div>

        <Link to="/search" style={{ ...buttonStyle, display: 'block', textDecoration: 'none' }}>
          Browse more vehicles
        </Link>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minWidth: 0, color: '#475467', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7 }}>
      {label}
      {children}
    </label>
  )
}

function PageState({ title, text }) {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div>
        <h1 style={{ color: '#1a1a2e' }}>{title}</h1>
        {text && <p style={{ color: '#667085' }}>{text}</p>}
        <Link to="/search" style={{ color: '#00a85a' }}>Back to search</Link>
      </div>
    </div>
  )
}

const cardStyle = { background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 8px 28px rgba(16,24,40,.08)', width: '100%', minWidth: 0, boxSizing: 'border-box' }
const eyebrow = { margin: '0 0 8px', color: '#00a85a', fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase' }
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '11px 16px', border: '1.5px solid #d0d5dd', borderRadius: 10, color: '#1a1a2e', background: '#fff', fontSize: 14 }
const inputContainerStyle = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #d0d5dd', borderRadius: 10, padding: '11px 16px', background: '#fff' }
const buttonStyle = { width: '100%', border: 'none', borderRadius: 10, padding: '12px 16px', background: 'linear-gradient(90deg,#00c472,#00a85a)', color: '#fff', fontWeight: 800, cursor: 'pointer' }
