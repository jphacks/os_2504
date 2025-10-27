export {}

declare global {
  interface Window {
    googleMapsLoaded?: boolean
    googleMapsLoadError?: boolean
    initMap?: () => void
    handleMapError?: () => void
    gm_authFailure?: () => void
  }
}
