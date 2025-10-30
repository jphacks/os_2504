import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, ReactElement } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Rating,
  Typography,
} from '@mui/material'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PersonIcon from '@mui/icons-material/Person'
import StarIcon from '@mui/icons-material/Star'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CommentIcon from '@mui/icons-material/Comment'
import MapIcon from '@mui/icons-material/Map'
import InfoIcon from '@mui/icons-material/Info'

import { parseHighlightedText } from '../../../shared/lib/textParser'
import { createRestaurantMarker, createUserMarker } from '../../../shared/lib/mapMarkers'
import type { Coordinates, Restaurant } from '../../../shared/types'

interface GroupContext {
  groupId: string
  memberId?: string | null
}

interface RestaurantCardProps {
  restaurant: Restaurant
  userLocation: Coordinates | null
  groupContext?: GroupContext
}

type ViewMode = 'reviews' | 'map'

const FALLBACK_PHOTO = '/placeholder.jpg'

const RestaurantCard = ({ restaurant, userLocation, groupContext }: RestaurantCardProps): ReactElement => {
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('reviews')
  const [walkingTime, setWalkingTime] = useState<string | null>(null)
  const [walkingDistance, setWalkingDistance] = useState<string | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isAddressExpanded, setIsAddressExpanded] = useState(false)

  const photos = useMemo(() => {
    const candidates =
      restaurant.photo_urls && restaurant.photo_urls.length > 0
        ? restaurant.photo_urls
        : [restaurant.photo_url ?? FALLBACK_PHOTO]

    const filtered = candidates.filter((url): url is string => Boolean(url))
    return filtered.length > 0 ? filtered : [FALLBACK_PHOTO]
  }, [restaurant.photo_url, restaurant.photo_urls])

  const summaryBullets = useMemo(() => {
    if (!restaurant.summary) {
      return []
    }

    return restaurant.summary.split('\n').filter((line) => line.trim()).slice(0, 3)
  }, [restaurant.summary])

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
    if (!isMapLoaded || !mapRef.current || viewMode !== 'map' || !userLocation || !window.google?.maps) {
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

      createUserMarker(mapInstanceRef.current, { lat: userLocation.latitude, lng: userLocation.longitude }, { scale: 1.1 })

      createRestaurantMarker(
        mapInstanceRef.current,
        { lat: restaurant.lat, lng: restaurant.lng },
        restaurant.name,
        { scale: 1.1 },
      )

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
              const distanceInKm = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                restaurant.lat,
                restaurant.lng,
              )
              const estimatedMinutes = Math.round(distanceInKm * 12)
              setWalkingTime(`約 ${estimatedMinutes} 分`)
              setWalkingDistance(`約 ${distanceInKm.toFixed(1)} km`)
            }
          },
        )
      }
    } catch (error) {
      console.error('Map initialization error:', error)
    }
  }, [isMapLoaded, viewMode, userLocation, restaurant])

  const handlePrevPhoto = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }

  const handleNextPhoto = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }

  const handlePhotoDotClick = (index: number) => (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    setCurrentPhotoIndex(index)
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
  }

  const getPriceDisplay = (level?: number | null): string => {
    if (!level) {
      return '価格情報なし'
    }
    return '¥'.repeat(level)
  }

  const topTypes = (restaurant.types ?? []).slice(0, 3)
  const reviews = restaurant.reviews ?? []

  return (
    <Card
      sx={{
        maxWidth: 420,
        width: '100%',
        height: 'calc(100vh - 120px)',
        minHeight: 600,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', height: 240 }}>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'black',
          }}
        >
          <CardMedia
            component="img"
            height="240"
            image={photos[currentPhotoIndex]}
            alt={restaurant.name}
            sx={{
              objectFit: 'cover',
              width: '100%',
              transition: 'opacity 0.3s ease',
            }}
          />

          {photos.length > 1 && (
            <>
              <IconButton
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
                    key={`photo-dot-${index}`}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: index === currentPhotoIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                      transition: 'background-color 0.3s',
                      cursor: 'pointer',
                    }}
                    onClick={handlePhotoDotClick(index)}
                  />
                ))}
              </Box>
            </>
          )}
        </Box>

        {typeof restaurant.rating === 'number' && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {restaurant.rating.toFixed(1)}
            </Typography>
          </Box>
        )}
      </Box>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden' }}>
        <Box sx={{ flexShrink: 0, mb: 1 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
            {restaurant.name}
          </Typography>

          <Box
            onClick={() => setIsAddressExpanded((prev) => !prev)}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              cursor: 'pointer',
              '&:hover': { opacity: 0.7 },
            }}
          >
            <LocationOnIcon sx={{ fontSize: 16, color: 'primary.main', mr: 0.5, mt: 0.2 }} />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                flex: 1,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isAddressExpanded ? 'normal' : 'nowrap',
              }}
            >
              {restaurant.address}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<InfoIcon />}
            onClick={(event) => {
              event.stopPropagation()
              void navigate(`/restaurant/${restaurant.place_id}`, {
                state: {
                  from: {
                    pathname: routeLocation.pathname,
                    search: routeLocation.search,
                  },
                  groupId: groupContext?.groupId,
                  memberId: groupContext?.memberId ?? null,
                  organizerLocation: userLocation,
                },
              })
            }}
            sx={{ fontSize: '0.75rem' }}
          >
            詳細
          </Button>
          <Box
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
              onClick={() => handleViewModeChange('reviews')}
              size="small"
              sx={{
                bgcolor: viewMode === 'reviews' ? '#355070' : 'rgba(53, 80, 112, 0.08)',
                color: viewMode === 'reviews' ? '#FFFFFF' : 'text.secondary',
                '&:hover': {
                  bgcolor: viewMode === 'reviews' ? '#2D435A' : 'action.hover',
                },
              }}
            >
              <CommentIcon sx={{ fontSize: 20, color: viewMode === 'reviews' ? '#FFFFFF' : '#355070' }} />
            </IconButton>
            <IconButton
              onClick={() => handleViewModeChange('map')}
              size="small"
              sx={{
                bgcolor: viewMode === 'map' ? '#355070' : 'rgba(53, 80, 112, 0.08)',
                color: viewMode === 'map' ? '#FFFFFF' : 'text.secondary',
                '&:hover': {
                  bgcolor: viewMode === 'map' ? '#2D435A' : 'action.hover',
                },
              }}
            >
              <MapIcon sx={{ fontSize: 20, color: viewMode === 'map' ? '#FFFFFF' : '#355070' }} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ position: 'relative', flex: 1, overflowY: 'auto' }}>
          {viewMode === 'reviews' && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachMoneyIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'secondary.main' }}>
                    {getPriceDisplay(restaurant.price_level)}
                  </Typography>
                </Box>
                {topTypes.map((type) => (
                  <Chip
                    key={type}
                    label={type.replace(/_/g, ' ')}
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                ))}
              </Box>
              {reviews.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {summaryBullets.length > 0 && (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: 'rgba(255, 182, 193, 0.2)',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar src="/moguwan_icon.png" alt="モグ太" sx={{ width: 32, height: 32, mr: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.dark' }}>
                          モグ太
                        </Typography>
                        <Chip
                          label="AI"
                          size="small"
                          sx={{ ml: 1, height: 20, fontSize: '0.65rem', bgcolor: 'primary.main', color: 'white' }}
                        />
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        {summaryBullets.map((bullet, index) => {
                          const cleanedBullet = bullet.replace(/^[・•]\s*/, '')
                          return (
                            <Typography
                              key={`summary-bullet-${index}`}
                              variant="body2"
                              sx={{
                                mb: 0.5,
                                color: 'primary.dark',
                                fontWeight: 500,
                                '&:before': {
                                  content: '"・"',
                                  mr: 0.5,
                                },
                              }}
                            >
                              {parseHighlightedText(cleanedBullet)}
                            </Typography>
                          )
                        })}
                      </Box>
                    </Paper>
                  )}

                  {reviews.slice(0, 3).map((review, index) => (
                    <Paper
                      key={`${review.author_name}-${index}`}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'rgba(255, 255, 255, 0.95)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: 'primary.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 1,
                          }}
                        >
                          <PersonIcon sx={{ fontSize: 18, color: 'white' }} />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, color: 'text.primary' }}>
                          {review.author_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Rating value={review.rating} readOnly size="small" sx={{ ml: 0.5 }} />
                        </Box>
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.6,
                          mt: 1,
                          mb: 0.5,
                        }}
                      >
                        {review.text}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                        {review.time}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    px: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                  }}
                >
                  <CommentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    レビューはまだありません
                  </Typography>
                </Box>
              )}
            </>
          )}

          {viewMode === 'map' && (
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
              {!isMapLoaded ? (
                <Box
                  sx={{
                    height: '100%',
                    minHeight: 300,
                    bgcolor: 'grey.100',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                  }}
                >
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    地図を読み込み中...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box
                    ref={mapRef}
                    sx={{
                      width: '100%',
                      height: '100%',
                      minHeight: 300,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  {walkingTime && (
                    <Box
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
                      <Typography variant="body2" color="text.secondary">
                        徒歩
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                        {walkingTime}
                      </Typography>
                      {walkingDistance && (
                        <Typography variant="body2" color="text.secondary">
                          ({walkingDistance})
                        </Typography>
                      )}
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
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

export default RestaurantCard
