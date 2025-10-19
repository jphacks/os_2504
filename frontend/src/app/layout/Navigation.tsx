import type { ReactElement } from 'react'
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import FavoriteIcon from '@mui/icons-material/Favorite'
import TuneIcon from '@mui/icons-material/Tune'

interface NavigationProps {
  value: number
  onChange: (value: number) => void
}

const Navigation = ({ value, onChange }: NavigationProps): ReactElement => {
  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
        zIndex: 1000,
      }}
      elevation={8}
    >
      <BottomNavigation
        value={value}
        onChange={(_event, newValue: number) => onChange(newValue)}
        showLabels={false}
        sx={{
          height: 56,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '8px',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        <BottomNavigationAction
          icon={<RestaurantIcon sx={{ fontSize: 28 }} />}
          sx={{
            '&.Mui-selected .MuiSvgIcon-root': {
              fontSize: 32,
            },
          }}
        />
        <BottomNavigationAction
          icon={<FavoriteIcon sx={{ fontSize: 28 }} />}
          sx={{
            '&.Mui-selected .MuiSvgIcon-root': {
              fontSize: 32,
            },
          }}
        />
        <BottomNavigationAction
          icon={<TuneIcon sx={{ fontSize: 28 }} />}
          sx={{
            '&.Mui-selected .MuiSvgIcon-root': {
              fontSize: 32,
            },
          }}
        />
      </BottomNavigation>
    </Paper>
  )
}

export default Navigation
