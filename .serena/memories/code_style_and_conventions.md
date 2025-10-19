# Code Style and Conventions

## Python (Backend)

### Naming Conventions
- **Classes**: PascalCase (e.g., `SearchPreferences`, `Restaurant`)
- **Functions**: snake_case (e.g., `search_restaurants`)
- **Variables**: snake_case
- **Constants**: UPPER_SNAKE_CASE (e.g., `GOOGLE_API_KEY`, `GOOGLE_PLACES_API_URL`)

### Type Hints
- Use Pydantic models for request/response validation
- Type hints for function parameters: `latitude: float`, `radius: int`
- Optional types: `Optional[int]`, `Optional[List[str]]`

### Code Organization
- Environment variables loaded with `python-dotenv`
- Models defined before endpoints
- CORS middleware configuration at app initialization

### Comments
- Japanese comments are acceptable (e.g., `# 複数の写真URL`)
- Brief inline comments for clarification

## JavaScript/React (Frontend)

### Naming Conventions
- **Components**: PascalCase (e.g., `RestaurantCard`, `BookmarkList`)
- **Functions**: camelCase (e.g., `searchRestaurants`, `saveBookmark`)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE for truly constant values

### Component Structure
- Functional components with React hooks
- State management with `useState`, `useEffect`
- Props destructuring in function parameters
- Material-UI components for UI elements

### Import Organization
1. React imports
2. Third-party library imports (MUI, icons)
3. Local component imports
4. Service/utility imports

### ESLint Configuration
- Extends: `@eslint/js`, `react-hooks/recommended-latest`, `react-refresh/vite`
- ECMAScript 2020
- Browser globals
- Custom rule: Ignore unused vars matching `^[A-Z_]` pattern
- Ignores: `dist/` directory

### File Organization
- Components in `src/components/`
- Services in `src/services/`
- Styles in `.css` files alongside components
- Theme configuration in `src/theme.js`
