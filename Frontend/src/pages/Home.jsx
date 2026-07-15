// Frontend/src/pages/Home.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const HERO_HEADLINE = 'Find the Best Deals for Your Car Rental in Pakistan'
const HERO_SUBHEADING = 'Rent a car anywhere in Pakistan — fast, affordable, and reliable'

// PLACEHOLDER: dummy stats, replace with real numbers once available
const STATS = [
  { value: '500+', label: 'Car Vendors' },
  { value: '50+', label: 'Cities Covered' },
  { value: '5M+', label: 'Happy Travelers' },
  { value: '24/7', label: 'Customer Support' },
]

const POPULAR_CITIES = [
  'Rent a Car in Karachi',
  'Rent a Car in Lahore',
  'Rent a Car in Islamabad',
  'Rent a Car in Rawalpindi',
  'Rent a Car in Peshawar',
  'Rent a Car in Quetta',
  'Luxury Car Rental in Lahore',
  'Coaster for Rent in Lahore',
  'Rent a Car in Multan',
  'Rent a Car in Faisalabad',
  'Rent a Car in Sialkot',
  'Rent a Car in Gujranwala',
]

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

export default function Home() {
  const navigate = useNavigate()
  const [tripType, setTripType] = useState('within')
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [returnTime, setReturnTime] = useState('')

  return (
    <>
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&h=600&fit=crop&auto=format)`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.18,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,32,39,0.6) 0%, rgba(15,32,39,0.85) 100%)' }} />

        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
          <p style={{ color: '#00c472', fontWeight: 700, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
            Car Rental Booking
          </p>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 'clamp(24px, 4.5vw, 44px)', lineHeight: 1.2, marginBottom: 12 }}>
            {HERO_HEADLINE}
          </h1>
          <p style={{ color: '#b0c4d4', fontSize: 15, marginBottom: 44 }}>{HERO_SUBHEADING}</p>

          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '28px 32px', textAlign: 'left' }}>
            <div className="flex gap-6 mb-5">
              {['within', 'out'].map(type => (
                <label key={type} className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                  <div
                    onClick={() => setTripType(type)}
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: `2px solid ${tripType === type ? '#00c472' : '#ccc'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    {tripType === type && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#00c472' }} />}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#333', userSelect: 'none' }}>
                    {type === 'within' ? 'Within City' : 'Out of City'}
                  </span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {[
                { label: 'Pickup Location', value: pickup, setter: setPickup, placeholder: 'Enter pickup city or area' },
                { label: 'Drop-off Location', value: dropoff, setter: setDropoff, placeholder: 'Enter drop-off city or area' },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
                  <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', marginTop: 6 }}>
                    <input
                      value={value}
                      onChange={e => setter(e.target.value)}
                      placeholder={placeholder}
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, color: '#333', background: 'transparent' }}
                    />
                  </div>
                </div>
              ))}
              {[
                { label: 'Pickup Date and Time', value: pickupTime, setter: setPickupTime },
                { label: 'Return Date and Time', value: returnTime, setter: setReturnTime },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
                  <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', marginTop: 6 }}>
                    <input
                      type="datetime-local"
                      value={value}
                      onChange={e => setter(e.target.value)}
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, color: '#333', background: 'transparent' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              style={{
                background: 'linear-gradient(90deg, #00c472, #00a85a)',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '14px 48px', fontWeight: 800, fontSize: 15,
                cursor: 'pointer', width: '100%', letterSpacing: 0.5,
                boxShadow: '0 4px 20px rgba(0,196,114,0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              onClick={() => navigate('/search')}
            >
              Search Available Cars
            </button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#00c472' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#777', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Popular destinations */}
      <section id="destinations" className="max-w-6xl mx-auto px-6 py-14">
        <h2 style={{ fontWeight: 800, fontSize: 22, color: '#1a1a2e', marginBottom: 6 }}>Popular Car Rental Destinations</h2>
        <p style={{ color: '#777', fontSize: 14, marginBottom: 20 }}>Explore car rental options across major cities in Pakistan</p>
        <div className="flex flex-wrap gap-3">
          {POPULAR_CITIES.map(c => (
            <button
              key={c}
              style={{
                padding: '8px 18px', borderRadius: 30,
                border: '1.5px solid #d8f5ea', background: '#f0fdf7',
                color: '#00a85a', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#00c472'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf7'; e.currentTarget.style.color = '#00a85a' }}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* City editorial */}
      <section style={{ background: '#fff' }}>
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 style={{ fontWeight: 800, fontSize: 22, color: '#1a1a2e', marginBottom: 4 }}>Car Rental Services Across Pakistan</h2>
          <p style={{ color: '#777', fontSize: 14, marginBottom: 32 }}>Comprehensive car rental solutions in every major city</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {CITY_CONTENT.map(({ city, text }) => (
              <div key={city} style={{ borderLeft: '3px solid #00c472', paddingLeft: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 8 }}>{city}</h3>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.75 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How-to steps */}
      <section id="how-it-works" style={{ background: 'linear-gradient(135deg, #f0fdf7 0%, #e8f8f0 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#1a1a2e', marginBottom: 8 }}>How to Book a Car</h2>
            <p style={{ color: '#666', fontSize: 15 }}>Simple steps to get your rental car booked in minutes</p>
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
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,196,114,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <div style={{
                  minWidth: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00c472, #00a85a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: 16,
                }}>
                  {step}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: '#666', lineHeight: 1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}