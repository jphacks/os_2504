import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF8C42',
      light: '#FFB782',
      dark: '#E56A16',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#355070',
      light: '#58709F',
      dark: '#1E3C5A',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2A9D8F',
      light: '#52B7A6',
      dark: '#1E6F68',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E63946',
      light: '#F28B90',
      dark: '#B0212E',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F7F4EF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2A2A2A',
      secondary: '#6B6774',
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
        containedPrimary: {
          background: '#FF8C42',
          '&:hover': {
            background: '#E56A16',
          },
          color: '#FFFFFF',
        },
        containedSecondary: {
          background: '#355070',
          '&:hover': {
            background: '#1E3C5A',
          },
          color: '#FFFFFF',
        },
        containedSuccess: {
          background: '#2A9D8F',
          '&:hover': {
            background: '#1E6F68',
          },
          color: '#FFFFFF',
        },
        containedError: {
          background: '#E63946',
          '&:hover': {
            background: '#B0212E',
          },
          color: '#FFFFFF',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          borderRadius: 16,
          overflow: 'hidden',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
  },
})

export default theme
