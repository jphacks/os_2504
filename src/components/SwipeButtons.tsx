import type { ReactElement } from 'react'
import { Box, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FavoriteIcon from '@mui/icons-material/Favorite'

interface SwipeButtonsProps {
  onDislike: () => void
  onLike: () => void
  disabled?: boolean
}

function SwipeButtons({ onDislike, onLike, disabled = false }: SwipeButtonsProps): ReactElement {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 2,
        zIndex: 1000,
      }}
    >
      <IconButton
        onClick={onDislike}
        disabled={disabled}
        sx={{
          width: 64,
          height: 64,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          border: '3px solid',
          borderColor: 'error.main',
          color: 'error.main',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          '&:hover': {
            bgcolor: 'error.main',
            color: 'white',
            transform: 'scale(1.1)',
          },
          '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed',
          },
          transition: 'all 0.2s',
        }}
      >
        <CloseIcon sx={{ fontSize: 32 }} />
      </IconButton>
      <IconButton
        onClick={onLike}
        disabled={disabled}
        sx={{
          width: 64,
          height: 64,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          border: '3px solid',
          borderColor: 'success.main',
          color: 'success.main',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          '&:hover': {
            bgcolor: 'success.main',
            color: 'white',
            transform: 'scale(1.1)',
          },
          '&:disabled': {
            opacity: 0.5,
            cursor: 'not-allowed',
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
