import { useEffect, useRef, useState, useCallback } from 'react'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelectLocation,
  placeholder = 'Enter address or area',
  style,
  inputStyle,
  cityOnly = false,
}) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const debouncedQuery = useDebounce(query, 350)

  // Sync external value changes
  useEffect(() => {
    if (value !== undefined && value !== query) {
      setQuery(value)
    }
  }, [value])

  // Fetch from Nominatim when debounced query changes
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    if (trimmed.length < 3) {
      setResults([])
      setOpen(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams({
      q: trimmed,
      format: 'json',
      countrycodes: 'pk',
      addressdetails: '1',
      limit: '6',
    })

    fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'GariTrip/1.0' },
    })
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setResults(data)
          setOpen(data.length > 0)
        }
      })
      .catch(() => {
        if (!cancelled) setResults([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(place) {
    const address = place.display_name
    const lat = parseFloat(place.lat)
    const lng = parseFloat(place.lon)
    const a = place.address || {}
    const city = a.city || a.town || a.village || a.county || a.state || ''

    const displayValue = cityOnly && city ? city : address
    setQuery(displayValue)
    setOpen(false)
    setResults([])

    if (onChange) onChange(displayValue)
    if (onSelectLocation) onSelectLocation({ address, lat, lng, city, rawPlace: place })
  }

  function handleInputChange(e) {
    const text = e.target.value
    setQuery(text)
    if (onChange) onChange(text)
    if (text.trim().length < 3) {
      setResults([])
      setOpen(false)
    }
  }

  // Format a readable short label from Nominatim result
  function shortLabel(place) {
    const a = place.address || {}
    const parts = [
      a.road || a.pedestrian || a.neighbourhood || a.suburb,
      a.city || a.town || a.village || a.county,
      a.state,
    ].filter(Boolean)
    return parts.join(', ') || place.display_name
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...(style || {}) }}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle || {
          border: 'none',
          outline: 'none',
          width: '100%',
          fontSize: 14,
          color: '#333',
          background: 'transparent',
        }}
      />

      {loading && (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--brand)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
              <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="0.8s" repeatCount="indefinite"/>
            </path>
          </svg>
        </div>
      )}

      {open && results.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1.5px solid #e0e0e0',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 9999,
          margin: 0,
          padding: '4px 0',
          listStyle: 'none',
          maxHeight: 260,
          overflowY: 'auto',
        }}>
          {results.map((place, i) => (
            <li
              key={place.place_id || i}
              onMouseDown={() => handleSelect(place)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: 13,
                lineHeight: 1.4,
                borderBottom: i < results.length - 1 ? '1px solid #f5f5f5' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0fdf7'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{shortLabel(place)}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                📍 {place.display_name}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
