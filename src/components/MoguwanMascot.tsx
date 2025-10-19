import { useEffect, useRef, useState } from 'react'
import { Box, Grow, IconButton, Paper, Typography } from '@mui/material'

import { parseHighlightedText } from '../utils/textParser'

interface MoguwanMascotProps {
  summary?: string | null
  onMascotClick?: () => void
}

const MoguwanMascot = ({ summary, onMascotClick }: MoguwanMascotProps) => {
  const [showSpeech, setShowSpeech] = useState(false)
  const [hasShownInitial, setHasShownInitial] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (summary && !hasShownInitial) {
      setShowSpeech(true)
      setHasShownInitial(true)
    }
  }, [summary, hasShownInitial])

  useEffect(() => {
    if (showSpeech) {
      timerRef.current = setTimeout(() => {
        setShowSpeech(false)
      }, 10000)

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
      }
    }

    return undefined
  }, [showSpeech])

  const handleClick = () => {
    if (!showSpeech && summary) {
      setShowSpeech(true)
    }

    onMascotClick?.()
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
      }}
    >
      <Grow
        in={showSpeech}
        timeout={600}
        unmountOnExit
        style={{
          transformOrigin: 'bottom right',
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            bottom: 100,
            left: 16,
            right: 16,
          }}
        >
          <Paper
            sx={{
              position: 'relative',
              p: 2,
              borderRadius: 2,
              bgcolor: 'white',
              boxShadow: 3,
              border: '1px solid',
              borderColor: 'divider',
              '&::before': {
                content: '""',
                position: 'absolute',
                bottom: '-11px',
                right: '28px',
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderWidth: '11px 11px 0 0',
                borderColor: '#e0e0e0 transparent transparent transparent',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: '-10px',
                right: '29px',
                width: 0,
                height: 0,
                borderStyle: 'solid',
                borderWidth: '10px 10px 0 0',
                borderColor: 'white transparent transparent transparent',
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {summary ? parseHighlightedText(summary) : '読み込み中だモグ...'}
            </Typography>
          </Paper>
        </Box>
      </Grow>

      <IconButton
        onClick={handleClick}
        sx={{
          width: 64,
          height: 64,
          p: 0,
          bgcolor: 'white',
          boxShadow: 3,
          '&:hover': {
            bgcolor: 'white',
            transform: 'scale(1.1)',
          },
          transition: 'transform 0.2s',
        }}
      >
        <img
          src="/moguwan.png"
          alt="もぐわん"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      </IconButton>
    </Box>
  )
}

export default MoguwanMascot
