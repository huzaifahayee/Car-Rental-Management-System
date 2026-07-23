const STAFF_ROLES = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']

export function formatCategory(category) {
  return category === 'van' ? 'Van / Coaster' : category.charAt(0).toUpperCase() + category.slice(1)
}

export default function VehicleCard({ vehicle, onBook, currentUser }) {
  const available = vehicle.status === 'AVAILABLE'
  const image = vehicle.imageUrls?.[0]
  const isStaff = currentUser && STAFF_ROLES.includes(currentUser.role)

  const statusConfig = {
    AVAILABLE: { bg: 'rgba(var(--brand-2-rgb), 0.12)', color: 'var(--brand-2)', text: 'Available' },
    BOOKED: { bg: '#e0f2fe', color: '#0369a1', text: 'Booked' },
    MAINTENANCE: { bg: '#fef3c7', color: '#d97706', text: 'Maintenance' },
    INACTIVE: { bg: '#f3f4f6', color: '#6b7280', text: 'Inactive' },
  }
  const currentStatus = statusConfig[vehicle.status] || { bg: '#f3f4f6', color: '#555', text: vehicle.status }

  return (
    <article style={{
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,.07)',
      opacity: (available || isStaff) ? 1 : 0.7,
      transition: 'transform 0.2s',
    }}>
      <div style={{ height: 170, background: '#dce8e4', position: 'relative' }}>
        {image ? (
          <img src={image} alt={`${vehicle.make} ${vehicle.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#527064', fontWeight: 700 }}>Vehicle image coming soon</div>
        )}
        <span style={{ position: 'absolute', top: 12, left: 12, background: '#1a1a2e', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
          {formatCategory(vehicle.category)}
        </span>
        <span style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: currentStatus.bg,
          color: currentStatus.color,
          fontSize: 11,
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          {currentStatus.text}
        </span>
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div className="flex justify-between gap-3">
          <h2 style={{ margin: 0, fontSize: 16, color: '#1a1a2e' }}>{vehicle.make} {vehicle.model}</h2>
          <strong style={{ color: 'var(--brand-2)', whiteSpace: 'nowrap' }}>Rs {vehicle.pricePerDay.toLocaleString()}/day</strong>
        </div>
        <p style={{ color: '#888', fontSize: 13 }}>{vehicle.pickupCity} · {vehicle.seatingCapacity} seats · {vehicle.transmission.toLowerCase()}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: isStaff ? 0 : 14 }}>
          {[vehicle.hasAC && 'AC', vehicle.driverOption ? 'With Driver' : 'Self Drive'].filter(Boolean).map(tag => (
            <span key={tag} style={{ background: '#f5f7fa', color: '#555', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{tag}</span>
          ))}
        </div>
        {!isStaff && onBook && (
          <button
            disabled={!available}
            onClick={onBook}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 10,
              padding: 10,
              background: available ? 'linear-gradient(90deg,var(--brand),var(--brand-2))' : '#e5e7eb',
              color: available ? '#fff' : '#9ca3af',
              fontWeight: 800,
              cursor: available ? 'pointer' : 'not-allowed',
            }}
          >
            {available ? 'Book this vehicle' : `Currently ${currentStatus.text}`}
          </button>
        )}
      </div>
    </article>
  )
}
