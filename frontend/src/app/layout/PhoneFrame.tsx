import type { PropsWithChildren, ReactElement } from 'react'
import { Box } from '@mui/material'

type PhoneFrameProps = PropsWithChildren

const PhoneFrame = ({ children }: PhoneFrameProps): ReactElement => {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#e0e0e0',
        p: 4,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 450,
          height: 900,
          bgcolor: '#1a1a1a',
          borderRadius: 6,
          p: 2,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 150,
            height: 30,
            bgcolor: '#1a1a1a',
            borderRadius: 20,
            zIndex: 10,
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'white',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}

export default PhoneFrame
