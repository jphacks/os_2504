const MAPS_SCRIPT_ATTRIBUTE = 'data-google-maps-sdk'

const dispatchEventSafely = (eventName: string) => {
  window.dispatchEvent(new Event(eventName))
}

const handleMapLoaded = () => {
  window.googleMapsLoaded = true
  dispatchEventSafely('googleMapsLoaded')
}

const handleMapError = () => {
  console.error('Failed to load Google Maps API')
  window.googleMapsLoadError = true
  dispatchEventSafely('googleMapsLoadError')
}

const initialiseGoogleCallbacks = () => {
  window.initMap = () => {
    console.log('Google Maps API loaded via callback')
    handleMapLoaded()
  }

  window.handleMapError = handleMapError
  window.gm_authFailure = handleMapError
}

const appendGoogleMapsScript = (apiKey: string) => {
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[${MAPS_SCRIPT_ATTRIBUTE}="true"]`,
  )

  if (existingScript) {
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.defer = true
  script.setAttribute(MAPS_SCRIPT_ATTRIBUTE, 'true')
  script.setAttribute('loading', 'async')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&loading=async&libraries=places,marker`
  script.onerror = handleMapError

  document.head.appendChild(script)
}

export const loadGoogleMapsSdk = () => {
  if (typeof window === 'undefined') {
    return
  }

  initialiseGoogleCallbacks()

  if (window.google?.maps) {
    handleMapLoaded()
    return
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.error('VITE_GOOGLE_MAPS_API_KEY is not defined')
    handleMapError()
    return
  }

  appendGoogleMapsScript(apiKey)
}

if (typeof window !== 'undefined') {
  loadGoogleMapsSdk()
}
