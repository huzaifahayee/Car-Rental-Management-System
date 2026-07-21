/**
 * Server-side geocoding utility using Google Geocoding REST API.
 *
 * Used in the With-Driver booking flow to verify that a customer-submitted
 * address actually resolves to valid coordinates before we persist the booking.
 *
 * Requires GOOGLE_GEOCODING_API_KEY in process.env.
 */

const GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

/**
 * Forward-geocode an address string to coordinates.
 *
 * @param {string} address - Human-readable address (e.g. "123 Main St, Lahore")
 * @returns {Promise<{ lat: number, lng: number, formattedAddress: string } | null>}
 *   Resolved location or null if the address could not be geocoded.
 * @throws {Error} If the API key is missing or the HTTP request itself fails.
 */
async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY
  if (!apiKey || apiKey === 'your_google_geocoding_api_key') {
    throw new Error(
      'GOOGLE_GEOCODING_API_KEY is not configured. ' +
      'Add a valid key to Backend/.env'
    )
  }

  const url = new URL(GEOCODING_BASE_URL)
  url.searchParams.set('address', address)
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Geocoding API HTTP error: ${response.status}`)
  }

  const data = await response.json()

  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    // Address could not be resolved — not necessarily an error in our system,
    // just means the user-provided address is invalid/unresolvable.
    return null
  }

  const result = data.results[0]
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  }
}

/**
 * Validate that a lat/lng pair falls within valid geographic ranges.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {{ valid: boolean, message?: string }}
 */
function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { valid: false, message: 'Latitude and longitude must be numbers' }
  }
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { valid: false, message: 'Latitude and longitude must not be NaN' }
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, message: `Latitude must be between -90 and 90, got ${lat}` }
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, message: `Longitude must be between -180 and 180, got ${lng}` }
  }
  return { valid: true }
}

module.exports = { geocodeAddress, validateCoordinates }
