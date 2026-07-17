// Frontend/src/components/Layout.jsx
import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PLACEHOLDER_AGENCY_NAME = 'GariTrip Demo Agency'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobileMenu = () => setMobileOpen(false)
  function signOut() { logout(); closeMobileMenu(); navigate('/') }

  return (
    <div style={{ fontFamily: "'Inter', 'Nunito', sans-serif", background: '#f5f7fa', minHeight: '100vh' }}>

      {!isAuthPage && (
        <div style={{ background: '#1a1a2e', color: '#9ca3af', fontSize: 13 }}>
          <div className="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
            <span style={{ color: '#00c472', fontWeight: 600 }}>Multi-tenant car rental & hotel booking</span>
            <div className="flex gap-4 items-center">
              <button style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>English</button>
              {user ? <button onClick={signOut} style={{ background: '#00c472', color: '#fff', border: 0, borderRadius: 6, padding: '4px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Logout</button> : <Link to="/login" style={{ background: '#00c472', color: '#fff', borderRadius: 6, padding: '4px 14px', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>Login / Sign Up</Link>}
            </div>
          </div>
        </div>
      )}

      <header style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between py-4">
          <Link to="/" onClick={closeMobileMenu} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#00c472', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>G</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#1a1a2e', lineHeight: 1.1 }}>{PLACEHOLDER_AGENCY_NAME}</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>Car Rental & Hotel Booking</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#destinations" style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Destinations</a>
            <a href="#how-it-works" style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>How It Works</a>
            <a href="#contact" style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Contact</a>
            {user?.role !== 'CUSTOMER' && <Link to="/admin" style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Admin</Link>}
            {user ? <details className="user-menu"><summary>{user.fullName}</summary><div><Link to="/my-bookings">My Bookings</Link><button onClick={signOut}>Logout</button></div></details> : <><Link to="/login" style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Login</Link><Link to="/register" style={{ background: '#00c472', color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Register</Link></>}
          </nav>
          <button className="mobile-menu-button" type="button" aria-label="Toggle navigation menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(open => !open)}>
            <span /><span /><span />
          </button>
        </div>
        {mobileOpen && <nav className="mobile-menu" aria-label="Mobile navigation">
          <a href="/#destinations" onClick={closeMobileMenu}>Destinations</a>
          <a href="/#how-it-works" onClick={closeMobileMenu}>How It Works</a>
          <a href="/#contact" onClick={closeMobileMenu}>Contact</a>
          {user?.role !== 'CUSTOMER' && <Link to="/admin" onClick={closeMobileMenu}>Admin</Link>}
          {user ? <><Link to="/my-bookings" onClick={closeMobileMenu}>My Bookings</Link><button type="button" onClick={signOut}>Logout</button></> : <><Link to="/login" onClick={closeMobileMenu}>Login</Link><Link className="mobile-register" to="/register" onClick={closeMobileMenu}>Register</Link></>}
        </nav>}
      </header>

      <main key={location.pathname} className="page-transition">
        <Outlet />
      </main>

      {!isAuthPage && <Footer />}
    </div>
  )
}

function Footer() {
  const AGENCY_TAGLINE = 'Multi-tenant car rental & hotel booking platform'
  const FOOTER_LINKS = {
    Company: ['About Us', 'Contact', 'Blogs', 'Careers'],
    Services: ['Car Rental', 'Luxury Cars', 'Coaster Rental', 'Airport Pickup'],
    Support: ['Privacy Policy', 'Terms and Conditions', 'FAQs', 'Help Center'],
  }

  return (
    <footer id="contact" style={{ background: '#111827', color: '#9ca3af' }}>
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div style={{ background: '#00c472', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>G</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{PLACEHOLDER_AGENCY_NAME}</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.75 }}>{AGENCY_TAGLINE}</p>
        </div>
        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
          <div key={heading}>
            <h4 style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>{heading}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {links.map(l => (
                <li key={l}>
                  <a
                    href="#"
                    style={{ color: '#9ca3af', fontSize: 14, textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#00c472' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af' }}
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #1f2937', padding: '16px 24px', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
        © 2026 {PLACEHOLDER_AGENCY_NAME}. All rights reserved.
      </div>
    </footer>
  )
}
