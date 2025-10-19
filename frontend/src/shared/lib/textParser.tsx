import type { ReactNode } from 'react'
import { Box } from '@mui/material'

export const parseHighlightedText = (text?: string | null): ReactNode => {
  if (!text) {
    return null
  }

  const parts = text.split(/(\*\*\*.*?\*\*\*)/g)

  return parts.map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      const keyword = part.slice(3, -3)
      return (
        <Box
          component="span"
          key={index}
          sx={{
            fontWeight: 700,
            color: 'primary.main',
          }}
        >
          {keyword}
        </Box>
      )
    }

    return part
  })
}

export const parseSummaryToBulletPoints = (summary?: string | null): string[] => {
  if (!summary) {
    return []
  }

  const lines = summary.split('\n').filter((line) => line.trim())
  return lines.slice(0, 3)
}
