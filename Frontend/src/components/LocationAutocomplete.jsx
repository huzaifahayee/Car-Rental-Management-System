import { useEffect, useRef, useState } from 'react'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let scriptLoadingPromise = null

function loadGoogleMapsScript(apiKey) {
  if (window.google?.maps?.places) {
    return Promise.resolve(window.google.maps)
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  if (!apiKey || apiKey === 'your_google_maps_api_key') {
    return Promise.reject(new Error('No valid Google Maps API Key'))
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-js-sdk')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps))
      existingScript.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.id = 'google-maps-js-sdk'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google.maps)
    script.onerror = (err) => reject(err)
    document.head.appendChild(script)
  })

  return scriptLoadingPromise
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelectLocation,
  placeholder = 'Enter address or area',
  style,
  inputStyle,
}) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (!GOOGLE_MAPS_KEY || GOOGLE_MAPS_KEY === 'your_google_maps_api_key') {
      return
    }

    loadGoogleMapsScript(GOOGLE_MAPS_KEY)
      .then(() => {
        if (isMounted) setMapsLoaded(true)
      })
      .catch((err) => {
        console.warn('Google Maps JS SDK failed to load:', err.message)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!mapsLoaded || !inputRef.current || autocompleteRef.current) return

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'pk' }, // Pakistan focus by default
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const formattedAddress = place.formatted_address || place.name || inputRef.current.value

          if (onSelectLocation) {
            onSelectLocation({
              address: formattedAddress,
              lat,
              lng,
            })
          }
          if (onChange) {
            onChange(formattedAddress)
          }
        }
      })

      autocompleteRef.current = autocomplete
    } catch (err) {
      console.warn('Failed to initialize Places Autocomplete:', err.message)
    }
  }, [mapsLoaded, onChange, onSelectLocation])

  return (
    <div style={style || { width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value || ''}
        onChange={(e) => {
          if (onChange) onChange(e.target.value)
        }}
        placeholder={placeholder}
        style={
          inputStyle || {
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: 14,
            color: '#333',
            background: 'transparent',
          }
        }
      />
    </div>
  )
}
