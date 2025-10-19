# Codebase Structure

## Directory Layout

```
moguPOC/
├── backend/
│   ├── main.py              # FastAPI application with endpoints
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Backend environment variables (GOOGLE_API_KEY)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application component
│   │   ├── main.jsx         # React entry point
│   │   ├── components/
│   │   │   ├── Settings.jsx           # User preferences configuration
│   │   │   ├── RestaurantCard.jsx     # Restaurant display card
│   │   │   ├── BookmarkList.jsx       # Saved restaurants list
│   │   │   ├── Navigation.jsx         # Navigation component
│   │   │   ├── MiniMap.jsx            # Map display component
│   │   │   └── PhoneFrame.jsx         # Phone frame wrapper
│   │   └── services/
│   │       ├── api.js       # API client for backend communication
│   │       └── storage.js   # Local storage management
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies and scripts
│   ├── vite.config.js       # Vite configuration
│   └── eslint.config.js     # ESLint configuration
├── .env                     # Root environment variables
├── .env.example             # Example environment file
├── CLAUDE.md                # Claude Code instructions
└── README.md                # Project documentation
```

## Backend Structure (backend/main.py)
- **Models**: 
  - `SearchPreferences`: User search criteria (location, radius, price, types)
  - `Review`: Restaurant review data
  - `Restaurant`: Restaurant information with photos, reviews, location
- **Endpoints**:
  - `POST /api/search`: Search for restaurants based on preferences
  - `GET /api/restaurant/{place_id}`: Get detailed restaurant information
- **CORS**: Configured for localhost:5173, 3000, 8001

## Frontend Structure
- **App.jsx**: Main state management, navigation, and restaurant card logic
- **Components**: Reusable UI components for settings, cards, bookmarks, navigation
- **Services**: API communication and local storage abstraction
