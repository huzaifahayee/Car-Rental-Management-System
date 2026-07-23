// Frontend/src/components/Layout.jsx
import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PLACEHOLDER_AGENCY_NAME = 'GariTrip Demo Agency'
const STAFF_ROLES = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']

const adminPanelLinkStyle = (active) => ({
  background: active ? '#00a85a' : '#00c472',
  color: '#fff',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
})

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const isStaffUser = user && STAFF_ROLES.includes(user.role)
  const isAdminRoute = location.pathname.startsWith('/admin')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  const closeMobileMenu = () => setMobileOpen(false)
  const closeUserMenu = () => setUserMenuOpen(false)

  function signOut() {
    logout()
    closeUserMenu()
    closeMobileMenu()
    navigate('/')
  }

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        closeUserMenu()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close user menu on route change
  useEffect(() => {
    closeUserMenu()
    closeMobileMenu()
  }, [location.pathname])

  // Smooth-scroll to hash targets (e.g. /#destinations) after navigation
  useEffect(() => {
    const hash = location.hash
    if (!hash) return
    const id = hash.replace('#', '')
    // slight delay to allow route outlet content to render
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 60)
    return () => clearTimeout(t)
  }, [location.pathname, location.hash])

  // If the user refreshed the page while on a hash route, remove the hash from URL (works before router mounts)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.hash) {
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState(null, '', '/')
        }
      }
    } catch (e) {
      // ignore - best-effort only
    }
    // ensure we're at top of page after reload (override browser restore)
    try {
      if (typeof window !== 'undefined') {
        // immediate attempt
        window.scrollTo(0, 0)
        // small delay to override restoration
        setTimeout(() => {
          window.scrollTo(0, 0)
          // one more in next animation frame
          requestAnimationFrame(() => window.scrollTo(0, 0))
        }, 60)
      }
    } catch (e) {}
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ fontFamily: "'Inter', 'Nunito', sans-serif", background: '#f5f7fa', minHeight: '100vh' }}>

      <header style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="w-full px-6 md:px-10 flex items-center justify-between py-4">
          <Link to="/" onClick={() => { closeUserMenu(); closeMobileMenu() }} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#00c472', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>G</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#1a1a2e', lineHeight: 1.1 }}>{PLACEHOLDER_AGENCY_NAME}</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>Car Rental & Hotel Booking</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {isStaffUser ? (
              <Link to="/admin" style={adminPanelLinkStyle(isAdminRoute)}>Admin Panel</Link>
            ) : (
              <>
                <Link to={'/#destinations'} onClick={() => { closeUserMenu(); closeMobileMenu() }} style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Destinations</Link>
                <Link to={'/#how-it-works'} onClick={() => { closeUserMenu(); closeMobileMenu() }} style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>How It Works</Link>
                <Link to={'/#contact'} onClick={() => { closeUserMenu(); closeMobileMenu() }} style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Contact</Link>
              </>
            )}
            {user ? (
              <div ref={userMenuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(open => !open)}
                  style={{
                    background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 8,
                    padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                    color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {user.fullName}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {userMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
                    border: '1px solid #e8e8e8', minWidth: 180, overflow: 'hidden', zIndex: 100,
                  }}>
                    {user.role === 'CUSTOMER' && (
                      <Link
                        to="/my-bookings"
                        onClick={closeUserMenu}
                        style={{ display: 'block', padding: '11px 18px', fontSize: 14, color: '#1a1a2e', textDecoration: 'none', fontWeight: 500 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f7fa'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        My Bookings
                      </Link>
                    )}
                    <button
                      onClick={signOut}
                      style={{
                        width: '100%', textAlign: 'left', padding: '11px 18px', fontSize: 14,
                        color: '#dc2626', fontWeight: 600, background: 'none', border: 'none',
                        cursor: 'pointer', borderTop: '1px solid #f3f4f6',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" style={{ color: '#444', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Login</Link>
                <Link to="/register" style={{ background: '#00c472', color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Register</Link>
              </>
            )}
          </nav>
          <button className="mobile-menu-button" type="button" aria-label="Toggle navigation menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(open => !open)}>
            <span /><span /><span />
          </button>
        </div>
        {mobileOpen && <nav className="mobile-menu" aria-label="Mobile navigation">
          {isStaffUser ? (
            <Link to="/admin" onClick={closeMobileMenu}>Admin Panel</Link>
          ) : (
            <>
              <Link to={'/#destinations'} onClick={closeMobileMenu}>Destinations</Link>
              <Link to={'/#how-it-works'} onClick={closeMobileMenu}>How It Works</Link>
              <Link to={'/#contact'} onClick={closeMobileMenu}>Contact</Link>
            </>
          )}
          {user ? <>{user.role === 'CUSTOMER' && <Link to="/my-bookings" onClick={closeMobileMenu}>My Bookings</Link>}<button type="button" onClick={signOut}>Logout</button></> : <><Link to="/login" onClick={closeMobileMenu}>Login</Link><Link className="mobile-register" to="/register" onClick={closeMobileMenu}>Register</Link></>}
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
