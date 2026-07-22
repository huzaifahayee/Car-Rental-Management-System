import { useEffect, useMemo, useState } from 'react'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import LocationAutocomplete from '../components/LocationAutocomplete'
import IOSDropdown from '../components/IOSDropdown'

const STATUS_COLORS = {
  PENDING: ['#fef9c3', '#a16207'],
  CONFIRMED: ['#dbeafe', '#1d4ed8'],
  CANCELLED: ['#fee2e2', '#dc2626'],
  COMPLETED: ['#dcfce7', '#16a34a'],
  AVAILABLE: ['#dcfce7', '#16a34a'],
  BOOKED: ['#dbeafe', '#1d4ed8'],
  MAINTENANCE: ['#ffedd5', '#c2410c'],
  INACTIVE: ['#f3f4f6', '#6b7280'],
  ACTIVE: ['#dcfce7', '#16a34a'],
  SUPERADMIN: ['#fae8ff', '#86198f'],
  ADMIN: ['#e0e7ff', '#3730a3'],
  EMPLOYEE: ['#e0f2fe', '#0369a1'],
  CUSTOMER: ['#f3f4f6', '#4b5563'],
}

const label = value => String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const date = value => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
const dateTime = value => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

function getBookingDays(booking) {
  return Math.max(1, Math.ceil(
    (new Date(booking.returnDateTime) - new Date(booking.pickupDateTime)) / (1000 * 60 * 60 * 24)
  ))
}

function getBookingTotal(booking) {
  return (booking.vehiclePackage?.pricePerDay || 0) * getBookingDays(booking)
}

function truncateText(text, max = 72) {
  if (!text || text.length <= max) return text
  return `${text.slice(0, max - 3).trim()}...`
}

function getPickupLocation(booking) {
  if (booking.rentalMode === 'WITH_DRIVER') {
    return truncateText(booking.pickupAddress || 'As specified')
  }
  if (booking.outlet) {
    return truncateText(`${booking.outlet.name}, ${booking.outlet.city}`)
  }
  return 'Branch outlet'
}

function getReturnLocation(booking) {
  if (booking.rentalMode === 'WITH_DRIVER') {
    return truncateText(booking.dropoffAddress || 'Same as pickup')
  }
  if (booking.outlet) {
    return truncateText(`${booking.outlet.name}, ${booking.outlet.city} (same branch)`)
  }
  return 'Same as pickup'
}

function buildBookingConfirmationMessage(booking, { approved = false } = {}) {
  const vehicle = `${booking.vehiclePackage?.make || ''} ${booking.vehiclePackage?.model || 'Vehicle'}`.trim()
  const days = getBookingDays(booking)
  const rate = booking.vehiclePackage?.pricePerDay || 0
  const total = getBookingTotal(booking)
  const payment = label(booking.paymentMethod || 'CASH')
  const paymentRef = booking.paymentReference ? ` (Ref: ${booking.paymentReference})` : ''
  const rentalMode = booking.rentalMode === 'WITH_DRIVER' ? 'With Driver' : 'Self-Drive'
  const statusLine = approved
    ? `Your booking *${booking.bookingReference}* for *${vehicle}* has been *APPROVED & CONFIRMED*.`
    : `Your booking *${booking.bookingReference}* for *${vehicle}* is *CONFIRMED*.`

  return [
    `Hello *${booking.customer?.fullName || 'Customer'}*!`,
    '',
    statusLine,
    '',
    `*Price:* Rs ${rate.toLocaleString()}/day x ${days} day${days === 1 ? '' : 's'} = *Rs ${total.toLocaleString()}* total`,
    `*Payment:* ${payment}${paymentRef}`,
    '',
    `*Trip:* ${rentalMode}`,
    `*Pickup:* ${getPickupLocation(booking)} | ${dateTime(booking.pickupDateTime)}`,
    `*Return:* ${getReturnLocation(booking)} | ${dateTime(booking.returnDateTime)}`,
    '',
    'Thank you for choosing our Rental Service!',
  ].join('\n')
}

function openWhatsApp(phone, message) {
  window.open(buildWhatsAppUrl(phone, message), '_blank')
}

function buildWhatsAppUrl(phone, message) {
  const cleaned = phone ? phone.replace(/[^0-9+]/g, '') : ''
  const text = encodeURIComponent(message)
  return cleaned
    ? `https://wa.me/${cleaned.startsWith('+') ? cleaned.slice(1) : cleaned}?text=${text}`
    : `https://wa.me/?text=${text}`
}

export default function AdminPanel() {
  const { user } = useAuth()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [outlets, setOutlets] = useState([])
  const [usersList, setUsersList] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal State for Outlets
  const [showOutletModal, setShowOutletModal] = useState(false)
  const [editingOutlet, setEditingOutlet] = useState(null)
  const [outletForm, setOutletForm] = useState({
    name: '', city: '', addressText: '', latitude: '', longitude: '', isActive: true,
  })
  const [outletFormError, setOutletFormError] = useState('')
  const [outletSubmitting, setOutletSubmitting] = useState(false)

  // Modal State for User / Staff Creation
  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState({
    fullName: '', email: '', phone: '', password: '', role: 'EMPLOYEE',
  })
  const [userFormError, setUserFormError] = useState('')
  const [userSubmitting, setUserSubmitting] = useState(false)

  // Modal State for Role Confirmation
  const [confirmRoleModal, setConfirmRoleModal] = useState({ show: false, userId: '', userName: '', currentRole: '', newRole: '' })
  const [roleChanging, setRoleChanging] = useState(false)
  const [confirmRoleError, setConfirmRoleError] = useState('')

  // Modal State for Vehicles
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [vehicleForm, setVehicleForm] = useState({
    category: 'Sedan', make: '', model: '', seatingCapacity: 5, transmission: 'AUTOMATIC',
    hasAC: true, driverOption: true, pricePerDay: 5000, pickupCity: 'Lahore', dropoffCity: 'Lahore',
    imageUrl: '', status: 'AVAILABLE',
  })
  const [vehicleFormError, setVehicleFormError] = useState('')
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  // Reusable confirmation and error modal states
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm', confirmBg: '#00c472' })
  const [errorModal, setErrorModal] = useState({ show: false, title: 'Error', message: '' })

  const showConfirm = (title, message, onConfirm, confirmText = 'Confirm', confirmBg = '#00c472') => {
    setConfirmModal({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm()
        setConfirmModal(prev => ({ ...prev, show: false }))
      },
      confirmText,
      confirmBg,
    })
  }

  const showError = (message, title = 'Error') => {
    setErrorModal({ show: true, title, message })
  }

  const reloadData = () => {
    if (!user) return
    Promise.all([
      apiFetch('/dashboard'),
      apiFetch('/bookings'),
      apiFetch('/vehicles'),
      apiFetch('/outlets?isActive=all'),
      apiFetch('/users'),
    ])
      .then(([dashboard, liveBookings, liveVehicles, liveOutlets, liveUsers]) => {
        setError('')
        setStats(dashboard)
        setBookings(liveBookings)
        setVehicles(liveVehicles)
        setOutlets(liveOutlets)
        setUsersList(liveUsers)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) {
      // If we are still initializing/loading user from context, don't show error immediately
      // Wait for localStorage check to complete in AuthProvider
      const token = localStorage.getItem('token')
      if (token) {
        setLoading(true)
        return
      }
      setError('Sign in with an admin or employee account to view the dashboard.')
      setLoading(false)
      return
    }

    if (!['SUPERADMIN', 'ADMIN', 'EMPLOYEE'].includes(user.role)) {
      setError('Sign in with an admin or employee account to view the dashboard.')
      setLoading(false)
      return
    }

    setError('')
    setLoading(true)
    reloadData()
  }, [user])

  const totalBookings = stats ? Object.values(stats.bookings).reduce((sum, count) => sum + count, 0) : 0
  const activeVehicles = stats ? stats.vehicles.AVAILABLE : 0
  const pendingBookings = stats ? stats.bookings.PENDING : 0
  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings])

  // Revenue earned in the last 30 days (CONFIRMED + COMPLETED bookings only)
  const revenue30Days = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return bookings
      .filter(b => !['CANCELLED'].includes(b.status) && new Date(b.createdAt) >= cutoff)
      .reduce((sum, b) => {
        const days = Math.max(1, Math.ceil(
          (new Date(b.returnDateTime) - new Date(b.pickupDateTime)) / (1000 * 60 * 60 * 24)
        ))
        return sum + (b.vehiclePackage?.pricePerDay || 0) * days
      }, 0)
  }, [bookings])

  // Outlet Modal actions
  function openCreateOutletModal() {
    setEditingOutlet(null)
    setOutletForm({ name: '', city: '', addressText: '', latitude: '', longitude: '', isActive: true })
    setOutletFormError('')
    setShowOutletModal(true)
  }

  function openEditOutletModal(outlet) {
    setEditingOutlet(outlet)
    setOutletForm({
      name: outlet.name, city: outlet.city, addressText: outlet.addressText,
      latitude: String(outlet.latitude), longitude: String(outlet.longitude), isActive: outlet.isActive,
    })
    setOutletFormError('')
    setShowOutletModal(true)
  }

  async function handleSaveOutlet(e) {
    e.preventDefault()
    setOutletFormError('')

    const { name, city, addressText, latitude, longitude, isActive } = outletForm
    if (!name.trim() || !city.trim() || !addressText.trim() || latitude === '' || longitude === '') {
      setOutletFormError('All fields (name, city, address, latitude, longitude) are required.')
      return
    }

    const latNum = Number(latitude)
    const lngNum = Number(longitude)
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setOutletFormError('Latitude must be a valid number between -90 and 90.')
      return
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setOutletFormError('Longitude must be a valid number between -180 and 180.')
      return
    }

    setOutletSubmitting(true)
    try {
      if (editingOutlet) {
        await apiFetch(`/outlets/${editingOutlet.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: name.trim(), city: city.trim(), addressText: addressText.trim(), latitude: latNum, longitude: lngNum, isActive }),
        })
      } else {
        await apiFetch('/outlets', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), city: city.trim(), addressText: addressText.trim(), latitude: latNum, longitude: lngNum }),
        })
      }
      setShowOutletModal(false)
      reloadData()
    } catch (err) { setOutletFormError(err.message) } finally { setOutletSubmitting(false) }
  }

  async function handleDeactivateOutlet(outletId) {
    showConfirm(
      'Deactivate Outlet',
      'Are you sure you want to deactivate this outlet branch?',
      async () => {
        try {
          await apiFetch(`/outlets/${outletId}`, { method: 'DELETE' })
          reloadData()
        } catch (err) {
          showError(err.message, 'Failed to Deactivate')
        }
      },
      'Deactivate',
      '#dc2626'
    )
  }

  // User Modal actions
  function openCreateUserModal() {
    setUserForm({ fullName: '', email: '', phone: '', password: '', role: 'EMPLOYEE' })
    setUserFormError('')
    setShowUserModal(true)
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    setUserFormError('')

    const { fullName, email, phone, password, role } = userForm
    if (!fullName.trim() || !email.trim() || !password || !role) {
      setUserFormError('Full name, email, password, and role are required.')
      return
    }

    setUserSubmitting(true)
    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || undefined, password, role }),
      })
      setShowUserModal(false)
      reloadData()
    } catch (err) { setUserFormError(err.message) } finally { setUserSubmitting(false) }
  }

  function handleRoleChangeInitiate(userId, newRole, userName, currentRole) {
    setConfirmRoleError('')
    setConfirmRoleModal({
      show: true,
      userId,
      newRole,
      userName,
      currentRole,
    })
  }

  async function handleConfirmRoleChange() {
    setConfirmRoleError('')
    setRoleChanging(true)
    try {
      await apiFetch(`/users/${confirmRoleModal.userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: confirmRoleModal.newRole }),
      })
      setConfirmRoleModal({ show: false, userId: '', userName: '', currentRole: '', newRole: '' })
      reloadData()
    } catch (err) {
      setConfirmRoleError(err.message)
    } finally {
      setRoleChanging(false)
    }
  }

  // ---- Update Booking Status & WhatsApp Confirmation ----
  async function handleUpdateBookingStatus(booking, newStatus) {
    try {
      const updatedBooking = await apiFetch(`/bookings/${booking.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })

      if (newStatus === 'CONFIRMED') {
        openWhatsApp(
          booking.customer?.phone,
          buildBookingConfirmationMessage(booking, { approved: true })
        )
      }

      reloadData()
    } catch (err) {
      alert(`Failed to update booking status: ${err.message}`)
    }
  }

  // ---- Cancel Booking (with confirmation modal) ----
  const [cancelBookingModal, setCancelBookingModal] = useState({ show: false, bookingId: null, bookingNumId: null, bookingRef: '', customerName: '', customerPhone: '', vehicleName: '' })
  const [cancellingBooking, setCancellingBooking] = useState(false)

  function handleCancelBookingInitiate(booking) {
    setCancelBookingModal({
      show: true,
      bookingId: booking.id,
      bookingNumId: booking.id,
      bookingRef: booking.bookingReference,
      customerName: booking.customer?.fullName || 'Customer',
      customerPhone: booking.customer?.phone || '',
      vehicleName: `${booking.vehiclePackage?.make || ''} ${booking.vehiclePackage?.model || 'Vehicle'}`.trim(),
    })
  }

  async function handleConfirmCancelBooking() {
    setCancellingBooking(true)
    try {
      await apiFetch(`/bookings/${cancelBookingModal.bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      // Open WhatsApp with cancellation apology message
      openWhatsApp(
        cancelBookingModal.customerPhone,
        `Hello *${cancelBookingModal.customerName}*,\n\n` +
        `We regret to inform you that your booking *${cancelBookingModal.bookingRef}* for *${cancelBookingModal.vehicleName}* has been *cancelled*.\n\n` +
        `We are sorry for any inconvenience caused. Please feel free to contact us or make a new booking at your convenience.\n\n` +
        `Thank you for your understanding.`
      )

      setCancelBookingModal({ show: false, bookingId: null, bookingRef: '', customerName: '', customerPhone: '', vehicleName: '' })
      reloadData()
    } catch (err) {
      alert(`Failed to cancel booking: ${err.message}`)
    } finally {
      setCancellingBooking(false)
    }
  }

  // ---- Delete User ----
  const [deleteUserModal, setDeleteUserModal] = useState({ show: false, userId: '', userName: '', role: '' })
  const [deletingUser, setDeletingUser] = useState(false)
  const [deleteUserError, setDeleteUserError] = useState('')

  function handleDeleteUserInitiate(userId, userName, role) {
    setDeleteUserError('')
    setDeleteUserModal({ show: true, userId, userName, role })
  }

  async function handleConfirmDeleteUser() {
    setDeleteUserError('')
    setDeletingUser(true)
    try {
      await apiFetch(`/users/${deleteUserModal.userId}`, { method: 'DELETE' })
      setDeleteUserModal({ show: false, userId: '', userName: '', role: '' })
      reloadData()
    } catch (err) {
      setDeleteUserError(err.message)
    } finally {
      setDeletingUser(false)
    }
  }

  function openCreateVehicleModal() {
    setEditingVehicle(null)
    setVehicleForm({
      category: 'Sedan', make: '', model: '', seatingCapacity: 5, transmission: 'AUTOMATIC',
      hasAC: true, driverOption: true, pricePerDay: 5000, pickupCity: 'Lahore', dropoffCity: 'Lahore',
      imageUrl: '', status: 'AVAILABLE',
    })
    setSelectedFile(null)
    setVehicleFormError('')
    setShowVehicleModal(true)
  }

  function openEditVehicleModal(vehicle) {
    setEditingVehicle(vehicle)
    setVehicleForm({
      category: vehicle.category,
      make: vehicle.make,
      model: vehicle.model,
      seatingCapacity: vehicle.seatingCapacity,
      transmission: vehicle.transmission,
      hasAC: vehicle.hasAC,
      driverOption: vehicle.driverOption,
      pricePerDay: vehicle.pricePerDay,
      pickupCity: vehicle.pickupCity,
      dropoffCity: vehicle.dropoffCity,
      imageUrl: vehicle.imageUrls?.[0] || '',
      status: vehicle.status,
    })
    setSelectedFile(null)
    setVehicleFormError('')
    setShowVehicleModal(true)
  }

  async function handleSaveVehicle(e) {
    e.preventDefault()
    setVehicleFormError('')

    const { category, make, model, seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, imageUrl, status } = vehicleForm
    if (!category.trim() || !make.trim() || !model.trim() || !pickupCity.trim() || !dropoffCity.trim()) {
      setVehicleFormError('All fields (make, model, pickup city, dropoff city) are required.')
      return
    }

    const priceNum = Number(pricePerDay)
    const seatsNum = Number(seatingCapacity)
    if (isNaN(priceNum) || priceNum <= 0) {
      setVehicleFormError('Price per day must be a valid positive number.')
      return
    }
    if (isNaN(seatsNum) || seatsNum <= 0) {
      setVehicleFormError('Seating capacity must be a valid positive number.')
      return
    }

    const imageUrlsPayload = imageUrl.trim() ? [imageUrl.trim()] : []

    setVehicleSubmitting(true)
    try {
      let savedVehicle
      if (editingVehicle) {
        savedVehicle = await apiFetch(`/vehicles/${editingVehicle.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            category: category.trim(),
            make: make.trim(),
            model: model.trim(),
            seatingCapacity: seatsNum,
            transmission,
            hasAC,
            driverOption,
            pricePerDay: priceNum,
            pickupCity: pickupCity.trim(),
            dropoffCity: dropoffCity.trim(),
            imageUrls: imageUrlsPayload,
            status,
          }),
        })
      } else {
        savedVehicle = await apiFetch('/vehicles', {
          method: 'POST',
          body: JSON.stringify({
            category: category.trim(),
            make: make.trim(),
            model: model.trim(),
            seatingCapacity: seatsNum,
            transmission,
            hasAC,
            driverOption,
            pricePerDay: priceNum,
            pickupCity: pickupCity.trim(),
            dropoffCity: dropoffCity.trim(),
            imageUrls: imageUrlsPayload,
          }),
        })
      }

      // If a file is selected, upload it
      if (selectedFile && savedVehicle?.id) {
        const formData = new FormData()
        formData.append('images', selectedFile)
        await apiFetch(`/vehicles/${savedVehicle.id}/images`, {
          method: 'POST',
          body: formData,
        })
      }

      setShowVehicleModal(false)
      reloadData()
    } catch (err) { setVehicleFormError(err.message) } finally { setVehicleSubmitting(false) }
  }

  async function handleDeleteVehicle(vehicleId, vehicleName) {
    showConfirm(
      'Delete Vehicle',
      `Are you sure you want to delete the vehicle "${vehicleName}"?`,
      async () => {
        try {
          await apiFetch(`/vehicles/${vehicleId}`, { method: 'DELETE' })
          reloadData()
        } catch (err) {
          showError(err.message, 'Failed to Delete')
        }
      },
      'Delete',
      '#dc2626'
    )
  }

  if (loading) return <PanelState title="Loading dashboard…" />
  if (error) return <PanelState title="Dashboard unavailable" text={error} />

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
      <header style={{ background: '#1a1a2e', padding: '14px 0' }}>
        <div className="w-full px-6 md:px-10 flex items-center justify-between">
          <div>
            <h1 style={{ color: '#fff', fontSize: 18, margin: 0 }}>Admin Panel</h1>
            <p style={{ color: '#9ca3af', fontSize: 12, margin: '3px 0 0' }}>Live rental operations</p>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ color: '#00c472', fontSize: 11, fontWeight: 800, background: 'rgba(0,196,114,0.15)', padding: '4px 10px', borderRadius: 20 }}>
              {user.role}
            </span>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{user.fullName}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <nav style={{ display: 'flex', gap: 4, width: 'fit-content', background: '#fff', borderRadius: 12, padding: 5, marginBottom: 26, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
          {['overview', 'bookings', 'vehicles', 'outlets', 'users'].map(item => (
            <button
              key={item}
              onClick={() => setTab(item)}
              style={{
                border: 0, borderRadius: 8, padding: '8px 20px', cursor: 'pointer',
                background: tab === item ? '#00c472' : 'transparent',
                color: tab === item ? '#fff' : '#667085',
                fontWeight: 800, textTransform: 'capitalize',
              }}
            >
              {item === 'users' ? 'Users & Staff' : item}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              <Stat label="Total bookings" value={totalBookings} />
              <Stat label="Available vehicles" value={activeVehicles} />
              <Stat label="Pending approvals" value={pendingBookings} />
              <Stat label="Active outlets" value={outlets.filter(o => o.isActive).length} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <Stat label="Revenue (30 days)" value={`Rs ${revenue30Days.toLocaleString()}`} highlight />
              <Stat label="Confirmed bookings" value={bookings.filter(b => b.status === 'CONFIRMED').length} />
              <Stat label="Completed bookings" value={bookings.filter(b => b.status === 'COMPLETED').length} />
            </div>
            <DataCard title="Recent bookings"><BookingsTable bookings={recentBookings} currentUser={user} onStatusChange={handleUpdateBookingStatus} onCancelBooking={handleCancelBookingInitiate} compact /></DataCard>
            <div style={{ height: 24 }} />
            <DataCard title="Vehicle availability"><VehiclesTable vehicles={vehicles} compact /></DataCard>
          </>
        )}

        {tab === 'bookings' && <DataCard title={`All bookings (${bookings.length})`}><BookingsTable bookings={bookings} currentUser={user} onStatusChange={handleUpdateBookingStatus} onCancelBooking={handleCancelBookingInitiate} /></DataCard>}
        {tab === 'vehicles' && (
          <DataCard
            title={`All vehicles (${vehicles.length})`}
            action={
              ['SUPERADMIN', 'ADMIN'].includes(user.role) && (
                <button
                  onClick={openCreateVehicleModal}
                  style={{
                    background: '#00c472', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  + Add Vehicle
                </button>
              )
            }
          >
            <VehiclesTable
              vehicles={vehicles}
              currentUser={user}
              onEdit={openEditVehicleModal}
              onDelete={handleDeleteVehicle}
            />
          </DataCard>
        )}
        
        {/* Outlets Management Tab */}
        {tab === 'outlets' && (
          <DataCard
            title={`Branch Outlets (${outlets.length})`}
            action={
              <button
                onClick={openCreateOutletModal}
                style={{
                  background: '#00c472', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                + Add Outlet
              </button>
            }
          >
            <OutletsTable outlets={outlets} onEdit={openEditOutletModal} onDeactivate={handleDeactivateOutlet} />
          </DataCard>
        )}

        {/* Users & Staff Management Tab */}
        {tab === 'users' && (
          <DataCard
            title={`Users & Staff Accounts (${usersList.length})`}
            action={
              ['SUPERADMIN', 'ADMIN'].includes(user.role) && (
                <button
                  onClick={openCreateUserModal}
                  style={{
                    background: '#00c472', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  + Create Staff / Admin User
                </button>
              )
            }
          >
            <UsersTable
              usersList={usersList}
              currentUser={user}
              onRoleChange={handleRoleChangeInitiate}
              onDeleteUser={handleDeleteUserInitiate}
            />
          </DataCard>
        )}
      </main>

      {/* Outlet Modal */}
      {showOutletModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e' }}>
                {editingOutlet ? 'Edit Branch Outlet' : 'Add New Branch Outlet'}
              </h2>
              <button onClick={() => setShowOutletModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <form onSubmit={handleSaveOutlet} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={modalLabel}>Outlet Name</label>
                <input type="text" value={outletForm.name} onChange={e => setOutletForm({ ...outletForm, name: e.target.value })} placeholder="e.g. Lahore – Gulberg Branch" required style={modalInput} />
              </div>

              <div>
                <label style={modalLabel}>City (Search Map or Manual)</label>
                <div style={{ border: '1.5px solid #d8e0e5', borderRadius: 9, padding: '9px 12px' }}>
                  <LocationAutocomplete
                    value={outletForm.city}
                    onChange={text => setOutletForm(prev => ({ ...prev, city: text }))}
                    onSelectLocation={({ address, lat, lng, city }) => {
                      const cityName = city || address.split(',')[0]
                      setOutletForm(prev => ({
                        ...prev,
                        city: cityName,
                        latitude: prev.latitude || String(lat),
                        longitude: prev.longitude || String(lng),
                      }))
                    }}
                    placeholder="Search city (e.g. Lahore, Karachi, Islamabad)..."
                  />
                </div>
              </div>

              <div>
                <label style={modalLabel}>Address (Search Map or Manual)</label>
                <div style={{ border: '1.5px solid #d8e0e5', borderRadius: 9, padding: '9px 12px' }}>
                  <LocationAutocomplete
                    value={outletForm.addressText}
                    onChange={text => setOutletForm(prev => ({ ...prev, addressText: text }))}
                    onSelectLocation={({ address, lat, lng, city }) => {
                      setOutletForm(prev => ({
                        ...prev,
                        addressText: address,
                        latitude: String(lat),
                        longitude: String(lng),
                        city: prev.city || city || '',
                      }))
                    }}
                    placeholder="Search location/address on map..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={modalLabel}>Latitude</label>
                  <input type="number" step="any" value={outletForm.latitude} onChange={e => setOutletForm({ ...outletForm, latitude: e.target.value })} placeholder="31.5204" required style={modalInput} />
                </div>
                <div>
                  <label style={modalLabel}>Longitude</label>
                  <input type="number" step="any" value={outletForm.longitude} onChange={e => setOutletForm({ ...outletForm, longitude: e.target.value })} placeholder="74.3587" required style={modalInput} />
                </div>
              </div>

              {editingOutlet && (
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" id="isActive" checked={outletForm.isActive} onChange={e => setOutletForm({ ...outletForm, isActive: e.target.checked })} accentColor="#00c472" />
                  <label htmlFor="isActive" style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>Active Status (visible to customers)</label>
                </div>
              )}

              {outletFormError && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{outletFormError}</p>}

              <div className="flex justify-end gap-3 mt-3">
                <button type="button" onClick={() => setShowOutletModal(false)} style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={outletSubmitting} style={{ background: '#00c472', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: outletSubmitting ? 0.7 : 1 }}>
                  {outletSubmitting ? 'Saving...' : 'Save Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User / Staff Creation Modal */}
      {showUserModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e' }}>Create Staff or Admin User</h2>
              <button onClick={() => setShowUserModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={modalLabel}>Full Name</label>
                <input type="text" value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} placeholder="John Doe" required style={modalInput} />
              </div>

              <div>
                <label style={modalLabel}>Email Address</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="staff@agency.com" required style={modalInput} />
              </div>

              <div>
                <label style={modalLabel}>Phone Number (Optional)</label>
                <input type="tel" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="03001234567" style={modalInput} />
              </div>

              <div>
                <label style={modalLabel}>Password</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder="Minimum 6 characters" required style={modalInput} />
              </div>

              <div>
                <label style={modalLabel}>Assign Role</label>
                <IOSDropdown
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  label="Assign Role"
                  options={[
                    ...(user.role === 'SUPERADMIN' ? [{ value: 'SUPERADMIN', label: 'SUPERADMIN (Platform Developer)' }] : []),
                    { value: 'ADMIN', label: 'ADMIN (Agency Owner)' },
                    { value: 'EMPLOYEE', label: 'EMPLOYEE (Agency Staff)' },
                    { value: 'CUSTOMER', label: 'CUSTOMER (Renter)' }
                  ]}
                />
              </div>

              {userFormError && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{userFormError}</p>}

              <div className="flex justify-end gap-3 mt-3">
                <button type="button" onClick={() => setShowUserModal(false)} style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={userSubmitting} style={{ background: '#00c472', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: userSubmitting ? 0.7 : 1 }}>
                  {userSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Role Change Modal */}
      {confirmRoleModal.show && (
        <div style={{ ...modalOverlayStyle, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div style={{ ...modalCardStyle, maxWidth: 450 }}>
            <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e', fontWeight: 800 }}>Confirm Role Change</h2>
              <button 
                onClick={() => setConfirmRoleModal({ show: false, userId: '', userName: '', currentRole: '', newRole: '' })} 
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}
              >×</button>
            </div>

            <div style={{ margin: '20px 0', fontSize: 14, lineHeight: 1.6, color: '#475467' }}>
              Are you sure you want to change <strong>{confirmRoleModal.userName}</strong>'s role?
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: 11, display: 'block', color: '#64748b', marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Current Role</span>
                  <Badge value={confirmRoleModal.currentRole} />
                </div>
                <div style={{ fontSize: 18, color: '#64748b' }}>→</div>
                <div>
                  <span style={{ fontSize: 11, display: 'block', color: '#64748b', marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Target Role</span>
                  <Badge value={confirmRoleModal.newRole} />
                </div>
              </div>
            </div>

            {confirmRoleError && <p style={{ color: '#c53030', fontSize: 13, margin: '0 0 14px' }}>{confirmRoleError}</p>}

            <div className="flex justify-end gap-3 mt-4 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button 
                type="button" 
                onClick={() => setConfirmRoleModal({ show: false, userId: '', userName: '', currentRole: '', newRole: '' })} 
                style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={roleChanging}
                onClick={handleConfirmRoleChange} 
                style={{ background: '#00c472', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: roleChanging ? 0.7 : 1 }}
              >
                {roleChanging ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteUserModal.show && (
        <div style={{ ...modalOverlayStyle, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div style={{ ...modalCardStyle, maxWidth: 450 }}>
            <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#dc2626', fontWeight: 800 }}>Delete User Account</h2>
              <button 
                onClick={() => setDeleteUserModal({ show: false, userId: '', userName: '', role: '' })} 
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}
              >×</button>
            </div>

            <div style={{ margin: '20px 0', fontSize: 14, lineHeight: 1.6, color: '#475467' }}>
              Are you sure you want to permanently delete the account for <strong>{deleteUserModal.userName}</strong>?
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: 11, display: 'block', color: '#991b1b', marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Warning</span>
                  <span style={{ fontSize: 13, color: '#b91c1c' }}>This action is irreversible. All data associated with this user will be removed.</span>
                </div>
              </div>
              <div style={{ marginTop: 12, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>User Role: </span>
                <Badge value={deleteUserModal.role} />
              </div>
            </div>

            {deleteUserError && <p style={{ color: '#c53030', fontSize: 13, margin: '0 0 14px' }}>{deleteUserError}</p>}

            <div className="flex justify-end gap-3 mt-4 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button 
                type="button" 
                onClick={() => setDeleteUserModal({ show: false, userId: '', userName: '', role: '' })} 
                style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={deletingUser}
                onClick={handleConfirmDeleteUser} 
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: deletingUser ? 0.7 : 1 }}
              >
                {deletingUser ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Modal */}
      {cancelBookingModal.show && (
        <div style={{ ...modalOverlayStyle, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div style={{ ...modalCardStyle, maxWidth: 460 }}>
            <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#dc2626', fontWeight: 800 }}>Cancel Booking</h2>
              <button
                onClick={() => setCancelBookingModal({ show: false, bookingId: null, bookingRef: '', customerName: '', customerPhone: '', vehicleName: '' })}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}
              >×</button>
            </div>

            <div style={{ margin: '16px 0', fontSize: 14, lineHeight: 1.6, color: '#475467' }}>
              <p style={{ margin: '0 0 14px' }}>Are you sure you want to cancel the following booking?</p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                <div><span style={{ fontWeight: 700, color: '#1a1a2e' }}>Booking ID: </span><span style={{ color: '#667085', fontWeight: 600 }}>#{cancelBookingModal.bookingNumId}</span></div>
                <div><span style={{ fontWeight: 700, color: '#1a1a2e' }}>Reference: </span><span style={{ color: '#00a85a', fontWeight: 700 }}>{cancelBookingModal.bookingRef}</span></div>
                <div><span style={{ fontWeight: 700, color: '#1a1a2e' }}>Customer: </span>{cancelBookingModal.customerName}</div>
                <div><span style={{ fontWeight: 700, color: '#1a1a2e' }}>Vehicle: </span>{cancelBookingModal.vehicleName}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: 11, display: 'block', color: '#991b1b', marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Note</span>
                  <span style={{ fontSize: 13, color: '#b91c1c' }}>A WhatsApp cancellation message will be opened for you to send to the customer.</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={() => setCancelBookingModal({ show: false, bookingId: null, bookingRef: '', customerName: '', customerPhone: '', vehicleName: '' })}
                style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={cancellingBooking}
                onClick={handleConfirmCancelBooking}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: cancellingBooking ? 0.7 : 1 }}
              >
                {cancellingBooking ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: 550, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e' }}>
                {editingVehicle ? 'Edit Vehicle Package' : 'Add New Vehicle Package'}
              </h2>
              <button onClick={() => setShowVehicleModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <form onSubmit={handleSaveVehicle} style={{ display: 'grid', gap: 14 }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={modalLabel}>Make / Brand</label>
                  <input type="text" value={vehicleForm.make} onChange={e => setVehicleForm({ ...vehicleForm, make: e.target.value })} placeholder="e.g. Toyota" required style={modalInput} />
                </div>
                <div>
                  <label style={modalLabel}>Model Name</label>
                  <input type="text" value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="e.g. Corolla" required style={modalInput} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={modalLabel}>Category</label>
                  <IOSDropdown
                    value={vehicleForm.category}
                    onChange={e => setVehicleForm({ ...vehicleForm, category: e.target.value })}
                    label="Categories"
                    options={['Sedan', 'SUV', 'Hatchback', 'Crossover', 'Van']}
                  />
                </div>
                <div>
                  <label style={modalLabel}>Transmission</label>
                  <IOSDropdown
                    value={vehicleForm.transmission}
                    onChange={e => setVehicleForm({ ...vehicleForm, transmission: e.target.value })}
                    label="Transmission"
                    options={['AUTOMATIC', 'MANUAL']}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={modalLabel}>Seating Capacity</label>
                  <input type="number" min="1" value={vehicleForm.seatingCapacity} onChange={e => setVehicleForm({ ...vehicleForm, seatingCapacity: e.target.value })} required style={modalInput} />
                </div>
                <div>
                  <label style={modalLabel}>Price per Day (PKR)</label>
                  <input type="number" min="1" value={vehicleForm.pricePerDay} onChange={e => setVehicleForm({ ...vehicleForm, pricePerDay: e.target.value })} required style={modalInput} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={modalLabel}>Pickup City</label>
                  <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', marginTop: 4 }}>
                    <LocationAutocomplete
                      value={vehicleForm.pickupCity}
                      onChange={(text) => setVehicleForm({ ...vehicleForm, pickupCity: text })}
                      onSelectLocation={({ city, address }) => setVehicleForm({ ...vehicleForm, pickupCity: city || address })}
                      placeholder="e.g. Lahore"
                    />
                  </div>
                </div>
                <div>
                  <label style={modalLabel}>Dropoff City</label>
                  <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', marginTop: 4 }}>
                    <LocationAutocomplete
                      value={vehicleForm.dropoffCity}
                      onChange={(text) => setVehicleForm({ ...vehicleForm, dropoffCity: text })}
                      onSelectLocation={({ city, address }) => setVehicleForm({ ...vehicleForm, dropoffCity: city || address })}
                      placeholder="e.g. Lahore"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={modalLabel}>Upload Vehicle Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setSelectedFile(e.target.files[0])}
                    style={{ ...modalInput, padding: '8px 10px' }}
                  />
                </div>
                <div>
                  <label style={modalLabel}>Or Enter Image URL</label>
                  <input
                    type="url"
                    value={vehicleForm.imageUrl}
                    onChange={e => setVehicleForm({ ...vehicleForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/... or image link"
                    style={modalInput}
                  />
                </div>
              </div>

              {(selectedFile || vehicleForm.imageUrl) && (
                <div style={{ marginTop: 6 }}>
                  <label style={modalLabel}>Image Preview</label>
                  <div style={{ width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: 4 }}>
                    <img
                      src={selectedFile ? URL.createObjectURL(selectedFile) : vehicleForm.imageUrl}
                      alt="Vehicle preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '6px 0' }}>
                <div 
                  onClick={() => setVehicleForm(prev => ({ ...prev, hasAC: !prev.hasAC }))}
                  style={{
                    border: `2px solid ${vehicleForm.hasAC ? '#00c472' : '#e2e8f0'}`,
                    background: vehicleForm.hasAC ? 'rgba(0,196,114,0.04)' : '#fff',
                    borderRadius: 12,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: `2px solid ${vehicleForm.hasAC ? '#00c472' : '#cbd5e1'}`,
                    background: vehicleForm.hasAC ? '#00c472' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 'bold',
                    transition: 'all 0.15s ease',
                  }}>
                    {vehicleForm.hasAC && '✓'}
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', display: 'block' }}>Air Conditioned</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Equipped with cooling</span>
                  </div>
                </div>

                <div 
                  onClick={() => setVehicleForm(prev => ({ ...prev, driverOption: !prev.driverOption }))}
                  style={{
                    border: `2px solid ${vehicleForm.driverOption ? '#00c472' : '#e2e8f0'}`,
                    background: vehicleForm.driverOption ? 'rgba(0,196,114,0.04)' : '#fff',
                    borderRadius: 12,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: `2px solid ${vehicleForm.driverOption ? '#00c472' : '#cbd5e1'}`,
                    background: vehicleForm.driverOption ? '#00c472' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 'bold',
                    transition: 'all 0.15s ease',
                  }}>
                    {vehicleForm.driverOption && '✓'}
                  </div>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', display: 'block' }}>Driver Option</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Bookable with driver</span>
                  </div>
                </div>
              </div>

              {editingVehicle && (
                <div>
                  <label style={modalLabel}>Status</label>
                  <IOSDropdown
                    value={vehicleForm.status}
                    onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                    label="Status"
                    options={['AVAILABLE', 'BOOKED', 'MAINTENANCE', 'INACTIVE']}
                  />
                </div>
              )}

              {vehicleFormError && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{vehicleFormError}</p>}

              <div className="flex justify-end gap-3 mt-3">
                <button type="button" onClick={() => setShowVehicleModal(false)} style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={vehicleSubmitting} style={{ background: '#00c472', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: vehicleSubmitting ? 0.7 : 1 }}>
                  {vehicleSubmitting ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Modal */}
      {confirmModal.show && (
        <div style={{ ...modalOverlayStyle, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div style={{ ...modalCardStyle, maxWidth: 400 }}>
            <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e', fontWeight: 800 }}>{confirmModal.title}</h2>
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} 
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}
              >×</button>
            </div>

            <p style={{ margin: '20px 0', fontSize: 14, lineHeight: 1.6, color: '#475467' }}>
              {confirmModal.message}
            </p>

            <div className="flex justify-end gap-3 mt-4 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button 
                type="button" 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} 
                style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={confirmModal.onConfirm} 
                style={{ background: confirmModal.confirmBg, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Error Modal */}
      {errorModal.show && (
        <div style={{ ...modalOverlayStyle, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div style={{ ...modalCardStyle, maxWidth: 400 }}>
            <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#dc2626', fontWeight: 800 }}>{errorModal.title}</h2>
              <button 
                onClick={() => setErrorModal(prev => ({ ...prev, show: false }))} 
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}
              >×</button>
            </div>

            <p style={{ margin: '20px 0', fontSize: 14, lineHeight: 1.6, color: '#475467' }}>
              {errorModal.message}
            </p>

            <div className="flex justify-end mt-4 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button 
                type="button" 
                onClick={() => setErrorModal(prev => ({ ...prev, show: false }))} 
                style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label: statLabel, value, highlight }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg, #00c472 0%, #00a85a 100%)' : '#fff',
      borderRadius: 14,
      padding: '20px 22px',
      boxShadow: highlight ? '0 4px 16px rgba(0,196,114,.25)' : '0 2px 10px rgba(0,0,0,.05)',
    }}>
      <p style={{ margin: '0 0 8px', color: highlight ? 'rgba(255,255,255,0.8)' : '#8b95a1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>{statLabel}</p>
      <p style={{ margin: 0, fontSize: 27, color: highlight ? '#fff' : '#1a1a2e', fontWeight: 800 }}>{value}</p>
    </div>
  )
}

function DataCard({ title, action, children }) {
  return (
    <section style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ margin: 0, color: '#1a1a2e', fontSize: 17 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Badge({ value }) {
  const [background, color] = STATUS_COLORS[value] || ['#f3f4f6', '#555']
  return (
    <span style={{ background, color, fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {label(value)}
    </span>
  )
}

function BookingsTable({ bookings, currentUser, onStatusChange, onCancelBooking }) {
  const canManage = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE'].includes(currentUser?.role)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Reference', 'Customer', 'Vehicle', 'Mode', 'Pickup/Outlet', 'Return', 'Status', ...(canManage ? ['Actions'] : [])].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookings.length ? bookings.map(booking => {
            const waUrl = buildWhatsAppUrl(booking.customer?.phone, buildBookingConfirmationMessage(booking))

            return (
              <tr key={booking.id} style={{ borderTop: '1px solid #f1f3f5' }}>
                <td style={td}><strong style={{ color: '#00a85a' }}>{booking.bookingReference}</strong></td>
                <td style={td}>{booking.customer?.fullName || '—'}<small style={small}>{booking.customer?.phone || ''}</small></td>
                <td style={td}>{booking.vehiclePackage?.make} {booking.vehiclePackage?.model}</td>
                <td style={td}>
                  <span style={{ background: '#f0fdf7', color: '#00a85a', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                    {booking.rentalMode === 'WITH_DRIVER' ? 'With-Driver' : 'Self-Drive'}
                  </span>
                </td>
                <td style={td}>
                  {booking.rentalMode === 'WITH_DRIVER'
                    ? (booking.pickupAddress || 'Address specified')
                    : (booking.outlet ? `${booking.outlet.name} (${booking.outlet.city})` : 'Outlet')}
                </td>
                <td style={td}>{date(booking.returnDateTime)}</td>
                <td style={td}><Badge value={booking.status} /></td>
                {canManage && (
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {booking.status === 'PENDING' && (
                        <button
                          onClick={() => onStatusChange(booking, 'CONFIRMED')}
                          style={{
                            background: '#00c472',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Approve
                        </button>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: '#25D366',
                            color: '#fff',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          WhatsApp
                        </a>
                      )}
                      {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                        <button
                          onClick={() => onCancelBooking(booking)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          }) : (
            <tr><td colSpan={canManage ? "8" : "7"} style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No bookings yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function VehiclesTable({ vehicles, currentUser, onEdit, onDelete }) {
  const canManage = ['SUPERADMIN', 'ADMIN'].includes(currentUser?.role)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {[
              'Vehicle',
              'Category',
              'Route',
              'Price/day',
              'Status',
              ...(canManage ? ['Actions'] : []),
            ].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.length ? vehicles.map(vehicle => (
            <tr key={vehicle.id} style={{ borderTop: '1px solid #f1f3f5' }}>
              <td style={td}>
                <strong>{vehicle.make} {vehicle.model}</strong>
                <small style={small}>
                  {vehicle.seatingCapacity} seats · {vehicle.transmission.toLowerCase()} · {vehicle.hasAC ? 'A/C' : 'No A/C'} · {vehicle.driverOption ? 'With driver option' : 'Self drive only'}
                </small>
              </td>
              <td style={td}>{label(vehicle.category)}</td>
              <td style={td}>{vehicle.pickupCity} → {vehicle.dropoffCity}</td>
              <td style={td}>Rs {vehicle.pricePerDay.toLocaleString()}</td>
              <td style={td}><Badge value={vehicle.status} /></td>
              {canManage && (
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      onClick={() => onEdit(vehicle)} 
                      style={{ background: '#f3f4f6', color: '#333', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => onDelete(vehicle.id, `${vehicle.make} ${vehicle.model}`)} 
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              )}
            </tr>
          )) : (
            <tr><td colSpan={canManage ? 6 : 5} style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No vehicles yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function OutletsTable({ outlets, onEdit, onDeactivate }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Outlet Name', 'City', 'Address', 'Coordinates', 'Status', 'Actions'].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {outlets.length ? outlets.map(outlet => (
            <tr key={outlet.id} style={{ borderTop: '1px solid #f1f3f5' }}>
              <td style={td}><strong>{outlet.name}</strong></td>
              <td style={td}>{outlet.city}</td>
              <td style={td}>{outlet.addressText}</td>
              <td style={td}>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${outlet.latitude},${outlet.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00a85a', textDecoration: 'underline' }}>
                  {outlet.latitude.toFixed(4)}, {outlet.longitude.toFixed(4)} ↗
                </a>
              </td>
              <td style={td}><Badge value={outlet.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
              <td style={td}>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(outlet)} style={{ background: '#f3f4f6', color: '#333', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                  {outlet.isActive && (
                    <button onClick={() => onDeactivate(outlet.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Deactivate</button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="6" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No branch outlets configured yet. Click "+ Add Outlet" to create one.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function UsersTable({ usersList, currentUser, onRoleChange, onDeleteUser }) {
  const canManage = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN'

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Name', 'Email', 'Phone', 'Role', 'Registered', 'Role Management', 'Actions'].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {usersList.length ? usersList.map(u => {
            const isSuper = u.role === 'SUPERADMIN'
            const isSelf = u.id === currentUser.id
            const canEditThisUser = canManage && (!isSuper || currentUser.role === 'SUPERADMIN') && !isSelf
            // Admins can delete customers & employees. Superadmins can delete anyone except themselves.
            const canDelete = canManage && !isSelf && (
              currentUser.role === 'SUPERADMIN' ||
              (currentUser.role === 'ADMIN' && (u.role === 'CUSTOMER' || u.role === 'EMPLOYEE'))
            )

            return (
              <tr key={u.id} style={{ borderTop: '1px solid #f1f3f5' }}>
                <td style={td}><strong>{u.fullName}</strong></td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.phone || '—'}</td>
                <td style={td}><Badge value={u.role} /></td>
                <td style={td}>{date(u.createdAt)}</td>
                <td style={td}>
                  {canEditThisUser ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 140 }}>
                      <IOSDropdown
                        value={u.role}
                        onChange={e => {
                          if (e.target.value !== u.role) {
                            onRoleChange(u.id, e.target.value, u.fullName, u.role)
                          }
                        }}
                        label="User Role"
                        options={[
                          ...(currentUser.role === 'SUPERADMIN' ? ['SUPERADMIN'] : []),
                          'ADMIN',
                          'EMPLOYEE',
                          'CUSTOMER'
                        ]}
                        style={{ width: '140px' }}
                      />
                    </div>
                  ) : (
                    <span style={{ color: '#98a2b3', fontSize: 12 }}>{isSelf ? '(You)' : 'Protected'}</span>
                  )}
                </td>
                <td style={td}>
                  {canDelete ? (
                    <button
                      onClick={() => onDeleteUser(u.id, u.fullName, u.role)}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626' }}
                    >
                      Delete
                    </button>
                  ) : (
                    <span style={{ color: '#98a2b3', fontSize: 12 }}>{isSelf ? '—' : 'Protected'}</span>
                  )}
                </td>
              </tr>
            )
          }) : (
            <tr><td colSpan="7" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No user accounts found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function PanelState({ title, text }) {
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div>
        <h1 style={{ color: '#1a1a2e' }}>{title}</h1>
        {text && <p style={{ color: '#667085' }}>{text}</p>}
      </div>
    </div>
  )
}

const th = { padding: '10px 12px', textAlign: 'left', color: '#88929d', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }
const td = { padding: '13px 12px', color: '#475467', verticalAlign: 'middle' }
const small = { display: 'block', marginTop: 3, color: '#98a2b3', fontSize: 11 }
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 16 }
const modalCardStyle = { background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
const modalLabel = { display: 'block', fontSize: 12, fontWeight: 700, color: '#475467', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }
const modalInput = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid #d8e0e5', borderRadius: 8, fontSize: 14, color: '#1a1a2e' }
