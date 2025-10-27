type MarkerScaleOption = {
  scale?: number
}

const ensureMarkerLibrary = () => {
  if (!window.google?.maps?.marker) {
    throw new Error('Google Maps marker library failed to load.')
  }

  return window.google.maps.marker
}

const createAdvancedMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  title: string,
  style: {
    background: string
    borderColor: string
    glyphColor: string
    glyph?: string
  },
  options?: MarkerScaleOption & { zIndex?: number },
) => {
  const { AdvancedMarkerElement, PinElement } = ensureMarkerLibrary()
  const pin = new PinElement({
    background: style.background,
    borderColor: style.borderColor,
    glyphColor: style.glyphColor,
    glyph: style.glyph,
    scale: options?.scale,
  })

  return new AdvancedMarkerElement({
    map,
    position,
    title,
    content: pin.element,
    zIndex: options?.zIndex,
  })
}

export const createUserMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  options?: MarkerScaleOption,
) =>
  createAdvancedMarker(
    map,
    position,
    '現在地',
    {
      background: '#4285F4',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
    },
    { ...options, zIndex: 1000 },
  )

export const createRestaurantMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  title: string,
  options?: MarkerScaleOption,
) =>
  createAdvancedMarker(
    map,
    position,
    title,
    {
      background: '#EA4335',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyph: 'F',
    },
    { ...options, zIndex: 999 },
  )

export const updateMarkerPosition = (
  marker: google.maps.marker.AdvancedMarkerElement,
  position: google.maps.LatLngLiteral,
  title?: string,
) => {
  marker.position = position
  if (title) {
    marker.title = title
  }
}
