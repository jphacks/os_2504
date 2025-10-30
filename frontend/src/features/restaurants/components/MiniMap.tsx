import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

import { createRestaurantMarker, createUserMarker, updateMarkerPosition } from '../../../shared/lib/mapMarkers'

interface MiniMapProps {
  userLocation?: google.maps.LatLngLiteral | null
  restaurantLocation?: google.maps.LatLngLiteral | null
  restaurantName?: string
}

const MiniMap = ({
  userLocation,
  restaurantLocation,
  restaurantName,
}: MiniMapProps): ReactElement => {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<{
    user: google.maps.marker.AdvancedMarkerElement | null
    restaurant: google.maps.marker.AdvancedMarkerElement | null
  }>({
    user: null,
    restaurant: null,
  })
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const isGoogleMapsReady = (): boolean =>
      typeof window !== 'undefined' && !!window.google && !!window.google.maps

    if (isGoogleMapsReady()) {
      setIsLoaded(true)
      return
    }

    const handleMapsLoaded: EventListener = () => {
      if (isGoogleMapsReady()) {
        setIsLoaded(true)
      }
    }

    window.addEventListener('googleMapsLoaded', handleMapsLoaded)

    if (window.googleMapsLoaded && isGoogleMapsReady()) {
      setIsLoaded(true)
    }

    return () => {
      window.removeEventListener('googleMapsLoaded', handleMapsLoaded)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) {
      return
    }

    try {
      if (!mapInstanceRef.current) {
        const fallbackCenter: google.maps.LatLngLiteral = { lat: 35.6762, lng: 139.6503 }
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          zoom: 14,
          center: userLocation ?? fallbackCenter,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          gestureHandling: 'none',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        })
      }

      const map = mapInstanceRef.current
      if (!map) {
        return
      }

      if (userLocation) {
        if (markersRef.current.user) {
          updateMarkerPosition(markersRef.current.user, userLocation)
        } else {
          markersRef.current.user = createUserMarker(map, userLocation, { scale: 0.9 })
        }
      }

      if (restaurantLocation) {
        const title = restaurantName ?? 'レストラン'
        if (markersRef.current.restaurant) {
          updateMarkerPosition(markersRef.current.restaurant, restaurantLocation, title)
        } else {
          markersRef.current.restaurant = createRestaurantMarker(map, restaurantLocation, title, { scale: 0.9 })
        }

        if (userLocation) {
          const bounds = new window.google.maps.LatLngBounds()
          bounds.extend(userLocation)
          bounds.extend(restaurantLocation)
          const padding: google.maps.Padding = { top: 20, right: 20, bottom: 20, left: 20 }
          map.fitBounds(bounds, padding)
        } else {
          map.setCenter(restaurantLocation)
          map.setZoom(14)
        }
      } else if (userLocation) {
        map.setCenter(userLocation)
        map.setZoom(14)
      }
    } catch (err) {
      console.error('Map initialization error:', err)
      setError('マップの初期化に失敗しました')
    }
  }, [isLoaded, userLocation, restaurantLocation, restaurantName])

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        width: 200,
        height: 150,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 3,
        border: '2px solid white',
        zIndex: 1000,
        bgcolor: error ? 'rgba(255,255,255,0.9)' : 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {error ? (
        <Typography variant="caption" color="error" sx={{ textAlign: 'center', p: 1 }}>
          {error}
        </Typography>
      ) : !isLoaded ? (
        <CircularProgress size={30} />
      ) : (
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      )}
    </Box>
  )
}

export default MiniMap
