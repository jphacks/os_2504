import type { PropsWithChildren, ReactElement } from 'react'
import { Box } from '@mui/material'

type MainContentProps = PropsWithChildren

function MainContent({ children }: MainContentProps): ReactElement {
  return (
    <Box sx={{ flex: 1, overflow: 'auto', px: 2, pt: 2, pb: 10 }}>
      {children}
    </Box>
  )
}

export default MainContent
