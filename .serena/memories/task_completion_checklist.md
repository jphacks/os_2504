# Task Completion Checklist

## What to Do When a Task is Completed

### Linting
Run ESLint on the frontend code:
```bash
cd frontend
npm run lint
```

### Testing
**Note**: Currently no automated tests are implemented in this project.

Manual testing should be performed for:
- Location permission handling
- Swipe gestures (left/right)
- Bookmark persistence across sessions
- Restaurant search with different preferences
- PWA installation functionality
- API endpoint responses

### Code Style Verification

#### Backend (Python)
- Ensure PascalCase for classes
- Ensure snake_case for functions and variables
- Use type hints with Pydantic models
- Verify environment variables are properly loaded

#### Frontend (JavaScript/React)
- Run `npm run lint` to check for ESLint violations
- Ensure PascalCase for React components
- Ensure camelCase for functions and variables
- Verify proper import organization
- Check for unused variables (unless prefixed with `_` or uppercase)

### Before Committing
1. Run frontend linting: `cd frontend && npm run lint`
2. Test both backend and frontend are running properly
3. Verify no sensitive data (API keys) in committed files
4. Check `.gitignore` excludes `.env` files
5. Ensure code follows project conventions

### Build Verification
```bash
cd frontend
npm run build
```
- Verify build succeeds without errors
- Check `dist/` directory is created

### Server Verification
1. Backend should run without errors:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```
2. Frontend should run without errors:
   ```bash
   cd frontend
   npm run dev
   ```
3. Test API connectivity between frontend and backend
4. Verify CORS configuration allows frontend origin

## Design Patterns and Guidelines

### Frontend
- Use React hooks (useState, useEffect) for state management
- Local storage for persisting user preferences and bookmarks
- Material-UI components for consistent UI
- Responsive design within phone frame component
- Swipe gestures using react-spring animations

### Backend
- RESTful API design
- Pydantic models for request/response validation
- Environment-based configuration
- CORS middleware for frontend communication
- Async/await for HTTP requests to external APIs

### Error Handling
- HTTPException for backend errors
- Try-catch blocks for API calls
- User-friendly error messages in frontend
- Proper status codes in API responses
