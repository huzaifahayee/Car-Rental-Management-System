import { useState, useRef, useEffect } from 'react'

export default function IOSDropdown({ value, onChange, options, label, style = {}, menuStyle = {}, placement = 'bottom' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const menuRef = useRef(null)

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'string') return { value: opt, label: opt }
    return opt
  })

  const selectedOpt = normalizedOptions.find(opt => opt.value === value)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Smoothly scroll the dropdown menu into view when it opens
  useEffect(() => {
    if (isOpen && menuRef.current) {
      setTimeout(() => {
        menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [isOpen])

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'block', width: '100%', minWidth: 0, ...style }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
          background: '#fff',
          color: '#1a1a2e',
          border: '1.5px solid #d0d5dd',
          borderRadius: '10px',
          padding: '11px 16px',
          fontSize: '14px',
          fontWeight: 600,
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          outline: 'none',
          gap: 8,
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(0,196,114,0.15)' : 'none',
          borderColor: isOpen ? '#00c472' : '#d0d5dd',
        }}
      >
        <span style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {selectedOpt ? selectedOpt.label : 'Select...'}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }}
        >
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            zIndex: 1000,
            left: 0,
            right: 0,
            background: '#fff',
            border: '1.5px solid #e8e8e8',
            borderRadius: '20px',
            boxShadow: '0 10px 32px rgba(26,26,46,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            padding: '10px 8px',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            maxHeight: '260px',
            overflowY: 'auto',
            ...(placement === 'top' ? { bottom: 'calc(100% + 8px)', marginTop: 0 } : {}),
            ...menuStyle,
          }}
        >
          {label && (
            <div style={{
              textAlign: 'center',
              color: '#888',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              padding: '6px 0 10px',
              userSelect: 'none',
              borderBottom: '1px solid #f0f0f0',
              marginBottom: '6px',
            }}>
              {label}
            </div>
          )}

          {normalizedOptions.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange({ target: { value: opt.value } })
                  setIsOpen(false)
                }}
                style={{
                  background: isSelected ? 'rgba(0,196,114,0.08)' : 'transparent',
                  color: isSelected ? '#00a85e' : '#1a1a2e',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  outline: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = '#f5f7fa'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.label}
                </span>
                {isSelected && (
                  <span style={{ color: '#00c472', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
