import { useMemo, useState } from 'react'
import type { MouseEvent, ReactElement } from 'react'
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Paper,
  Typography,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'

import { parseHighlightedText } from '../utils/textParser'
import type { Restaurant } from '../lib/types'

interface RestaurantCardProps {
  restaurant: Restaurant
}

const FALLBACK_PHOTO = '/placeholder.jpg'

const RestaurantCard = ({ restaurant }: RestaurantCardProps): ReactElement => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  const photos = useMemo(() => {
    const filtered = restaurant.photo_urls.filter((url): url is string => Boolean(url))
    return filtered.length > 0 ? filtered : [FALLBACK_PHOTO]
  }, [restaurant.photo_urls])

  const summaryBullets = useMemo(() => {
    if (!restaurant.summary_simple) {
      return []
    }

    return restaurant.summary_simple.split('\n').filter((line) => line.trim()).slice(0, 3)
  }, [restaurant.summary_simple])

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

  const topTypes = (restaurant.types ?? []).slice(0, 3)

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
        </Box>

        <Box sx={{ position: 'relative', flex: 1, overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
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

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                fontSize: '0.875rem',
              }}
            >
              <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="body2">
                {restaurant.rating.toFixed(1)} ({restaurant.user_ratings_total} 件のレビュー)
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default RestaurantCard
