import { useEffect, useRef, useState, type MouseEvent, type ReactElement } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Rating,
  Typography,
} from '@mui/material'
import {
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Comment as CommentIcon,
  Language as LanguageIcon,
  Map as MapIcon,
  Phone as PhoneIcon,
  Place as PlaceIcon,
  Star as StarIcon,
} from '@mui/icons-material'

import AppHeader from '../../../app/components/AppHeader'
import { getRestaurantDetails } from '../../../shared/lib/api/restaurants'
import type { Coordinates, Restaurant } from '../../../shared/types'
import MoguwanMascot from './MoguwanMascot'

type DetailLocationState = {
  from?: {
    pathname: string
    search?: string
  }
  groupId?: string
  memberId?: string | null
  organizerLocation?: Coordinates | null
}

type ViewMode = 'reviews' | 'map'

const RestaurantDetail = (): ReactElement => {
  const { placeId } = useParams<{ placeId: string }>()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const navigationState = (routerLocation.state as DetailLocationState | undefined) ?? {}

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('reviews')
  const [walkingTime, setWalkingTime] = useState<string | null>(null)
  const [walkingDistance, setWalkingDistance] = useState<string | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [openingHoursModalOpen, setOpeningHoursModalOpen] = useState(false)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)

  const redirectToGroup = (): boolean => {
    const groupId = navigationState.groupId
    if (!groupId) {
      return false
    }
    const memberId = navigationState.memberId
    const query = memberId ? `?memberId=${encodeURIComponent(memberId)}` : ''
    navigate(`/group/${groupId}${query}`, { replace: true })
    return true
  }

  const handleBack = () => {
    const from = navigationState.from
    if (from?.pathname) {
      const search = from.search ?? ''
      navigate(`${from.pathname}${search}`, { replace: true })
      return
    }
    if (redirectToGroup()) {
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }

  useEffect(() => {
    const fetchDetails = async () => {
      if (!placeId) {
        setError('店舗IDが指定されていません')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await getRestaurantDetails(placeId)
        setRestaurant(data)
        setError(null)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : '店舗情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    void fetchDetails()
  }, [placeId])

  useEffect(() => {
    if (navigationState.organizerLocation) {
      setUserLocation(navigationState.organizerLocation)
      return
    }

    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (geoError) => {
        console.error('Error getting location:', geoError)
      },
    )
  }, [navigationState.organizerLocation])

  useEffect(() => {
    if (window.google?.maps) {
      setIsMapLoaded(true)
      return
    }

    const handleMapsLoaded: EventListener = () => {
      if (window.google?.maps) {
        setIsMapLoaded(true)
      }
    }

    window.addEventListener('googleMapsLoaded', handleMapsLoaded)

    if (window.googleMapsLoaded && window.google?.maps) {
      setIsMapLoaded(true)
    }

    return () => {
      window.removeEventListener('googleMapsLoaded', handleMapsLoaded)
    }
  }, [])

  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || viewMode !== 'map' || !userLocation || !restaurant || !window.google?.maps) {
      return
    }

    try {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 14,
        center: { lat: restaurant.lat, lng: restaurant.lng },
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
      })

      directionsServiceRef.current = new window.google.maps.DirectionsService()
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true,
      })

      new window.google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: '現在地',
        zIndex: 1000,
      })

      new window.google.maps.Marker({
        position: { lat: restaurant.lat, lng: restaurant.lng },
        map: mapInstanceRef.current,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        },
        title: restaurant.name,
        zIndex: 999,
      })

      const origin: google.maps.LatLngLiteral = {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      }
      const destination: google.maps.LatLngLiteral = { lat: restaurant.lat, lng: restaurant.lng }

      const directionsService = directionsServiceRef.current

      if (directionsService) {
        void directionsService.route(
          {
            origin,
            destination,
            travelMode: window.google.maps.TravelMode.WALKING,
            language: 'ja',
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && result?.routes?.[0]?.legs?.[0]) {
              directionsRendererRef.current?.setDirections(result)
              const leg = result.routes[0].legs[0]
              setWalkingTime(leg.duration?.text ?? null)
              setWalkingDistance(leg.distance?.text ?? null)
            } else {
              const distanceKm = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                restaurant.lat,
                restaurant.lng,
              )
              const estimatedMinutes = Math.round(distanceKm * 12)
              setWalkingTime(`約 ${estimatedMinutes} 分`)
              setWalkingDistance(`約 ${distanceKm.toFixed(1)} km`)
            }
          },
        )
      }
    } catch (err) {
      console.error('Map initialization error:', err)
    }
  }, [isMapLoaded, viewMode, userLocation, restaurant])

  const photos = restaurant?.photo_urls ?? []

  const getPriceDisplay = (priceLevel?: number | null): string => {
    if (!priceLevel) {
      return '情報なし'
    }
    return '¥'.repeat(priceLevel)
  }

  const handlePrevPhoto = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!restaurant) {
      return
    }
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }

  const handleNextPhoto = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!restaurant) {
      return
    }
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }

  const header = (
    <Box data-testid="header" sx={{ position: 'sticky', top: 0, zIndex: 10 }}>
      <AppHeader title={restaurant?.name ?? '店舗詳細'} onBack={handleBack} />
    </Box>
  )

  if (loading) {
    return (
      <Box data-testid="loading-container" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {header}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress data-testid="loading-spinner" />
        </Box>
      </Box>
    )
  }

  if (error || !restaurant) {
    return (
      <Box data-testid="error-container" sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {header}
        <Box sx={{ p: 3 }}>
          <Typography data-testid="error-message" color="error">
            {error ?? '店舗情報を取得できませんでした'}
          </Typography>
        </Box>
      </Box>
    )
  }

  const reviews = restaurant.reviews ?? []

  return (
    <Box data-testid="restaurant-detail-container" sx={{ pb: 2, bgcolor: 'background.default' }}>
      {header}

      {photos.length > 0 && (
        <Box data-testid="photo-gallery" sx={{ position: 'relative', overflow: 'hidden', height: 300, bgcolor: 'black' }}>
          <CardMedia
            data-testid="photo-image"
            component="img"
            height="300"
            image={photos[currentPhotoIndex]}
            alt={`${restaurant.name} - ${currentPhotoIndex + 1}`}
            sx={{
              objectFit: 'cover',
              width: '100%',
              transition: 'opacity 0.3s ease',
            }}
          />

          {photos.length > 1 && (
            <>
              <IconButton
                data-testid="photo-prev-button"
                onClick={handlePrevPhoto}
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  color: 'black',
                  zIndex: 10,
                  width: 36,
                  height: 36,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                  },
                }}
              >
                <ArrowBackIosIcon sx={{ fontSize: 18, ml: 0.5 }} />
              </IconButton>
              <IconButton
                data-testid="photo-next-button"
                onClick={handleNextPhoto}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  color: 'black',
                  zIndex: 10,
                  width: 36,
                  height: 36,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                  },
                }}
              >
                <ArrowForwardIosIcon sx={{ fontSize: 18 }} />
              </IconButton>

              <Box
                data-testid="photo-indicators"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 0.5,
                  zIndex: 2,
                }}
              >
                {photos.map((_, index) => (
                  <Box
                    key={`photo-indicator-${index}`}
                    data-testid={`photo-indicator-${index}`}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: index === currentPhotoIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                      transition: 'background-color 0.3s',
                      cursor: 'pointer',
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      setCurrentPhotoIndex(index)
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      <Card data-testid="restaurant-info-card" sx={{ m: 2 }}>
        <CardContent data-testid="restaurant-info-content">
          <Box
            data-testid="restaurant-info-wrapper"
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
          >
            <Box data-testid="restaurant-main-info" sx={{ flex: 1 }}>
              <Typography data-testid="restaurant-name" variant="h5" component="h1" gutterBottom>
                {restaurant.name}
              </Typography>

              <Box data-testid="rating-section" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Rating
                  data-testid="rating-stars"
                  value={restaurant.rating ?? 0}
                  precision={0.1}
                  readOnly
                  size="small"
                />
                <Typography data-testid="rating-value" variant="body2" color="text.secondary">
                  {restaurant.rating?.toFixed(1) ?? 'N/A'}
                </Typography>
                {restaurant.user_ratings_total && (
                  <Typography data-testid="rating-count" variant="body2" color="text.secondary">
                    ({restaurant.user_ratings_total}件)
                  </Typography>
                )}
              </Box>

              <Box data-testid="tags-section" sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Chip data-testid="price-chip" label={getPriceDisplay(restaurant.price_level)} size="small" />
                {(restaurant.types ?? []).slice(0, 3).map((type, index) => (
                  <Chip key={`type-${type}-${index}`} data-testid={`type-chip-${index}`} label={type} size="small" variant="outlined" />
                ))}
              </Box>

              <Box data-testid="address-section" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <PlaceIcon data-testid="address-icon" fontSize="small" color="action" sx={{ mt: 0.5 }} />
                <Typography data-testid="address-text" variant="body2">
                  {restaurant.address}
                </Typography>
              </Box>

              {restaurant.opening_hours && (
                <Box data-testid="opening-hours-section" sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography data-testid="opening-hours-title" variant="subtitle2" sx={{ fontWeight: 600 }}>
                      営業時間
                    </Typography>
                    {restaurant.opening_hours.open_now !== undefined && (
                      <Chip
                        data-testid="open-now-chip"
                        label={restaurant.opening_hours.open_now ? '営業中' : '営業時間外'}
                        size="small"
                        color={restaurant.opening_hours.open_now ? 'success' : 'default'}
                      />
                    )}
                  </Box>
                  {restaurant.opening_hours.weekday_text && (
                    <Typography
                      data-testid="opening-hours-summary"
                      variant="body2"
                      color="primary"
                      sx={{
                        mt: 0.5,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        '&:hover': { color: 'primary.dark' },
                      }}
                      onClick={() => setOpeningHoursModalOpen(true)}
                    >
                      営業時間を表示
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            <Box data-testid="action-buttons" sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
              {restaurant.phone_number && (
                <IconButton
                  data-testid="phone-button"
                  href={`tel:${restaurant.phone_number}`}
                  size="small"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  <PhoneIcon fontSize="small" />
                </IconButton>
              )}

              {restaurant.website && (
                <IconButton
                  data-testid="website-button"
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  <LanguageIcon fontSize="small" />
                </IconButton>
              )}

              {restaurant.google_maps_url && (
                <IconButton
                  data-testid="google-maps-button"
                  href={restaurant.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  }}
                >
                  <PlaceIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box data-testid="tab-toggle-container" sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Box
          data-testid="tab-toggle-wrapper"
          sx={{
            display: 'flex',
            gap: 0.5,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 2,
            p: 0.5,
            boxShadow: 2,
          }}
        >
          <IconButton
            data-testid="reviews-tab-button"
            onClick={() => setViewMode('reviews')}
            size="small"
            sx={{
              bgcolor: viewMode === 'reviews' ? 'primary.main' : 'transparent',
              color: viewMode === 'reviews' ? 'white' : 'text.secondary',
              '&:hover': {
                bgcolor: viewMode === 'reviews' ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <CommentIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            data-testid="map-tab-button"
            onClick={() => setViewMode('map')}
            size="small"
            sx={{
              bgcolor: viewMode === 'map' ? 'primary.main' : 'transparent',
              color: viewMode === 'map' ? 'white' : 'text.secondary',
              '&:hover': {
                bgcolor: viewMode === 'map' ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <MapIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>

      {viewMode === 'reviews' && reviews.length > 0 && (
        <Card data-testid="reviews-card" sx={{ m: 2 }}>
          <CardContent data-testid="reviews-content">
            <Typography data-testid="reviews-title" variant="h6" gutterBottom>
              レビュー
            </Typography>
            {reviews.map((review, index) => (
              <Box key={`review-${index}`} data-testid={`review-item-${index}`} sx={{ mb: 2 }}>
                <Box
                  data-testid={`review-header-${index}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <Typography data-testid={`review-author-${index}`} variant="subtitle2">
                    {review.author_name}
                  </Typography>
                  <Typography data-testid={`review-time-${index}`} variant="caption" color="text.secondary">
                    {review.time}
                  </Typography>
                </Box>
                <Box data-testid={`review-stars-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  {Array.from({ length: 5 }, (_, starIndex) => (
                    <StarIcon
                      key={`review-star-${index}-${starIndex}`}
                      data-testid={`review-star-${index}-${starIndex}`}
                      fontSize="small"
                      sx={{ color: starIndex < review.rating ? 'warning.main' : 'action.disabled' }}
                    />
                  ))}
                </Box>
                <Typography data-testid={`review-text-${index}`} variant="body2" color="text.secondary">
                  {review.text}
                </Typography>
                {index < reviews.length - 1 && (
                  <Divider data-testid={`review-divider-${index}`} sx={{ mt: 2 }} />
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {viewMode === 'map' && (
        <Card data-testid="map-card" sx={{ m: 2 }}>
          <CardContent data-testid="map-content">
            <Box data-testid="map-wrapper" sx={{ position: 'relative', width: '100%', height: 400 }}>
              {!isMapLoaded ? (
                <Box
                  data-testid="map-loading"
                  sx={{
                    height: '100%',
                    bgcolor: 'grey.100',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                  }}
                >
                  <CircularProgress data-testid="map-loading-spinner" size={40} sx={{ mb: 2 }} />
                  <Typography data-testid="map-loading-text" variant="body2" color="text.secondary">
                    地図を読み込み中...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    data-testid="map-canvas"
                    ref={mapRef}
                    sx={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  {walkingTime && (
                    <Box
                      data-testid="walking-info-box"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        px: 2,
                        py: 1,
                        boxShadow: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Typography data-testid="walking-label" variant="body2" color="text.secondary">
                        徒歩
                      </Typography>
                      <Typography data-testid="walking-time" variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                        {walkingTime}
                      </Typography>
                      {walkingDistance && (
                        <Typography data-testid="walking-distance" variant="body2" color="text.secondary">
                          ({walkingDistance})
                        </Typography>
                      )}
                    </Box>
                  )}
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      <Dialog
        data-testid="opening-hours-modal"
        open={openingHoursModalOpen}
        onClose={() => setOpeningHoursModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle data-testid="opening-hours-modal-title">営業時間</DialogTitle>
        <DialogContent data-testid="opening-hours-modal-content">
          {restaurant.opening_hours?.weekday_text && (
            <Box sx={{ pt: 1 }}>
              {restaurant.opening_hours.weekday_text.map((text, index) => (
                <Typography
                  key={`weekday-${index}`}
                  data-testid={`modal-weekday-text-${index}`}
                  variant="body1"
                  sx={{ mb: 1.5, lineHeight: 1.6 }}
                >
                  {text}
                </Typography>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {restaurant.summary && <MoguwanMascot summary={restaurant.summary} />}
    </Box>
  )
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default RestaurantDetail
