# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
MoguFinder is a restaurant finder PWA (Progressive Web App) that helps users discover restaurants based on their preferences using a Tinder-like swipe interface.

## Architecture
- **Backend**: FastAPI server that integrates with Google Places API and Gemini AI API
- **Frontend**: React PWA with Material-UI and swipe functionality
- **API Communication**: RESTful API with CORS enabled
- **AI Integration**: Gemini 2.5 Flash Lite model for restaurant review summarization

## Common Development Commands

### Docker (Recommended)
```bash
# Start all services
docker-compose up

# Start services in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up --build

# View logs
docker-compose logs -f
```

### Local Development

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install --legacy-peer-deps  # Required due to react-tinder-card peer dependencies
npm run dev
```

## Key Components

### Backend (FastAPI)
- `backend/main.py`: Main API server with endpoints for restaurant search and AI summarization
  - `/api/restaurants/search`: Search restaurants near a location
  - `/api/restaurants/{place_id}`: Get detailed restaurant information
  - `/api/restaurants/summarize`: Generate AI-powered review summaries using Gemini API
- Google Places API integration for fetching restaurant data and reviews
- Gemini AI API integration (`gemini-2.5-flash-lite` model) for review summarization
- CORS configuration for frontend communication

### Frontend (React)
- `src/App.jsx`: Main application component with navigation and state management
- `src/components/Settings.jsx`: User preferences configuration
- `src/components/RestaurantCard.jsx`: Restaurant display card component with swipe functionality
- `src/components/RestaurantDetail.jsx`: Detailed restaurant view with photo navigation, reviews, and map
- `src/components/MoguwanMascot.jsx`: AI mascot component that displays review summaries in animated speech bubbles
  - Keyword highlighting with `***word***` format parsed from Gemini responses
  - Auto-hide timer (5 seconds) with Grow animation
  - useRef timer management for React Strict Mode compatibility
- `src/components/BookmarkList.jsx`: Saved restaurants list
- `src/services/api.js`: API client for backend communication (includes `summarizeRestaurant`)
- `src/services/storage.js`: Local storage management for preferences and bookmarks

## Environment Setup
1. Create `.env` file in the root directory
2. Add Google API key: `GOOGLE_API_KEY=your_api_key_here`

## Docker Deployment
The application is fully containerized and can be run using Docker Compose:

### Prerequisites
- Docker installed
- Docker Compose installed
- `.env` file with `GOOGLE_API_KEY`

### Access
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Testing
Currently no automated tests are implemented. Manual testing recommended for:
- Location permission handling
- Swipe gestures
- Bookmark persistence
- PWA installation

## Important Notes
- The app requires location permissions to function
- Google API key must have both Places API and Generative Language API (Gemini) enabled
- Frontend uses legacy peer dependencies due to react-tinder-card compatibility with React 19
- Gemini API uses the `gemini-2.5-flash-lite` model (lightweight and cost-effective)
- Review summaries use mascot character "moguwan" with speech ending in "〜モグ"
- Important keywords in AI responses are highlighted using `***keyword***` format

## React Development Notes
- When working with timers in React components, use separate useEffect hooks for initial state and timer management to handle React Strict Mode properly
- The MoguwanMascot component demonstrates proper timer cleanup patterns with useRef


# 注意
日本語でインタラクションすること