import type { ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  List,
  ListItem,
  Rating,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import LocationOnIcon from '@mui/icons-material/LocationOn'

import { removeBookmark } from '../../../shared/lib/storage/localStorage'
import type { Restaurant } from '../../../shared/types'

interface BookmarkListProps {
  bookmarks: Restaurant[]
  onBookmarkRemoved: (placeId: string) => void
}

const BookmarkList = ({ bookmarks, onBookmarkRemoved }: BookmarkListProps): ReactElement => {
  const navigate = useNavigate()

  const handleRemove = (placeId: string) => {
    removeBookmark(placeId)
    onBookmarkRemoved(placeId)
  }

  const handleCardClick = (placeId: string) => {
    void navigate(`/restaurant/${placeId}`)
  }

  if (bookmarks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="h6" color="text.secondary">
          まだブックマークしたお店はありません
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          ホーム画面でお店を右にスワイプしてブックマークしましょう
        </Typography>
      </Box>
    )
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {bookmarks.map((restaurant) => (
        <ListItem key={restaurant.place_id} sx={{ p: 0, mb: 2 }}>
          <Card
            sx={{
              display: 'flex',
              width: '100%',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => handleCardClick(restaurant.place_id)}
          >
            <Box
              sx={{
                width: 120,
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                alignSelf: 'stretch',
              }}
            >
              <CardMedia
                component="img"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                }}
                image={restaurant.photo_url ?? '/placeholder.jpg'}
                alt={restaurant.name}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <CardContent sx={{ flex: '1 0 auto', pb: 1 }}>
                <Typography component="div" variant="h6">
                  {restaurant.name}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <LocationOnIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                    {restaurant.address}
                  </Typography>
                </Box>

                {typeof restaurant.rating === 'number' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <Rating value={restaurant.rating} readOnly size="small" precision={0.1} />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      ({restaurant.rating})
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                  {typeof restaurant.price_level === 'number' && (
                    <Chip label={'¥'.repeat(restaurant.price_level)} size="small" variant="outlined" />
                  )}
                </Box>
              </CardContent>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
              <IconButton
                aria-label="delete"
                onClick={(event) => {
                  event.stopPropagation()
                  handleRemove(restaurant.place_id)
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Card>
        </ListItem>
      ))}
    </List>
  )
}

export default BookmarkList
