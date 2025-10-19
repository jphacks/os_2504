import type { ReactElement } from 'react'
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'

interface AppHeaderProps {
  title: string
  onBack?: () => void
}

const AppHeader = ({ title, onBack }: AppHeaderProps): ReactElement => {
  return (
    <AppBar position="static" color="transparent" elevation={0}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: { xs: 1.5, sm: 3 },
        }}
      >
        {onBack && (
          <IconButton
            edge="start"
            onClick={onBack}
            sx={{
              mr: 0.5,
              bgcolor: 'rgba(255,255,255,0.85)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' },
            }}
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
        )}
        <Box
          component="img"
          src="/moguwan_icon.png"
          alt="MoguFinder アイコン"
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        />
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

export default AppHeader
