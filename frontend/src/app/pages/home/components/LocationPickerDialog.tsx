import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'

import type { Coordinates } from '../../../../shared/types'

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 35.681236, lng: 139.767125 }

type SelectionMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker

const createSelectionMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
): SelectionMarker => {
  if (window.google?.maps?.marker?.AdvancedMarkerElement) {
    return new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      zIndex: 1200,
      title: '選択中の場所',
    })
  }

  return new window.google.maps.Marker({
    map,
    position,
    title: '選択中の場所',
  })
}

const clearSelectionMarker = (marker: SelectionMarker | null): void => {
  if (!marker) {
    return
  }

  if ('setMap' in marker) {
    marker.setMap(null)
  } else {
    marker.map = null
  }
}

const updateSelectionMarkerPosition = (
  marker: SelectionMarker,
  position: google.maps.LatLngLiteral,
): void => {
  if ('setPosition' in marker) {
    marker.setPosition(position)
    return
  }

  marker.position = position
}

interface LocationPickerDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (coords: Coordinates) => void
  initialLocation?: Coordinates | null
}

const LocationPickerDialog = ({
  open,
  onClose,
  onSelect,
  initialLocation = null,
}: LocationPickerDialogProps): ReactElement => {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<SelectionMarker | null>(null)
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)

  const [mapsReady, setMapsReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(initialLocation)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    const isMapsReady = (): boolean =>
      typeof window !== 'undefined' && !!window.google?.maps && !!window.google.maps.Map

    if (isMapsReady()) {
      setMapsReady(true)
    }

    const handleMapsLoaded = () => {
      if (isMapsReady()) {
        setMapsReady(true)
        setLocalError(null)
      }
    }

    const handleMapsError = () => {
      setLocalError('Googleマップを読み込めませんでした。時間をおいて再度お試しください。')
    }

    window.addEventListener('googleMapsLoaded', handleMapsLoaded)
    window.addEventListener('googleMapsLoadError', handleMapsError)

    return () => {
      window.removeEventListener('googleMapsLoaded', handleMapsLoaded)
      window.removeEventListener('googleMapsLoadError', handleMapsError)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    setSelectedLocation(initialLocation ?? null)
    setSearchQuery('')
    setLocalError(null)
  }, [open, initialLocation])

  useEffect(() => {
    if (!open || !mapsReady || !mapRef.current || !window.google?.maps) {
      return
    }

    const center: google.maps.LatLngLiteral = initialLocation
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
      : DEFAULT_CENTER

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: initialLocation ? 13 : 5,
      center,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    mapInstanceRef.current = map

    if (clickListenerRef.current) {
      window.google.maps.event.removeListener(clickListenerRef.current)
      clickListenerRef.current = null
    }

    clickListenerRef.current = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) {
        return
      }

      setSelectedLocation({
        latitude: event.latLng.lat(),
        longitude: event.latLng.lng(),
      })
      setLocalError(null)
    })

    return () => {
      if (clickListenerRef.current) {
        window.google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
      clearSelectionMarker(markerRef.current)
      markerRef.current = null
      mapInstanceRef.current = null
    }
  }, [open, mapsReady, initialLocation])

  useEffect(() => {
    if (!open || !mapInstanceRef.current || !window.google?.maps) {
      return
    }

    if (!selectedLocation) {
      clearSelectionMarker(markerRef.current)
      markerRef.current = null
      return
    }

    const position: google.maps.LatLngLiteral = {
      lat: selectedLocation.latitude,
      lng: selectedLocation.longitude,
    }

    if (!markerRef.current) {
      markerRef.current = createSelectionMarker(mapInstanceRef.current, position)
    } else {
      updateSelectionMarkerPosition(markerRef.current, position)
    }

    mapInstanceRef.current.panTo(position)
    if ((mapInstanceRef.current.getZoom() ?? 0) < 13) {
      mapInstanceRef.current.setZoom(13)
    }
  }, [open, selectedLocation])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!searchQuery.trim() || !window.google?.maps) {
      return
    }

    const map = mapInstanceRef.current
    if (!map) {
      return
    }

    setSearchLoading(true)
    setLocalError(null)

    const geocoder = new window.google.maps.Geocoder()
    const geocodePromise = geocoder.geocode({ address: searchQuery.trim() })

    void geocodePromise
      .then(({ results, status }) => {
        const firstResult = results?.[0]
        const geometryLocation = firstResult?.geometry?.location

        if (status === google.maps.GeocoderStatus.OK && geometryLocation) {
          const coords: Coordinates = {
            latitude: geometryLocation.lat(),
            longitude: geometryLocation.lng(),
          }
          setSelectedLocation(coords)
          map.panTo({ lat: coords.latitude, lng: coords.longitude })
          map.setZoom(15)
          return
        }

        if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
          setLocalError('検索結果が見つかりませんでした。検索条件を変えてお試しください。')
          return
        }

        setLocalError('場所の検索に失敗しました。時間をおいて再度お試しください。')
      })
      .catch((err) => {
        console.error('Failed to geocode address', err)
        setLocalError('場所の検索に失敗しました。時間をおいて再度お試しください。')
      })
      .finally(() => {
        setSearchLoading(false)
      })
  }

  const handleConfirm = () => {
    if (!selectedLocation) {
      setLocalError('地図をクリックして場所を選択してください。')
      return
    }

    onSelect(selectedLocation)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" keepMounted>
      <DialogTitle>検索起点を選択</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            住所や施設名で検索するか、地図をクリックして検索の起点となる場所を指定してください。
          </Typography>

          <Box component="form" onSubmit={handleSearch}>
            <TextField
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              label="住所または施設名で検索"
              placeholder="例）東京駅"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton type="submit" edge="end" disabled={searchLoading}>
                      {searchLoading ? <CircularProgress size={18} /> : <SearchIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box
            sx={{
              position: 'relative',
              height: 360,
              borderRadius: 2,
              overflow: 'hidden',
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            {!mapsReady ? (
              <Stack
                spacing={1}
                alignItems="center"
                justifyContent="center"
                sx={{ height: '100%' }}
              >
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">
                  マップを読み込んでいます…
                </Typography>
              </Stack>
            ) : (
              <Box ref={mapRef} sx={{ width: '100%', height: '100%' }} />
            )}
          </Box>

          {selectedLocation ? (
            <Typography variant="body2">
              緯度: {selectedLocation.latitude.toFixed(5)} ／ 経度: {selectedLocation.longitude.toFixed(5)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              地図をクリックして場所を選択してください。
            </Typography>
          )}

          {localError && (
            <Alert severity="error" variant="outlined">
              {localError}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button variant="contained" onClick={handleConfirm}>
          この場所に決定
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LocationPickerDialog
