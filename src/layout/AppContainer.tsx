import type { PropsWithChildren, ReactElement } from 'react'
import { Box } from '@mui/material'

type AppContainerProps = PropsWithChildren

function AppContainer({ children }: AppContainerProps): ReactElement {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        py: { xs: 0, md: 4 },
      }}
    >
      {children}
    </Box>
  )
}

export default AppContainer
