export default function AgencyInactive() {
  return (
    <div style={{ minHeight: 'calc(100vh - 130px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f9fafb 0%, #f1f2f4 100%)', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ background: '#f3f4f6', borderRadius: 12, width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 24 }}>🚫</span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 22, color: '#1a1a2e', marginBottom: 10 }}>This agency is no longer active</h1>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>
            The rental agency at this address has been deactivated. Bookings, sign-ins, and browsing are unavailable here until it's reactivated by a platform administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
