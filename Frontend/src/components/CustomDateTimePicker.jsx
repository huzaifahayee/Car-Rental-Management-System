import React, { useState, useEffect, useRef } from 'react'

export default function CustomDateTimePicker({ value, onChange, min, label = 'Select Date & Time', style }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Parse current value, or fallback to min, or default to today
  const parseVal = (valStr, minStr) => {
    if (valStr) {
      const d = new Date(valStr)
      if (!isNaN(d.getTime())) return d
    }
    if (minStr) {
      const m = new Date(minStr)
      if (!isNaN(m.getTime())) return m
    }
    return new Date()
  }

  const [tempDate, setTempDate] = useState(() => parseVal(value, min))
  const [viewMonth, setViewMonth] = useState(() => tempDate.getMonth())
  const [viewYear, setViewYear] = useState(() => tempDate.getFullYear())

  // Keep state synced with outer value or min constraint
  useEffect(() => {
    const d = parseVal(value, min)
    setTempDate(d)
    setViewMonth(d.getMonth())
    setViewYear(d.getFullYear())
  }, [value, min])

  const popupRef = useRef(null)

  // When calendar opens, ensure view Month & Year align with current value or min date
  const handleToggleOpen = () => {
    const nextOpen = !isOpen
    if (nextOpen) {
      const d = parseVal(value, min)
      setTempDate(d)
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
    }
    setIsOpen(nextOpen)
  }

  // Close on outside click & Auto smooth-scroll into view when opened
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      if (popupRef.current) {
        setTimeout(() => {
          popupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 50)
      }
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Format date to datetime-local string format (YYYY-MM-DDTHH:mm)
  const formatToISOString = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Format readable display text
  const getDisplayText = () => {
    if (!value) return 'Select Date & Time...'
    const d = new Date(value)
    if (isNaN(d.getTime())) return 'Select Date & Time...'
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const handleDateSelect = (day) => {
    const next = new Date(tempDate)
    next.setFullYear(viewYear)
    next.setMonth(viewMonth)
    next.setDate(day)
    setTempDate(next)
  }

  const handleTimeChange = (type, val) => {
    const next = new Date(tempDate)
    if (type === 'hour') {
      let h = parseInt(val, 10)
      const currentIsPM = next.getHours() >= 12
      if (currentIsPM && h < 12) h += 12
      if (!currentIsPM && h === 12) h = 0
      next.setHours(h)
    } else if (type === 'minute') {
      next.setMinutes(parseInt(val, 10))
    } else if (type === 'ampm') {
      let h = next.getHours()
      if (val === 'AM' && h >= 12) next.setHours(h - 12)
      if (val === 'PM' && h < 12) next.setHours(h + 12)
    }
    setTempDate(next)
  }

  const handleSave = () => {
    const iso = formatToISOString(tempDate)
    onChange(iso)
    setIsOpen(false)
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const hour12 = tempDate.getHours() % 12 || 12
  const ampm = tempDate.getHours() >= 12 ? 'PM' : 'AM'
  const currentMinutes = Math.floor(tempDate.getMinutes() / 5) * 5

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      <button
        type="button"
        onClick={handleToggleOpen}
        style={{
          width: '100%',
          textAlign: 'left',
          background: '#fff',
          border: isOpen ? '2px solid #00c472' : '1.5px solid #d0d5dd',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 14,
          color: value ? '#1a1a2e' : '#667085',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: isOpen ? '0 0 0 4px rgba(0, 196, 114, 0.15)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <span>{getDisplayText()}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00c472" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 9999,
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
            border: '1px solid #e4e7ec',
            padding: 16,
            width: 320,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header Month / Year Navigation */}
          {(() => {
            const minBoundary = min ? new Date(min) : new Date()
            const isPrevDisabled = (viewYear < minBoundary.getFullYear()) ||
              (viewYear === minBoundary.getFullYear() && viewMonth <= minBoundary.getMonth())

            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <button
                  type="button"
                  disabled={isPrevDisabled}
                  onClick={() => {
                    if (isPrevDisabled) return
                    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
                    else { setViewMonth(m => m - 1) }
                  }}
                  style={{
                    background: isPrevDisabled ? '#f9fafb' : '#f2f4f7',
                    border: 'none',
                    borderRadius: 8,
                    width: 32,
                    height: 32,
                    cursor: isPrevDisabled ? 'not-allowed' : 'pointer',
                    opacity: isPrevDisabled ? 0.3 : 1,
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#344054',
                  }}
                >
                  ‹
                </button>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#101828' }}>
                  {months[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
                    else { setViewMonth(m => m + 1) }
                  }}
                  style={{ background: '#f2f4f7', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#344054' }}
                >
                  ›
                </button>
              </div>
            )
          })()}

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 12 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} style={{ fontSize: 11, fontWeight: 700, color: '#98a2b3', padding: '4px 0' }}>{d}</span>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const thisDate = new Date(viewYear, viewMonth, dayNum, 23, 59, 59)
              const now = min ? new Date(min) : new Date()
              // Strip time for day comparison
              const minDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
              const isPast = thisDate < minDay
              const isSelected = tempDate.getDate() === dayNum && tempDate.getMonth() === viewMonth && tempDate.getFullYear() === viewYear

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={isPast}
                  onClick={() => !isPast && handleDateSelect(dayNum)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    height: 32,
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? '#00c472' : 'transparent',
                    color: isPast ? '#d0d5dd' : (isSelected ? '#fff' : '#1d2939'),
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    opacity: isPast ? 0.4 : 1,
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={e => { if (!isSelected && !isPast) e.currentTarget.style.background = '#f2f4f7' }}
                  onMouseLeave={e => { if (!isSelected && !isPast) e.currentTarget.style.background = 'transparent' }}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>

          {/* Time Picker Controls */}
          <div style={{ borderTop: '1px solid #eaecf0', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#667085' }}>Time:</span>
            <select
              value={hour12}
              onChange={e => handleTimeChange('hour', e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13, fontWeight: 600, background: '#f9fafb' }}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const h = i + 1
                return <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
              })}
            </select>
            <span style={{ fontWeight: 700, color: '#667085' }}>:</span>
            <select
              value={currentMinutes}
              onChange={e => handleTimeChange('minute', e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13, fontWeight: 600, background: '#f9fafb' }}
            >
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <select
              value={ampm}
              onChange={e => handleTimeChange('ampm', e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13, fontWeight: 600, background: '#f9fafb' }}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          {/* Explicit Save / OK Action Buttons */}
          <div style={{ borderTop: '1px solid #eaecf0', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: '#f2f4f7',
                color: '#344054',
                border: 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: '#00c472',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 196, 114, 0.2)',
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
