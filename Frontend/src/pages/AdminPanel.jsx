import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useLocation } from 'react-router-dom'
import apiFetch from '../lib/apiClient'
import { useAuth } from '../context/AuthContext'
import LocationAutocomplete from '../components/LocationAutocomplete'
import IOSDropdown from '../components/IOSDropdown'
import ThemeEditor from '../components/ThemeEditor'
import AgencySettingsEditor from '../components/AgencySettingsEditor'
import { formatCnic, formatPhone, fullNameError, phoneError, cnicError, licenseNumberError, licenseExpiryError, formatLicenseNumber, registrationPlateError, formatRegistrationPlate, optionalPhoneError, emailError, optionalEmailError, urlError, businessNameError, passwordError } from '../lib/validation'

const STAFF_ROLES = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE']

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
  ARCHIVED: ['#f3f4f6', '#6b7280'],
  IDLE: ['#dcfce7', '#16a34a'],
  ASSIGNED: ['#dbeafe', '#1d4ed8'],
  SUPERADMIN: ['#fae8ff', '#86198f'],
  ADMIN: ['#e0e7ff', '#3730a3'],
  EMPLOYEE: ['#e0f2fe', '#0369a1'],
  CUSTOMER: ['#f3f4f6', '#4b5563'],
}

function validateDriverForm({ fullName, phone, cnic, licenseNumber, licenseExpiry }) {
  return {
    fullName: fullNameError(fullName),
    phone: phoneError(phone),
    cnic: cnicError(cnic),
    licenseNumber: licenseNumberError(licenseNumber),
    licenseExpiry: licenseExpiryError(licenseExpiry),
  }
}

const label = value => String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

const TAB_LABELS = { users: 'Users & Staff', themes: 'Themes', settings: 'Agency Settings', tenants: 'Tenants' }
const tabLabel = tabKey => TAB_LABELS[tabKey] || (tabKey[0].toUpperCase() + tabKey.slice(1))

// Client-side preview only — the backend re-slugifies and validates
// authoritatively, this just keeps the slug field in sync while typing.
const slugifyPreview = value => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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
  const url = buildWhatsAppUrl(phone, message)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function buildWhatsAppUrl(phone, message) {
  const cleaned = phone ? phone.replace(/[^0-9+]/g, '') : ''
  const text = encodeURIComponent(message || '')
  return cleaned
    ? `https://api.whatsapp.com/send?phone=${cleaned.startsWith('+') ? cleaned.slice(1) : cleaned}&text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`
}

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.tab || 'overview')

  // Already on /admin (same route, no remount) when a booking-notification
  // click fires a new navigation with tab state — the useState initializer
  // above only covers a fresh mount, so also react to state changes directly.
  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab)
  }, [location.state])

  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [outlets, setOutlets] = useState([])
  const [drivers, setDrivers] = useState([])
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
    category: 'Sedan', make: '', model: '', variant: '', year: '', registrationPlate: '', seatingCapacity: 5, transmission: 'AUTOMATIC',
    hasAC: true, driverOption: true, pricePerDay: 5000, pickupCity: 'Lahore', dropoffCity: 'Lahore',
    imageUrl: '', status: 'AVAILABLE',
  })
  const [vehicleFormError, setVehicleFormError] = useState('')
  const [vehicleFieldErrors, setVehicleFieldErrors] = useState({})
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  // Modal State for Drivers
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [driverForm, setDriverForm] = useState({ fullName: '', phone: '', cnic: '', licenseNumber: '', licenseExpiry: '', status: 'IDLE' })
  const [driverFormError, setDriverFormError] = useState('')
  const [driverFieldErrors, setDriverFieldErrors] = useState({})
  const [driverSubmitting, setDriverSubmitting] = useState(false)

  // Tenants (SUPERADMIN only)
  const [tenants, setTenants] = useState([])
  const [tenantsLoading, setTenantsLoading] = useState(false)
  const [tenantsError, setTenantsError] = useState('')
  const [showTenantModal, setShowTenantModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const emptyTenantForm = { name: '', slug: '', contactEmail: '', contactPhone: '', logoUrl: '', adminFullName: '', adminEmail: '', adminPhone: '', adminPassword: '' }
  const [tenantForm, setTenantForm] = useState(emptyTenantForm)
  const [tenantSlugTouched, setTenantSlugTouched] = useState(false)
  const [tenantFormError, setTenantFormError] = useState('')
  const [tenantFieldErrors, setTenantFieldErrors] = useState({})
  const [tenantSubmitting, setTenantSubmitting] = useState(false)
  const [archiveTenantModal, setArchiveTenantModal] = useState(null)
  const [archiveConfirmInput, setArchiveConfirmInput] = useState('')
  const [archiveSubmitting, setArchiveSubmitting] = useState(false)
  const [archiveError, setArchiveError] = useState('')

  // Reusable confirmation and error modal states
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm', confirmBg: 'var(--brand)' })
  const [errorModal, setErrorModal] = useState({ show: false, title: 'Error', message: '' })

  const showConfirm = (title, message, onConfirm, confirmText = 'Confirm', confirmBg = 'var(--brand)') => {
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
      apiFetch('/drivers'),
      apiFetch('/users'),
    ])
      .then(([dashboard, liveBookings, liveVehicles, liveOutlets, liveDrivers, liveUsers]) => {
        setError('')
        setStats(dashboard)
        setBookings(liveBookings)
        setVehicles(liveVehicles)
        setOutlets(liveOutlets)
        setDrivers(liveDrivers)
        setUsersList(liveUsers)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) {
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

  // Tenants isn't part of the shared reloadData() Promise.all — /tenants is
  // SUPERADMIN-only and would 403 for every other role, so it's loaded
  // separately and lazily, only once the Tenants tab is actually opened.
  function loadTenants() {
    if (user?.role !== 'SUPERADMIN') return
    setTenantsLoading(true)
    setTenantsError('')
    apiFetch('/tenants')
      .then(setTenants)
      .catch(err => setTenantsError(err.message))
      .finally(() => setTenantsLoading(false))
  }

  useEffect(() => {
    if (tab === 'tenants' && user?.role === 'SUPERADMIN') {
      loadTenants()
    }
  }, [tab, user])

  const totalBookings = stats ? Object.values(stats.bookings).reduce((sum, count) => sum + count, 0) : 0
  const pendingBookings = stats ? stats.bookings.PENDING : 0
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
  async function handleUpdateBookingStatus(bookingId, newStatus) {
    const booking = bookings.find(b => b.id === bookingId)
    try {
      await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })

      if (booking?.vehiclePackage?.id) {
        setVehicles(prev => prev.map(vehicle => (
          vehicle.id === booking.vehiclePackage.id
            ? { ...vehicle, status: newStatus === 'CONFIRMED' ? 'BOOKED' : 'AVAILABLE' }
            : vehicle
        )))
      }

      reloadData()
    } catch (err) {
      alert(`Failed to update booking status: ${err.message}`)
    }
  }

  function handleApproveBooking(booking) {
    openWhatsApp(
      booking.customer?.phone,
      buildBookingConfirmationMessage(booking, { approved: true })
    )
    handleUpdateBookingStatus(booking.id, 'CONFIRMED')
  }

  function handleApproveClick(booking) {
    if (booking.rentalMode === 'WITH_DRIVER') {
      setApproveDriverModal(booking)
    } else {
      handleApproveBooking(booking)
    }
  }

  async function handleApproveWithDriver(booking, driverId) {
    if (driverId) {
      await apiFetch(`/bookings/${booking.id}/assign-driver`, {
        method: 'PUT',
        body: JSON.stringify({ driverId }),
      })
    }
    handleApproveBooking(booking)
    setApproveDriverModal(null)
  }

  async function handleBookingStatusChange(booking, newStatus) {
    if (booking.status === 'PENDING' && newStatus === 'CONFIRMED') {
      handleApproveBooking(booking)
      return
    }

    if (newStatus === 'COMPLETED') {
      showConfirm(
        'Complete Booking',
        `Are you sure you want to mark booking ${booking.bookingReference} as completed? This will free the vehicle back to available status.`,
        async () => {
          await handleUpdateBookingStatus(booking.id, 'COMPLETED')
        },
        'Complete',
        '#10b981'
      )
      return
    }

    await handleUpdateBookingStatus(booking.id, newStatus)
  }

  // ---- View booking details (full customer + ride info before approving) ----
  const [viewBookingModal, setViewBookingModal] = useState(null)

  // ---- Approve With-Driver booking (pick an idle driver as part of approval) ----
  const [approveDriverModal, setApproveDriverModal] = useState(null)

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

  // ---- Delete Booking (admin only) ----
  const [deleteBookingModal, setDeleteBookingModal] = useState({ show: false, bookingId: null, bookingRef: '', customerName: '', vehicleName: '' })
  const [deletingBooking, setDeletingBooking] = useState(false)
  const [deleteBookingError, setDeleteBookingError] = useState('')

  function handleDeleteBookingInitiate(booking) {
    setDeleteBookingError('')
    setDeleteBookingModal({
      show: true,
      bookingId: booking.id,
      bookingRef: booking.bookingReference,
      customerName: booking.customer?.fullName || 'Customer',
      vehicleName: `${booking.vehiclePackage?.make || ''} ${booking.vehiclePackage?.model || 'Vehicle'}`.trim(),
    })
  }

  async function handleConfirmDeleteBooking() {
    setDeleteBookingError('')
    setDeletingBooking(true)
    try {
      await apiFetch(`/bookings/${deleteBookingModal.bookingId}`, { method: 'DELETE' })
      setDeleteBookingModal({ show: false, bookingId: null, bookingRef: '', customerName: '', vehicleName: '' })
      reloadData()
    } catch (err) {
      setDeleteBookingError(err.message)
    } finally {
      setDeletingBooking(false)
    }
  }

  function openCreateVehicleModal() {
    setEditingVehicle(null)
    setVehicleForm({
      category: 'Sedan', make: '', model: '', variant: '', year: '', registrationPlate: '', seatingCapacity: 5, transmission: 'AUTOMATIC',
      hasAC: true, driverOption: true, pricePerDay: 5000, pickupCity: 'Lahore', dropoffCity: 'Lahore',
      imageUrl: '', status: 'AVAILABLE',
    })
    setSelectedFile(null)
    setVehicleFormError('')
    setVehicleFieldErrors({})
    setShowVehicleModal(true)
  }

  function openEditVehicleModal(vehicle) {
    setEditingVehicle(vehicle)
    setVehicleForm({
      category: vehicle.category,
      make: vehicle.make,
      model: vehicle.model,
      variant: vehicle.variant || '',
      year: vehicle.year != null ? String(vehicle.year) : '',
      registrationPlate: vehicle.registrationPlate || '',
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
    setVehicleFieldErrors({})
    setShowVehicleModal(true)
  }

  async function handleSaveVehicle(e) {
    e.preventDefault()
    setVehicleFormError('')

    const { category, make, model, variant, year, registrationPlate, seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, imageUrl, status } = vehicleForm
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
    const yearNum = year.trim() ? Number(year) : null
    if (year.trim() && (isNaN(yearNum) || yearNum < 1980 || yearNum > new Date().getFullYear() + 1)) {
      setVehicleFormError('Year must be a valid 4-digit year.')
      return
    }

    const plateErr = registrationPlateError(registrationPlate)
    const imageErr = (!selectedFile && !imageUrl.trim()) ? 'Provide either an uploaded image file or an image URL.' : ''
    if (plateErr || imageErr) {
      setVehicleFieldErrors({ registrationPlate: plateErr, image: imageErr })
      return
    }
    setVehicleFieldErrors({})

    setVehicleSubmitting(true)
    try {
      // Upload the file first (if any) so the resulting URL can go into the
      // same create/update request — the backend requires imageUrls
      // non-empty in that one request rather than trusting a follow-up call.
      let finalImageUrl = imageUrl.trim()
      if (selectedFile) {
        const formData = new FormData()
        formData.append('image', selectedFile)
        const uploaded = await apiFetch('/vehicles/images/upload', {
          method: 'POST',
          body: formData,
        })
        finalImageUrl = uploaded.url
      }
      const imageUrlsPayload = finalImageUrl ? [finalImageUrl] : []

      const payload = {
        category: category.trim(),
        make: make.trim(),
        model: model.trim(),
        variant: variant.trim() || null,
        year: yearNum,
        registrationPlate: registrationPlate.trim().toUpperCase(),
        seatingCapacity: seatsNum,
        transmission,
        hasAC,
        driverOption,
        pricePerDay: priceNum,
        pickupCity: pickupCity.trim(),
        dropoffCity: dropoffCity.trim(),
        imageUrls: imageUrlsPayload,
      }

      if (editingVehicle) {
        await apiFetch(`/vehicles/${editingVehicle.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...payload, status }),
        })
      } else {
        await apiFetch('/vehicles', {
          method: 'POST',
          body: JSON.stringify(payload),
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

  // Driver Modal actions
  function openCreateDriverModal() {
    setEditingDriver(null)
    setDriverForm({ fullName: '', phone: '', cnic: '', licenseNumber: '', licenseExpiry: '', status: 'IDLE' })
    setDriverFormError('')
    setDriverFieldErrors({})
    setShowDriverModal(true)
  }

  function openEditDriverModal(driver) {
    setEditingDriver(driver)
    setDriverForm({
      fullName: driver.fullName,
      phone: driver.phone,
      cnic: driver.cnic,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.slice(0, 10) : '',
      status: driver.status,
    })
    setDriverFormError('')
    setDriverFieldErrors({})
    setShowDriverModal(true)
  }

  function updateDriverField(field, value) {
    const nextForm = { ...driverForm, [field]: value }
    setDriverForm(nextForm)
    setDriverFieldErrors({ ...driverFieldErrors, [field]: validateDriverForm(nextForm)[field] })
  }

  async function handleSaveDriver(e) {
    e.preventDefault()
    setDriverFormError('')

    const fieldErrors = validateDriverForm(driverForm)
    setDriverFieldErrors(fieldErrors)
    if (Object.values(fieldErrors).some(Boolean)) {
      return
    }

    const { fullName, phone, cnic, licenseNumber, licenseExpiry, status } = driverForm
    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      cnic: cnic.trim(),
      licenseNumber: licenseNumber.trim(),
      licenseExpiry,
    }

    setDriverSubmitting(true)
    try {
      if (editingDriver) {
        await apiFetch(`/drivers/${editingDriver.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...payload, status }),
        })
      } else {
        await apiFetch('/drivers', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      setShowDriverModal(false)
      reloadData()
    } catch (err) { setDriverFormError(err.message) } finally { setDriverSubmitting(false) }
  }

  function handleDeleteDriver(driverId, driverName) {
    showConfirm(
      'Delete Driver',
      `Are you sure you want to delete "${driverName}"? Drivers with active booking assignments can't be deleted — set them to inactive instead.`,
      async () => {
        try {
          await apiFetch(`/drivers/${driverId}`, { method: 'DELETE' })
          reloadData()
        } catch (err) {
          showError(err.message, 'Failed to Delete')
        }
      },
      'Delete',
      '#dc2626'
    )
  }

  // ---- Tenants (SUPERADMIN only) ----
  function openCreateTenantModal() {
    setEditingTenant(null)
    setTenantForm(emptyTenantForm)
    setTenantSlugTouched(false)
    setTenantFormError('')
    setTenantFieldErrors({})
    setShowTenantModal(true)
  }

  async function openEditTenantModal(tenant) {
    setEditingTenant(tenant)
    setTenantFormError('')
    setTenantFieldErrors({})
    setShowTenantModal(true)
    setTenantForm({ ...emptyTenantForm, name: tenant.clientName, slug: tenant.slug })
    try {
      const detail = await apiFetch(`/tenants/${tenant.slug}`)
      setTenantForm(prev => ({
        ...prev,
        contactEmail: detail.contactEmail || '',
        contactPhone: detail.contactPhone || '',
        logoUrl: detail.logoUrl || '',
      }))
    } catch (err) {
      setTenantFormError(`Loaded tenant, but couldn't load its current contact/branding details: ${err.message}`)
    }
  }

  function validateTenantField(field, value, isCreate) {
    switch (field) {
      case 'name': return businessNameError(value)
      case 'slug':
        if (!value) return ''
        return /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value)
          ? ''
          : 'Slug must be lowercase letters/digits/hyphens only, 3-63 characters, and not start or end with a hyphen.'
      case 'contactEmail': return optionalEmailError(value)
      case 'contactPhone': return optionalPhoneError(value)
      case 'logoUrl': return urlError(value)
      case 'adminFullName': return isCreate ? fullNameError(value) : ''
      case 'adminEmail': return isCreate ? emailError(value) : ''
      case 'adminPhone': return optionalPhoneError(value)
      case 'adminPassword': return isCreate ? (value ? passwordError(value) : 'Initial Admin password is required.') : ''
      default: return ''
    }
  }

  function validateTenantForm(form, isCreate) {
    const fields = ['name', 'slug', 'contactEmail', 'contactPhone', 'logoUrl', ...(isCreate ? ['adminFullName', 'adminEmail', 'adminPhone', 'adminPassword'] : [])]
    const errors = {}
    for (const field of fields) {
      const err = validateTenantField(field, form[field], isCreate)
      if (err) errors[field] = err
    }
    return errors
  }

  function updateTenantField(field, value) {
    setTenantForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-generate the slug from the name until the admin edits it directly.
      if (field === 'name' && !editingTenant && !tenantSlugTouched) {
        next.slug = slugifyPreview(value)
      }
      return next
    })
    setTenantFieldErrors(prev => ({ ...prev, [field]: validateTenantField(field, value, !editingTenant) }))
  }

  async function handleSaveTenant(e) {
    e.preventDefault()
    setTenantFormError('')

    const { name, slug, contactEmail, contactPhone, logoUrl, adminFullName, adminEmail, adminPhone, adminPassword } = tenantForm
    const errors = validateTenantForm(tenantForm, !editingTenant)
    if (Object.keys(errors).length) {
      setTenantFieldErrors(errors)
      return
    }
    setTenantFieldErrors({})
    setTenantSubmitting(true)

    try {
      if (editingTenant) {
        await apiFetch(`/tenants/${editingTenant.slug}`, {
          method: 'PUT',
          body: JSON.stringify({ name: name.trim(), slug, contactEmail, contactPhone, logoUrl }),
        })
      } else {
        await apiFetch('/tenants', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(), slug, contactEmail, contactPhone, logoUrl,
            adminFullName: adminFullName.trim(), adminEmail: adminEmail.trim(), adminPhone: adminPhone.trim() || undefined, adminPassword,
          }),
        })
      }
      setShowTenantModal(false)
      loadTenants()
    } catch (err) {
      setTenantFormError(err.message)
    } finally {
      setTenantSubmitting(false)
    }
  }

  function openArchiveTenantModal(tenant) {
    setArchiveTenantModal(tenant)
    setArchiveConfirmInput('')
    setArchiveError('')
  }

  async function handleConfirmArchive() {
    if (!archiveTenantModal) return
    setArchiveSubmitting(true)
    setArchiveError('')
    try {
      await apiFetch(`/tenants/${archiveTenantModal.slug}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ARCHIVED', confirmName: archiveConfirmInput }),
      })
      setArchiveTenantModal(null)
      loadTenants()
    } catch (err) {
      setArchiveError(err.message)
    } finally {
      setArchiveSubmitting(false)
    }
  }

  function handleUnarchiveTenant(tenant) {
    showConfirm(
      'Unarchive Tenant',
      `Restore "${tenant.clientName}" to active status? Sign-ins and requests on ${tenant.slug}.localhost will work again immediately.`,
      async () => {
        try {
          await apiFetch(`/tenants/${tenant.slug}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'ACTIVE' }),
          })
          loadTenants()
        } catch (err) {
          showError(err.message, 'Failed to Unarchive')
        }
      },
      'Unarchive',
      'var(--brand)'
    )
  }

  if (authLoading) return <PanelState title="Loading dashboard…" />
  if (!user || !STAFF_ROLES.includes(user.role)) return <Navigate to="/" replace />
  if (loading) return <PanelState title="Loading dashboard…" />
  if (error) return <PanelState title="Dashboard unavailable" text={error} />

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh' }}>
     <header style={{
        background: 'var(--brand)',
        padding: '14px 0',
      }}>
        <div className="w-full px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 900, letterSpacing: -0.3, margin: 0 }}>Admin Panel</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700, margin: '3px 0 0' }}>Live rental operations</p>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: 0.3, background: 'rgba(255,255,255,0.22)', padding: '4px 10px', borderRadius: 20 }}>
              {user.role}
            </span>
            <div style={{ color: 'var(--surface)', fontSize: 13, fontWeight: 900 }}>{user.fullName}</div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 md:px-6 lg:px-8 py-8">
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          <aside style={{ width: 260, flexShrink: 0 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '14px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
             {[
               'overview', 'bookings', 'vehicles', 'drivers', 'outlets', 'users', 'settings', 'themes',
               ...(user.role === 'SUPERADMIN' ? ['tenants'] : []),
             ].map(item => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', border: 0, borderRadius: 10,
                    padding: '14px 18px', cursor: 'pointer', margin: '8px 0',
                    background: tab === item ? 'var(--brand)' : 'transparent',
                    color: tab === item ? 'var(--surface)' : 'var(--muted)',
                    fontWeight: tab === item ? 900 : 700, fontSize: 15, textTransform: 'none',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                >
            {tabLabel(item)}
                </button>
              ))}
            </div>
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Prominent heading for currently selected sidebar item moved to TOP */}
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
             {tabLabel(tab)}
              </h2>
            </div>

            {tab === 'overview' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <Stat label="Total bookings" value={totalBookings} />
                <Stat label="Pending approvals" value={pendingBookings} />
                <Stat label="Active outlets" value={outlets.filter(o => o.isActive).length} />
                <Stat label="Revenue (30 days)" value={`Rs ${revenue30Days.toLocaleString()}`} highlight />
                <Stat label="Confirmed bookings" value={bookings.filter(b => b.status === 'CONFIRMED').length} />
                <Stat label="Completed bookings" value={bookings.filter(b => b.status === 'COMPLETED').length} />
              </div>
            )}

          {tab === 'settings' && (
  <DataCard title="Agency Settings">
    {['SUPERADMIN', 'ADMIN'].includes(user.role) ? (
      <AgencySettingsEditor />
    ) : (
      <p style={{ color: '#64748b', margin: 0 }}>Agency settings are only available for admin roles.</p>
    )}
  </DataCard>
)}

{tab === 'themes' && (
              <DataCard title="Themes">
                {['SUPERADMIN', 'ADMIN'].includes(user.role) ? (
                  <ThemeEditor />
                ) : (
                  <p style={{ color: '#64748b', margin: 0 }}>Theme settings are only available for admin roles.</p>
                )}
              </DataCard>
            )}

            {tab === 'bookings' && <DataCard title={`All bookings (${bookings.length})`}><BookingsTable bookings={bookings} currentUser={user} onStatusChange={handleBookingStatusChange} onApprove={handleApproveClick} onCancelBooking={handleCancelBookingInitiate} onDeleteBooking={handleDeleteBookingInitiate} onViewDetails={setViewBookingModal} /></DataCard>}
            
            {tab === 'vehicles' && (
              <DataCard
                title={`All vehicles (${vehicles.length})`}
                action={
                  ['SUPERADMIN', 'ADMIN'].includes(user.role) && (
                    <button
                      onClick={openCreateVehicleModal}
                      style={{
                        background: 'var(--brand)', color: 'var(--surface)', border: 'none',
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
            
            {/* Drivers Management Tab */}
            {tab === 'drivers' && (
              <DataCard
                title={`Drivers (${drivers.length})`}
                action={
                  ['SUPERADMIN', 'ADMIN', 'EMPLOYEE'].includes(user.role) && (
                    <button
                      onClick={openCreateDriverModal}
                      style={{
                        background: 'var(--brand)', color: 'var(--surface)', border: 'none',
                        borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      + Add Driver
                    </button>
                  )
                }
              >
                <DriversTable drivers={drivers} currentUser={user} onEdit={openEditDriverModal} onDelete={handleDeleteDriver} />
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
                      background: 'var(--brand)', color: 'var(--surface)', border: 'none',
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
                        background: 'var(--brand)', color: 'var(--surface)', border: 'none',
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

            {tab === 'tenants' && user.role === 'SUPERADMIN' && (
              <>
                <CurrentAgencyCard tenants={tenants} />

                <DataCard
                  title={`Tenants (${tenants.length})`}
                  action={
                    <button
                      onClick={openCreateTenantModal}
                      style={{
                        background: 'var(--brand)', color: 'var(--surface)', border: 'none',
                        borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      + Create Tenant
                    </button>
                  }
                >
                  {tenantsLoading && <p style={{ color: '#8b95a1', fontSize: 13 }}>Loading tenants…</p>}
                  {tenantsError && <p style={{ color: '#c53030', fontSize: 13 }}>{tenantsError}</p>}
                  {!tenantsLoading && !tenantsError && (
                    <TenantsTable
                      tenants={tenants}
                      onEdit={openEditTenantModal}
                      onArchive={openArchiveTenantModal}
                      onUnarchive={handleUnarchiveTenant}
                    />
                  )}
                </DataCard>
              </>
            )}
          </div>
        </div>
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
                  <input type="checkbox" id="isActive" checked={outletForm.isActive} onChange={e => setOutletForm({ ...outletForm, isActive: e.target.checked })} accentColor="var(--brand)" />
                  <label htmlFor="isActive" style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>Active Status (visible to customers)</label>
                </div>
              )}

              {outletFormError && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{outletFormError}</p>}

              <div className="flex justify-end gap-3 mt-3">
                <button type="button" onClick={() => setShowOutletModal(false)} style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={outletSubmitting} style={{ background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: outletSubmitting ? 0.7 : 1 }}>
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
                <button type="submit" disabled={userSubmitting} style={{ background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: userSubmitting ? 0.7 : 1 }}>
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
                style={{ background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: roleChanging ? 0.7 : 1 }}
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
                <div><span style={{ fontWeight: 700, color: '#1a1a2e' }}>Reference: </span><span style={{ color: 'var(--brand-2)', fontWeight: 700 }}>{cancelBookingModal.bookingRef}</span></div>
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

      {/* Delete Booking Confirmation Modal (Admin only) */}
      {deleteBookingModal.show && (
        <div style={{ ...modalOverlayStyle, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div style={{ ...modalCardStyle, maxWidth: 460 }}>
            <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#dc2626', fontWeight: 800 }}>Clear Cancelled Booking</h2>
              <button
                onClick={() => setDeleteBookingModal({ show: false, bookingId: null, bookingRef: '', customerName: '', vehicleName: '' })}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}
              >×</button>
            </div>

            <div style={{ margin: '16px 0', fontSize: 14, lineHeight: 1.6, color: '#475467' }}>
              <p style={{ margin: '0 0 14px' }}>Are you sure you want to permanently remove this cancelled booking from records?</p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                <div><span style={{ fontWeight: 700, color: '#1a1a2e' }}>Reference: </span><span style={{ color: 'var(--brand-2)', fontWeight: 700 }}>{deleteBookingModal.bookingRef}</span></div>
                <div><span style={{ fontWeight: 700, color: '#1a1a2e' }}>Customer: </span>{deleteBookingModal.customerName}</div>
                <div><span style={{ fontWeight: 700, color: '#1a1a2e' }}>Vehicle: </span>{deleteBookingModal.vehicleName}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff7f7', border: '1px solid #fee2e2', padding: '12px 16px', borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: 11, display: 'block', color: '#991b1b', marginBottom: 2, fontWeight: 700, textTransform: 'uppercase' }}>Warning</span>
                  <span style={{ fontSize: 13, color: '#b91c1c' }}>This action is irreversible. The booking record will be permanently removed.</span>
                </div>
              </div>
            </div>

            {deleteBookingError && <p style={{ color: '#c53030', fontSize: 13, margin: '0 0 14px' }}>{deleteBookingError}</p>}

            <div className="flex justify-end gap-3 mt-4 pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={() => setDeleteBookingModal({ show: false, bookingId: null, bookingRef: '', customerName: '', vehicleName: '' })}
                style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingBooking}
                onClick={handleConfirmDeleteBooking}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: deletingBooking ? 0.7 : 1 }}
              >
                {deletingBooking ? 'Deleting...' : 'Delete Booking'}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label style={modalLabel}>Variant</label>
                  <input type="text" value={vehicleForm.variant} onChange={e => setVehicleForm({ ...vehicleForm, variant: e.target.value })} placeholder="e.g. GLi" style={modalInput} />
                </div>
                <div>
                  <label style={modalLabel}>Year</label>
                  <input type="number" min="1980" max={new Date().getFullYear() + 1} value={vehicleForm.year} onChange={e => setVehicleForm({ ...vehicleForm, year: e.target.value })} placeholder="e.g. 2023" style={modalInput} />
                </div>
                <div>
                  <label style={modalLabel}>Registration Plate</label>
                  <input
                    type="text"
                    value={vehicleForm.registrationPlate}
                    onChange={e => setVehicleForm({ ...vehicleForm, registrationPlate: formatRegistrationPlate(e.target.value) })}
                    placeholder="e.g. ABC-1234"
                    maxLength={8}
                    required
                    style={{ ...modalInput, borderColor: vehicleFieldErrors.registrationPlate ? '#dc2626' : '#d8e0e5' }}
                  />
                  {vehicleFieldErrors.registrationPlate && <p className="field-error">{vehicleFieldErrors.registrationPlate}</p>}
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
                    style={{ ...modalInput, padding: '8px 10px', borderColor: vehicleFieldErrors.image ? '#dc2626' : '#d8e0e5' }}
                  />
                </div>
                <div>
                  <label style={modalLabel}>Or Enter Image URL</label>
                  <input
                    type="url"
                    value={vehicleForm.imageUrl}
                    onChange={e => setVehicleForm({ ...vehicleForm, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/... or image link"
                    style={{ ...modalInput, borderColor: vehicleFieldErrors.image ? '#dc2626' : '#d8e0e5' }}
                  />
                </div>
              </div>
              {vehicleFieldErrors.image && <p className="field-error">{vehicleFieldErrors.image}</p>}

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
                    border: `2px solid ${vehicleForm.hasAC ? 'var(--brand)' : '#e2e8f0'}`,
                    background: vehicleForm.hasAC ? 'rgba(var(--brand-rgb), 0.04)' : '#fff',
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
                    border: `2px solid ${vehicleForm.hasAC ? 'var(--brand)' : '#cbd5e1'}`,
                    background: vehicleForm.hasAC ? 'var(--brand)' : 'transparent',
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
                    border: `2px solid ${vehicleForm.driverOption ? 'var(--brand)' : '#e2e8f0'}`,
                    background: vehicleForm.driverOption ? 'rgba(var(--brand-rgb), 0.04)' : '#fff',
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
                    border: `2px solid ${vehicleForm.driverOption ? 'var(--brand)' : '#cbd5e1'}`,
                    background: vehicleForm.driverOption ? 'var(--brand)' : 'transparent',
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
                <button type="submit" disabled={vehicleSubmitting} style={{ background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: vehicleSubmitting ? 0.7 : 1 }}>
                  {vehicleSubmitting ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Create / Edit Modal */}
      {showDriverModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e' }}>
                {editingDriver ? 'Edit Driver' : 'Add New Driver'}
              </h2>
              <button onClick={() => setShowDriverModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <form onSubmit={handleSaveDriver} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={modalLabel}>Full Name</label>
                <input
                  type="text"
                  value={driverForm.fullName}
                  onChange={e => updateDriverField('fullName', e.target.value)}
                  placeholder="e.g. Ahmed Khan"
                  required
                  style={{ ...modalInput, borderColor: driverFieldErrors.fullName ? '#dc2626' : '#d8e0e5' }}
                />
                {driverFieldErrors.fullName && <p className="field-error">{driverFieldErrors.fullName}</p>}
              </div>

              <div>
                <label style={modalLabel}>Phone Number</label>
                <input
                  type="tel"
                  value={driverForm.phone}
                  onChange={e => updateDriverField('phone', e.target.value)}
                  placeholder="03001234567"
                  required
                  style={{ ...modalInput, borderColor: driverFieldErrors.phone ? '#dc2626' : '#d8e0e5' }}
                />
                {driverFieldErrors.phone && <p className="field-error">{driverFieldErrors.phone}</p>}
              </div>

              <div>
                <label style={modalLabel}>CNIC</label>
                <input
                  type="text"
                  value={driverForm.cnic}
                  onChange={e => updateDriverField('cnic', formatCnic(e.target.value))}
                  placeholder="12345-1234567-1"
                  inputMode="numeric"
                  maxLength={15}
                  required
                  style={{ ...modalInput, borderColor: driverFieldErrors.cnic ? '#dc2626' : '#d8e0e5' }}
                />
                {driverFieldErrors.cnic && <p className="field-error">{driverFieldErrors.cnic}</p>}
              </div>

              <div>
                <label style={modalLabel}>License Number</label>
                <input
                  type="text"
                  value={driverForm.licenseNumber}
                  onChange={e => updateDriverField('licenseNumber', formatLicenseNumber(e.target.value))}
                  placeholder="e.g. LHR-2024-123456"
                  inputMode="text"
                  maxLength={16}
                  required
                  style={{ ...modalInput, borderColor: driverFieldErrors.licenseNumber ? '#dc2626' : '#d8e0e5' }}
                />
                {driverFieldErrors.licenseNumber && <p className="field-error">{driverFieldErrors.licenseNumber}</p>}
              </div>

              <div>
                <label style={modalLabel}>License Expiry</label>
                <input
                  type="date"
                  value={driverForm.licenseExpiry}
                  onChange={e => updateDriverField('licenseExpiry', e.target.value)}
                  required
                  style={{ ...modalInput, borderColor: driverFieldErrors.licenseExpiry ? '#dc2626' : '#d8e0e5' }}
                />
                {driverFieldErrors.licenseExpiry && <p className="field-error">{driverFieldErrors.licenseExpiry}</p>}
              </div>

              {editingDriver && (
                <div>
                  <label style={modalLabel}>Status</label>
                  <IOSDropdown
                    value={driverForm.status}
                    onChange={e => setDriverForm({ ...driverForm, status: e.target.value })}
                    label="Status"
                    options={['IDLE', 'ASSIGNED', 'INACTIVE']}
                  />
                </div>
              )}

              {driverFormError && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{driverFormError}</p>}

              <div className="flex justify-end gap-3 mt-3">
                <button type="button" onClick={() => setShowDriverModal(false)} style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={driverSubmitting} style={{ background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: driverSubmitting ? 0.7 : 1 }}>
                  {driverSubmitting ? 'Saving...' : 'Save Driver'}
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

      {/* Booking Details Modal — full customer + ride info, useful to review before approving */}
      {viewBookingModal && (
        <BookingDetailsModal
          booking={viewBookingModal}
          currentUser={user}
          onClose={() => setViewBookingModal(null)}
          onAssigned={(updatedBooking) => {
            setViewBookingModal(updatedBooking)
            reloadData()
          }}
        />
      )}

      {/* Approve With-Driver Modal — pick an idle driver as part of approving */}
      {approveDriverModal && (
        <ApproveWithDriverModal
          booking={approveDriverModal}
          onClose={() => setApproveDriverModal(null)}
          onConfirm={handleApproveWithDriver}
        />
      )}

      {/* Tenant Create / Edit Modal */}
      {showTenantModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e' }}>
                {editingTenant ? 'Edit Tenant' : 'Create Tenant'}
              </h2>
              <button onClick={() => setShowTenantModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <form onSubmit={handleSaveTenant} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={modalLabel}>Tenant / Agency Name</label>
                <input type="text" value={tenantForm.name} onChange={e => updateTenantField('name', e.target.value)} placeholder="e.g. Al Rafay Motors" required style={{ ...modalInput, borderColor: tenantFieldErrors.name ? '#dc2626' : '#d8e0e5' }} />
                {tenantFieldErrors.name && <p className="field-error">{tenantFieldErrors.name}</p>}
              </div>

              <div>
                <label style={modalLabel}>Subdomain / Slug</label>
                <input
                  type="text"
                  value={tenantForm.slug}
                  onChange={e => { setTenantSlugTouched(true); updateTenantField('slug', slugifyPreview(e.target.value)) }}
                  placeholder="al-rafay-motors"
                  style={{ ...modalInput, borderColor: tenantFieldErrors.slug ? '#dc2626' : '#d8e0e5' }}
                />
                <p style={{ fontSize: 12, color: '#8b95a1', margin: '4px 0 0' }}>{tenantForm.slug || '...'}.localhost</p>
                {editingTenant && <p style={{ fontSize: 12, color: '#a16207', margin: '4px 0 0' }}>Changing this changes the tenant's live subdomain — old links/bookmarks to {editingTenant.slug}.localhost will stop working.</p>}
                {tenantFieldErrors.slug && <p className="field-error">{tenantFieldErrors.slug}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={modalLabel}>Contact Email</label>
                  <input type="email" value={tenantForm.contactEmail} onChange={e => updateTenantField('contactEmail', e.target.value)} placeholder="contact@agency.com" style={{ ...modalInput, borderColor: tenantFieldErrors.contactEmail ? '#dc2626' : '#d8e0e5' }} />
                  {tenantFieldErrors.contactEmail && <p className="field-error">{tenantFieldErrors.contactEmail}</p>}
                </div>
                <div>
                  <label style={modalLabel}>Contact Phone</label>
                  <input type="tel" value={tenantForm.contactPhone} onChange={e => updateTenantField('contactPhone', e.target.value)} placeholder="03001234567" style={{ ...modalInput, borderColor: tenantFieldErrors.contactPhone ? '#dc2626' : '#d8e0e5' }} />
                  {tenantFieldErrors.contactPhone && <p className="field-error">{tenantFieldErrors.contactPhone}</p>}
                </div>
              </div>

              <div>
                <label style={modalLabel}>Logo URL</label>
                <input type="url" value={tenantForm.logoUrl} onChange={e => updateTenantField('logoUrl', e.target.value)} placeholder="https://... (optional)" style={{ ...modalInput, borderColor: tenantFieldErrors.logoUrl ? '#dc2626' : '#d8e0e5' }} />
                {tenantFieldErrors.logoUrl && <p className="field-error">{tenantFieldErrors.logoUrl}</p>}
              </div>

              {!editingTenant && (
                <>
                  <div style={{ borderTop: '1px solid #eef1f4', paddingTop: 14, marginTop: 4 }}>
                    <p style={{ ...modalLabel, marginBottom: 12 }}>Initial Admin Account</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={modalLabel}>Admin Full Name</label>
                      <input type="text" value={tenantForm.adminFullName} onChange={e => updateTenantField('adminFullName', e.target.value)} required style={{ ...modalInput, borderColor: tenantFieldErrors.adminFullName ? '#dc2626' : '#d8e0e5' }} />
                      {tenantFieldErrors.adminFullName && <p className="field-error">{tenantFieldErrors.adminFullName}</p>}
                    </div>
                    <div>
                      <label style={modalLabel}>Admin Phone</label>
                      <input type="tel" value={tenantForm.adminPhone} onChange={e => updateTenantField('adminPhone', e.target.value)} placeholder="03001234567" style={{ ...modalInput, borderColor: tenantFieldErrors.adminPhone ? '#dc2626' : '#d8e0e5' }} />
                      {tenantFieldErrors.adminPhone && <p className="field-error">{tenantFieldErrors.adminPhone}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label style={modalLabel}>Admin Email</label>
                      <input type="email" value={tenantForm.adminEmail} onChange={e => updateTenantField('adminEmail', e.target.value)} required style={{ ...modalInput, borderColor: tenantFieldErrors.adminEmail ? '#dc2626' : '#d8e0e5' }} />
                      {tenantFieldErrors.adminEmail && <p className="field-error">{tenantFieldErrors.adminEmail}</p>}
                    </div>
                    <div>
                      <label style={modalLabel}>Admin Password</label>
                      <input type="password" value={tenantForm.adminPassword} onChange={e => updateTenantField('adminPassword', e.target.value)} required style={{ ...modalInput, borderColor: tenantFieldErrors.adminPassword ? '#dc2626' : '#d8e0e5' }} />
                      {tenantFieldErrors.adminPassword && <p className="field-error">{tenantFieldErrors.adminPassword}</p>}
                    </div>
                  </div>
                </>
              )}

              {tenantFormError && <p style={{ color: '#c53030', fontSize: 13, margin: 0 }}>{tenantFormError}</p>}

              <div className="flex justify-end gap-3 mt-3">
                <button type="button" onClick={() => setShowTenantModal(false)} style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={tenantSubmitting} style={{ background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: tenantSubmitting ? 0.7 : 1 }}>
                  {tenantSubmitting ? 'Saving...' : editingTenant ? 'Save Changes' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Tenant Modal — GitHub-style type-to-confirm */}
      {archiveTenantModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ margin: 0, fontSize: 18, color: '#dc2626' }}>Archive Tenant</h2>
              <button onClick={() => setArchiveTenantModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
            </div>

            <p style={{ fontSize: 14, color: '#444', margin: '0 0 16px' }}>
              Archiving <strong>{archiveTenantModal.clientName}</strong> immediately blocks all sign-ins and requests on <strong>{archiveTenantModal.slug}.localhost</strong>. The database itself is not touched or deleted — you can unarchive later.
            </p>

            <label style={modalLabel}>
              Type <strong>{archiveTenantModal.clientName}</strong> to confirm
            </label>
            <input
              type="text"
              value={archiveConfirmInput}
              onChange={e => setArchiveConfirmInput(e.target.value)}
              style={modalInput}
              autoFocus
            />

            {archiveError && <p style={{ color: '#c53030', fontSize: 13, margin: '10px 0 0' }}>{archiveError}</p>}

            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setArchiveTenantModal(null)} style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={archiveSubmitting || archiveConfirmInput !== archiveTenantModal.clientName}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: (archiveSubmitting || archiveConfirmInput !== archiveTenantModal.clientName) ? 0.5 : 1 }}
              >
                {archiveSubmitting ? 'Archiving...' : 'Archive Tenant'}
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
      background: highlight ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)' : '#fff',
      borderRadius: 14,
      padding: '22px 24px',
      minHeight: 118,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: highlight ? '0 4px 16px rgba(var(--brand-rgb), .25)' : '0 2px 10px rgba(0,0,0,.05)',
    }}>
      <p style={{ margin: '0 0 10px', color: highlight ? 'rgba(255,255,255,0.8)' : '#8b95a1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>{statLabel}</p>
      <p style={{ margin: 0, fontSize: 26, color: highlight ? '#fff' : '#1a1a2e', fontWeight: 800, lineHeight: 1.2 }}>{value}</p>
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

const DRIVER_STATUS_LABELS = { IDLE: 'Available', ASSIGNED: 'Assigned', INACTIVE: 'Inactive' }

function Badge({ value, labels }) {
  const [background, color] = STATUS_COLORS[value] || ['#f3f4f6', '#555']
  return (
    <span style={{ background, color, fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {labels?.[value] || label(value)}
    </span>
  )
}

function BookingsTable({ bookings, currentUser, onStatusChange, onApprove, onCancelBooking, onDeleteBooking, onViewDetails }) {
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
                <td style={td}><strong style={{ color: 'var(--brand-2)' }}>{booking.bookingReference}</strong></td>
                <td style={td}>{booking.customer?.fullName || '—'}<small style={small}>{booking.customer?.phone || ''}</small></td>
                <td style={td}>{booking.vehiclePackage?.make} {booking.vehiclePackage?.model}</td>
                <td style={td}>
                  <span style={{ background: 'rgba(var(--brand-2-rgb), 0.12)', color: 'var(--brand-2)', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
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
                      <button
                        onClick={() => onViewDetails(booking)}
                        style={{
                          background: '#eef2ff',
                          color: '#3730a3',
                          border: '1px solid #c7d2fe',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        View Details
                      </button>
                      {booking.status === 'PENDING' && (
                        <button
                          onClick={() => onApprove(booking)}
                          style={{
                            background: 'var(--brand)',
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
                        <>
                          <button
                            onClick={() => onStatusChange(booking, 'COMPLETED')}
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Complete
                          </button>
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
                        </>
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
                      {booking.status === 'CANCELLED' && currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={() => onDeleteBooking && onDeleteBooking(booking)}
                          style={{
                            background: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #fee2e2',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Clear
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

function ApproveWithDriverModal({ booking, onClose, onConfirm }) {
  const alreadyAssigned = !!booking.driverId
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(!alreadyAssigned)
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (alreadyAssigned) return
    apiFetch('/drivers?status=IDLE')
      .then(list => {
        setDrivers(list)
        if (list.length > 0) setSelectedDriverId(String(list[0].id))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleConfirm() {
    setSubmitting(true)
    setError('')
    try {
      await onConfirm(booking, alreadyAssigned ? null : Number(selectedDriverId))
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div style={modalOverlayStyle}>
      <div style={modalCardStyle}>
        <div className="flex justify-between items-center mb-4">
          <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e' }}>Approve With-Driver Booking</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
          Booking <strong style={{ color: 'var(--brand-2)' }}>{booking.bookingReference}</strong> is a With-Driver booking and needs a driver assigned as part of approval.
        </p>

        {loading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Checking idle drivers…</p>
        ) : alreadyAssigned ? (
          <p style={{ fontSize: 14, color: '#444', margin: '0 0 16px' }}>
            Driver <strong>{booking.driver?.fullName}</strong> is already assigned to this booking. Approve now?
          </p>
        ) : drivers.length === 0 ? (
          <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', margin: '0 0 4px' }}>
            No driver is currently available (Idle). This booking can't be approved until a driver becomes available.
          </p>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <label style={modalLabel}>Assign Idle Driver</label>
            <IOSDropdown
              value={selectedDriverId}
              onChange={e => setSelectedDriverId(e.target.value)}
              label="Driver"
              options={drivers.map(d => ({ value: String(d.id), label: `${d.fullName} (${formatPhone(d.phone)})` }))}
            />
          </div>
        )}

        {error && <p style={{ color: '#c53030', fontSize: 13, margin: '0 0 4px' }}>{error}</p>}

        <div className="flex justify-end gap-3 mt-3">
          <button type="button" onClick={onClose} style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          {!loading && (alreadyAssigned || drivers.length > 0) && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || (!alreadyAssigned && !selectedDriverId)}
              style={{ background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Approving...' : 'Approve & Assign'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label: rowLabel, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderBottom: '1px solid #f1f3f5' }}>
      <span style={{ color: '#8b95a1', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{rowLabel}</span>
      <span style={{ color: '#1a1a2e', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function DetailSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: 'var(--brand-2)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</h3>
      <div>{children}</div>
    </div>
  )
}

function BookingDetailsModal({ booking, currentUser, onClose, onAssigned }) {
  const vehicle = booking.vehiclePackage
  const customer = booking.customer
  const scrollRef = useRef(null)
  const footerRef = useRef(null)
  const [showScrollFade, setShowScrollFade] = useState(false)
  const [footerHeight, setFooterHeight] = useState(60)
  const [statusBg, statusColor] = STATUS_COLORS[booking.status] || ['#f3f4f6', '#555']

  const canManageDriver = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE'].includes(currentUser?.role)
  const canAssignDriver = booking.rentalMode === 'WITH_DRIVER' && canManageDriver && !['CANCELLED', 'COMPLETED'].includes(booking.status)
  const [currentDriver, setCurrentDriver] = useState(booking.driver || null)
  const [availableDrivers, setAvailableDrivers] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')

  useEffect(() => {
    setCurrentDriver(booking.driver || null)
    if (!canAssignDriver) return
    apiFetch('/drivers?status=IDLE')
      .then(setAvailableDrivers)
      .catch(() => setAvailableDrivers([]))
  }, [booking.id])

  async function handleAssignDriver() {
    if (!selectedDriverId) return
    setAssigning(true)
    setAssignError('')
    try {
      const updated = await apiFetch(`/bookings/${booking.id}/assign-driver`, {
        method: 'PUT',
        body: JSON.stringify({ driverId: Number(selectedDriverId) }),
      })
      setCurrentDriver(updated.driver)
      setSelectedDriverId('')
      onAssigned?.(updated)
    } catch (err) {
      setAssignError(err.message)
    } finally {
      setAssigning(false)
    }
  }

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setShowScrollFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }

  useEffect(() => {
    checkScroll()
    if (footerRef.current) setFooterHeight(footerRef.current.offsetHeight)
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return createPortal(
    <div style={{ ...modalOverlayStyle, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
      <div style={{ ...modalCardStyle, maxWidth: 560, maxHeight: '85vh', padding: 0, position: 'relative', overflow: 'hidden' }}>

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          style={{ maxHeight: '85vh', overflowY: 'auto' }}
        >
          <div style={{ position: 'sticky', top: 0, zIndex: 2, background: '#fff' }}>
            <div className="flex justify-between items-center" style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1a1a2e', fontWeight: 800 }}>Booking Details</h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#8b95a1' }}>{booking.bookingReference}</p>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}
              >×</button>
            </div>

            <div style={{ display: 'flex', gap: 12, padding: '14px 24px', background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ flex: 1, background: statusBg, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.85 }}>Status</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: statusColor, marginTop: 2 }}>{label(booking.status)}</div>
              </div>
              <div style={{ flex: 1, background: '#eef2ff', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-2)', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.85 }}>Total</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--brand-2)', marginTop: 2 }}>Rs {getBookingTotal(booking)}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 24px', paddingBottom: footerHeight + 16 }}>
            <div style={{ fontSize: 12, color: '#8b95a1', marginBottom: 14 }}>Booked on {dateTime(booking.createdAt)}</div>

            <DetailSection title="Customer">
              <DetailRow label="Full Name" value={customer?.fullName} />
              <DetailRow label="Email" value={customer?.email} />
              <DetailRow label="Phone" value={customer?.phone ? formatPhone(customer.phone) : null} />
              <DetailRow label="CNIC" value={customer?.cnic ? formatCnic(customer.cnic) : 'Not provided'} />
            </DetailSection>

            <DetailSection title="Ride">
              <DetailRow label="Rental Mode" value={booking.rentalMode === 'WITH_DRIVER' ? 'With-Driver' : 'Self-Drive'} />
              <DetailRow label="Pickup" value={dateTime(booking.pickupDateTime)} />
              <DetailRow label="Return" value={dateTime(booking.returnDateTime)} />
              <DetailRow label="Duration" value={`${getBookingDays(booking)} day${getBookingDays(booking) === 1 ? '' : 's'}`} />
              {booking.rentalMode === 'WITH_DRIVER' ? (
                <>
                  <DetailRow label="Pickup Address" value={booking.pickupAddress} />
                  <DetailRow label="Dropoff Address" value={booking.dropoffAddress || 'Same as pickup'} />
                </>
              ) : (
                <DetailRow label="Outlet" value={booking.outlet ? `${booking.outlet.name}, ${booking.outlet.city}` : '—'} />
              )}
            </DetailSection>

            {booking.rentalMode === 'WITH_DRIVER' && (
              <DetailSection title="Driver">
                <DetailRow
                  label="Assigned Driver"
                  value={currentDriver ? `${currentDriver.fullName} (${formatPhone(currentDriver.phone)})` : 'Not assigned yet'}
                />
                {canAssignDriver && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <IOSDropdown
                        value={selectedDriverId}
                        onChange={e => setSelectedDriverId(e.target.value)}
                        label="Available Drivers"
                        options={[
                          { value: '', label: availableDrivers.length ? 'Select a driver…' : 'No drivers available for this slot' },
                          ...availableDrivers.map(d => ({ value: String(d.id), label: `${d.fullName} — ${formatPhone(d.phone)}` })),
                        ]}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAssignDriver}
                      disabled={!selectedDriverId || assigning}
                      style={{
                        background: 'var(--brand)', color: 'var(--surface)', border: 'none', borderRadius: 8,
                        padding: '11px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        opacity: (!selectedDriverId || assigning) ? 0.6 : 1, whiteSpace: 'nowrap',
                      }}
                    >
                      {assigning ? 'Assigning…' : currentDriver ? 'Reassign' : 'Assign'}
                    </button>
                  </div>
                )}
                {assignError && <p style={{ color: '#c53030', fontSize: 12, margin: '8px 0 0' }}>{assignError}</p>}
              </DetailSection>
            )}

            <DetailSection title="Vehicle">
              <DetailRow label="Make & Model" value={`${vehicle?.make || ''} ${vehicle?.model || ''}`.trim()} />
              <DetailRow label="Variant" value={vehicle?.variant} />
              <DetailRow label="Year" value={vehicle?.year} />
              <DetailRow label="Registration Plate" value={vehicle?.registrationPlate} />
              <DetailRow label="Category" value={vehicle?.category} />
              <DetailRow label="Seating Capacity" value={vehicle?.seatingCapacity} />
              <DetailRow label="Transmission" value={vehicle?.transmission ? label(vehicle.transmission) : null} />
              <DetailRow label="Air Conditioning" value={vehicle?.hasAC ? 'Yes' : 'No'} />
              <DetailRow label="Driver Option" value={vehicle?.driverOption ? 'Available' : 'Not available'} />
              <DetailRow label="Route" value={vehicle ? `${vehicle.pickupCity} → ${vehicle.dropoffCity}` : null} />
              <DetailRow label="Price / Day" value={vehicle ? `Rs ${vehicle.pricePerDay}` : null} />
            </DetailSection>

            <DetailSection title="Payment">
              <DetailRow label="Method" value={booking.paymentMethod ? label(booking.paymentMethod) : null} />
              <DetailRow label="Reference" value={booking.paymentReference || 'Not provided'} />
            </DetailSection>
          </div>
        </div>

        {showScrollFade && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: footerHeight, height: 30,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.95))',
            pointerEvents: 'none',
          }} />
        )}

        <div
          ref={footerRef}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            display: 'flex', justifyContent: 'flex-end', padding: '14px 24px',
            borderTop: '1px solid #e5e7eb', background: '#fff',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function VehiclesTable({ vehicles, currentUser, onEdit, onDelete }) {
  const canManage = ['SUPERADMIN', 'ADMIN'].includes(currentUser?.role)

  if (!vehicles.length) {
    return <p style={{ textAlign: 'center', color: '#8b95a1', padding: '24px 0', margin: 0 }}>No vehicles yet.</p>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
      {vehicles.map(vehicle => {
        const canDelete = vehicle.status === 'AVAILABLE'
        const image = vehicle.imageUrls?.[0]

        return (
          <article key={vehicle.id} style={{
            background: '#fff',
            border: '1px solid #eef0f2',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,.05)',
          }}>
            <div style={{ height: 150, background: '#dce8e4', position: 'relative' }}>
              {image ? (
                <img src={image} alt={`${vehicle.make} ${vehicle.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#527064', fontSize: 12, fontWeight: 700 }}>
                  No image
                </div>
              )}
              <span style={{ position: 'absolute', top: 10, left: 10, background: '#1a1a2e', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>
                {label(vehicle.category)}
              </span>
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <Badge value={vehicle.status} />
              </div>
            </div>

            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 15, color: '#1a1a2e' }}>
                  {vehicle.make} {vehicle.model}{vehicle.variant ? ` ${vehicle.variant}` : ''}{vehicle.year ? ` (${vehicle.year})` : ''}
                </strong>
                <strong style={{ color: 'var(--brand-2)', fontSize: 13, whiteSpace: 'nowrap' }}>Rs {vehicle.pricePerDay.toLocaleString()}/day</strong>
              </div>

              <p style={{ margin: '4px 0 0', color: '#98a2b3', fontSize: 12 }}>
                {vehicle.pickupCity} → {vehicle.dropoffCity}{vehicle.registrationPlate ? ` · ${vehicle.registrationPlate}` : ''}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 12px' }}>
                {[
                  `${vehicle.seatingCapacity} seats`,
                  vehicle.transmission.toLowerCase(),
                  vehicle.hasAC ? 'A/C' : 'No A/C',
                  vehicle.driverOption ? 'With driver option' : 'Self drive only',
                ].map(tag => (
                  <span key={tag} style={{ background: '#f5f7fa', color: '#555', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
              </div>

              {canManage && (
                <div style={{ display: 'flex', gap: 6, borderTop: '1px solid #f1f3f5', paddingTop: 10 }}>
                  <button
                    onClick={() => onEdit(vehicle)}
                    style={{ flex: 1, background: '#f3f4f6', color: '#333', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  {canDelete ? (
                    <button
                      onClick={() => onDelete(vehicle.id, `${vehicle.make} ${vehicle.model}`)}
                      style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  ) : (
                    <span style={{ flex: 1, textAlign: 'center', color: '#98a2b3', fontSize: 12, alignSelf: 'center' }}>Can't delete (booked)</span>
                  )}
                </div>
              )}
            </div>
          </article>
        )
      })}
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
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${outlet.latitude},${outlet.longitude}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-2)', textDecoration: 'underline' }}>
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

function DriversTable({ drivers, currentUser, onEdit, onDelete }) {
  const canDelete = ['SUPERADMIN', 'ADMIN'].includes(currentUser?.role)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Name', 'Phone', 'CNIC', 'License', 'License Expiry', 'Status', 'Registered', 'Actions'].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drivers.length ? drivers.map(driver => (
            <tr key={driver.id} style={{ borderTop: '1px solid #f1f3f5' }}>
              <td style={td}><strong>{driver.fullName}</strong></td>
              <td style={td}>{formatPhone(driver.phone)}</td>
              <td style={td}>{driver.cnic}</td>
              <td style={td}>{driver.licenseNumber}</td>
              <td style={td}>{driver.licenseExpiry ? date(driver.licenseExpiry) : '—'}</td>
              <td style={td}><Badge value={driver.status} labels={DRIVER_STATUS_LABELS} /></td>
              <td style={td}>{date(driver.createdAt)}</td>
              <td style={td}>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(driver)} style={{ background: '#f3f4f6', color: '#333', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                  {canDelete && (
                    <button onClick={() => onDelete(driver.id, driver.fullName)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="8" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No drivers added yet. Click "+ Add Driver" to create one.</td></tr>
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

// Resolves which tenant slug the current subdomain maps to, mirroring the
// backend's resolveTenantSlug (tenantResolver.js) — first hostname label,
// falling back to 'default' for a bare/plain host.
function currentTenantSlugFromHostname() {
  if (typeof window === 'undefined') return 'default'
  const firstLabel = window.location.hostname.split('.')[0]
  if (!firstLabel || firstLabel === 'localhost' || firstLabel === 'www') return 'default'
  return firstLabel
}

function CurrentAgencyCard({ tenants }) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const currentSlug = currentTenantSlugFromHostname()
  const currentTenant = tenants.find(t => t.slug === currentSlug)

  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 20, marginBottom: 20,
      border: '1.5px solid rgba(var(--brand-rgb), 0.35)',
      borderLeft: '5px solid var(--brand)',
      boxShadow: '0 2px 10px rgba(0,0,0,.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
    }}>
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: 'var(--brand-2)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Current Agency
        </p>
        {currentTenant ? (
          <>
            <h3 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 900, color: '#0f172a' }}>{currentTenant.clientName}</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{currentTenant.slug}.localhost</p>
          </>
        ) : (
          <>
            <h3 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 900, color: '#0f172a' }}>{hostname || 'Unknown'}</h3>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Not found in the tenant list below.</p>
          </>
        )}
      </div>

      {currentTenant && <Badge value={currentTenant.status} />}

      <p
        title="This list is the same regardless of which tenant subdomain you're viewing it from."
        style={{ width: '100%', margin: '10px 0 0', fontSize: 11, color: '#94a3b8', cursor: 'help' }}
      >
        ⓘ The tenant list below doesn't change based on which agency you're currently browsing.
      </p>
    </div>
  )
}

function TenantsTable({ tenants, onEdit, onArchive, onUnarchive }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Name', 'Subdomain', 'Status', 'Created', 'Actions'].map(heading => (
              <th key={heading} style={th}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tenants.length ? tenants.map(t => (
            <tr key={t.slug} style={{ borderTop: '1px solid #f1f3f5' }}>
              <td style={td}><strong>{t.clientName}</strong></td>
              <td style={td}>{t.slug}.localhost</td>
              <td style={td}><Badge value={t.status} /></td>
              <td style={td}>{date(t.createdAt)}</td>
              <td style={td}>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(t)} style={{ background: '#f3f4f6', color: '#333', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                  {t.status === 'ARCHIVED' ? (
                    <button onClick={() => onUnarchive(t)} style={{ background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Unarchive</button>
                  ) : (
                    t.slug !== 'default' && (
                      <button onClick={() => onArchive(t)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Archive</button>
                    )
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="5" style={{ ...td, textAlign: 'center', color: '#8b95a1' }}>No tenants yet. Click "+ Create Tenant" to add one.</td></tr>
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