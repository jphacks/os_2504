import type { PropsWithChildren, ReactElement } from 'react'
import { Box } from '@mui/material'

type PhoneContainerProps = PropsWithChildren

function PhoneContainer({ children }: PhoneContainerProps): ReactElement {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 430,
        minHeight: '100vh',
        bgcolor: 'background.default',
        position: 'relative',
        boxShadow: { xs: 'none', md: '0 0 40px rgba(0,0,0,0.1)' },
        borderRadius: { xs: 0, md: 3 },
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </Box>
  )
}

export default PhoneContainer
