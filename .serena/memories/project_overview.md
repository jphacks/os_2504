# Project Overview

## Purpose
This is a restaurant finder PWA (Progressive Web App) that helps users discover restaurants based on their preferences using a Tinder-like swipe interface. Users can swipe right to bookmark restaurants they like and swipe left to reject them.

## Tech Stack

### Backend
- **Framework**: FastAPI 0.109.0
- **Server**: Uvicorn 0.27.0
- **HTTP Client**: httpx 0.26.0
- **Configuration**: python-dotenv 1.0.0
- **Validation**: Pydantic 2.8+
- **External API**: Google Places API

### Frontend
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.0
- **UI Library**: Material-UI (MUI) 7.3.1
- **Swipe Functionality**: react-spring/web 10.0.1
- **HTTP Client**: Axios 1.11.0
- **Styling**: Emotion (React & Styled)
- **Linting**: ESLint 9.32.0

## Key Features
- Location-based restaurant search using Google Places API
- Tinder-like swipe interface for browsing restaurants
- Bookmark and reject functionality with local storage
- User preference configuration (radius, price range, types)
- Mini-map showing restaurant location
- PWA capabilities for installation and offline support

## Environment Requirements
- Python 3.x with pip
- Node.js with npm
- Google API key with Places API enabled
- Location permissions granted in browser
