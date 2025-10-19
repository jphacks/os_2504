import type { ReactElement } from 'react'
import { Box, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FavoriteIcon from '@mui/icons-material/Favorite'

interface SwipeButtonsProps {
  onDislike: () => void
  onLike: () => void
}

function SwipeButtons({ onDislike, onLike }: SwipeButtonsProps): ReactElement {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        zIndex: 1000,
      }}
    >
      <IconButton
        onClick={onDislike}
        sx={{
          width: 64,
          height: 64,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          border: '3px solid',
          borderColor: '#2ECC71',
          color: '#2ECC71',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          '&:hover': {
            bgcolor: '#2ECC71',
            color: 'white',
            transform: 'scale(1.1)',
          },
          transition: 'all 0.2s',
        }}
      >
        <CloseIcon sx={{ fontSize: 32 }} />
      </IconButton>
      <IconButton
        onClick={onLike}
        sx={{
          width: 64,
          height: 64,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          border: '3px solid',
          borderColor: '#FF5252',
          color: '#FF5252',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          '&:hover': {
            bgcolor: '#FF5252',
            color: 'white',
            transform: 'scale(1.1)',
          },
          transition: 'all 0.2s',
        }}
      >
        <FavoriteIcon sx={{ fontSize: 32 }} />
      </IconButton>
    </Box>
  )
}

export default SwipeButtons
