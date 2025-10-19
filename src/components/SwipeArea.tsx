import type { PropsWithChildren, ReactElement } from 'react'
import { Box, Typography } from '@mui/material'

interface SwipeAreaProps extends PropsWithChildren {
  currentIndex: number
  totalCount: number
}

function SwipeArea({ currentIndex, totalCount, children }: SwipeAreaProps): ReactElement {
  return (
    <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', mb: 2 }}>
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '50%',
          px: 1.5,
          py: 0.5,
          boxShadow: 2,
          zIndex: 1,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {currentIndex + 1} / {totalCount}
        </Typography>
      </Box>
      {children}
    </Box>
  )
}

export default SwipeArea
