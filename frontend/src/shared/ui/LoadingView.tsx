import type { ReactElement } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingViewProps {
  message?: string
}

function LoadingView({
  message = 'レストランを探しています...',
}: LoadingViewProps): ReactElement {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
      <CircularProgress size={60} thickness={4} />
      <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
        {message}
      </Typography>
    </Box>
  )
}

export default LoadingView
