# FoodFinder API Specification

## Overview
- **Base URL (local development)**: `http://localhost:8001`
- **Version**: 1.0
- **Format**: JSON over HTTPS/HTTP
- **Authentication**: None (all endpoints are public). Access to Google APIs requires valid backend credentials.
- **Global Rate Limiting**: Handled by [SlowAPI](https://github.com/laurentS/slowapi). Each endpoint declares its own per-IP limit.
- **CORS**: Allowed origins are configured via the `ALLOWED_ORIGINS` environment variable (default: `http://localhost:5173,http://localhost:3000,http://localhost:8001,http://localhost`).

## Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | ✅ | Server-side API key used to call Google Places & Gemini APIs. Requests fail with `500` if missing. |
| `ALLOWED_ORIGINS` | optional | Comma-separated origins permitted by CORS middleware. |

## Data Models

### `SearchPreferences`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | `float` | ✅ | Latitude between -90 and 90. |
| `longitude` | `float` | ✅ | Longitude between -180 and 180. |
| `radius` | `int` | optional (default `1000`) | Search radius in meters (100–5000). |
| `min_price` | `int` | optional (default `0`) | Google price level lower bound (0–4). |
| `max_price` | `int` | optional (default `4`) | Google price level upper bound (0–4). |
| `types` | `string[]` | optional (default `["restaurant","cafe"]`) | Google Places types filter. |

### `Review`
| Field | Type | Description |
|-------|------|-------------|
| `author_name` | `string` | Reviewer display name. |
| `rating` | `int` | Rating (0–5). |
| `text` | `string` | Review text. |
| `time` | `string` | Relative time description (e.g., `"2 週間前"`). |

### `Restaurant`
Returned by search/detail endpoints.
| Field | Type | Description |
|-------|------|-------------|
| `place_id` | `string` | Google Place ID. |
| `name` | `string` | Establishment name. |
| `address` | `string` | Formatted address or vicinity. |
| `rating` | `number |null` | Average rating. |
| `price_level` | `int|null` | Google price level (0–4). |
| `photo_url` | `string|null` | Primary photo URL. |
| `photo_urls` | `string[]` | Up to 5 photo URLs. |
| `lat` / `lng` | `number` | Coordinates. |
| `types` | `string[]` | Google place types. |
| `reviews` | `Review[]` | Up to 5 recent reviews. |
| `phone_number` | `string|null` | Formatted phone number. |
| `website` | `string|null` | Official website. |
| `google_maps_url` | `string|null` | Google Maps deep link. |
| `user_ratings_total` | `int|null` | Total number of reviews. |
| `opening_hours` | `object|null` | Raw opening hours returned by Google. |
| `summary` | `string|null` | AI generated highlight. |

### `SummarizeRequest`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `restaurant_name` | `string` | ✅ | Display name sent to Gemini. |
| `reviews` | `Review[]` | ✅ | Reviews used for summarisation. |
| `format` | `"card" | "detail"` | optional (default `"card"`) | Output style. |

### `SummarizeResponse`
```json
{
  "summary": "string"
}
```

## Endpoints

### Health Check
```
GET /
```
- **Description**: Simple heartbeat endpoint.
- **Response**: `200 OK`
  ```json
  { "message": "Food Finder API" }
  ```

### Search Restaurants
```
POST /api/restaurants/search
```
- **Rate limit**: `10 requests / minute` per IP.
- **Description**: Proxies Google Places Nearby Search + Details to return curated restaurant cards with photos, reviews, and AI summaries.
- **Request Body**: `SearchPreferences`
  ```json
  {
    "latitude": 35.6809591,
    "longitude": 139.7673068,
    "radius": 1500,
    "min_price": 0,
    "max_price": 3,
    "types": ["restaurant", "cafe"]
  }
  ```
- **Response**: `200 OK` with `Restaurant[]`
  ```json
  [
    {
      "place_id": "ChIJxxxxxxxx",
      "name": "Sample Bistro",
      "address": "東京都千代田区...",
      "rating": 4.2,
      "price_level": 2,
      "photo_url": "https://maps.googleapis...",
      "photo_urls": ["https://maps.googleapis..."],
      "lat": 35.68,
      "lng": 139.76,
      "types": ["restaurant"],
      "reviews": [ { "author_name": "Taro", "rating": 5, "text": "Great!", "time": "2 週間前" } ],
      "phone_number": "03-xxxx-xxxx",
      "website": "https://sample.jp",
      "google_maps_url": "https://maps.google.com/...",
      "user_ratings_total": 120,
      "summary": "***雰囲気***がよく..."
    }
  ]
  ```
- **Error Codes**:
  | Status | When |
  |--------|------|
  | `400` | Request validation failure. |
  | `429` | Rate limit exceeded. |
  | `500` | Google API error, Gemini failure, or server exception. |

### Get Restaurant Details
```
GET /api/restaurants/{place_id}
```
- **Rate limit**: `20 requests / minute` per IP.
- **Path Params**: `place_id` – Google Place ID.
- **Description**: Fetches detailed information (opening hours, contact info) and generates a “detail” style AI summary.
- **Response**: `200 OK` with a single `Restaurant` object.
- **Errors**: Same as search endpoint. Returns `404` only if Google returns non-OK status mapped to error.

### Summarize Restaurant Reviews
```
POST /api/restaurants/summarize
```
- **Rate limit**: `30 requests / minute` per IP.
- **Description**: Generates an AI summary from supplied reviews without calling Google Places.
- **Request Body**: `SummarizeRequest`
  ```json
  {
    "restaurant_name": "Sample Bistro",
    "reviews": [
      {"author_name": "Taro", "rating": 5, "text": "Great!", "time": "1 week ago"},
      {"author_name": "Hanako", "rating": 4, "text": "Nice lunch", "time": "2 weeks ago"}
    ],
    "format": "detail"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "summary": "***ランチ***が人気で...モグ"
  }
  ```
- **Errors**: `504` when Gemini times out; `500` for missing API key or unexpected Gemini errors; validation errors return `400`.

## External Dependencies & Notes
- **Google Places API** is consulted for both search and details. API errors are surfaced as `500` (with logs printed server-side).
- **Google Gemini API** provides AI summaries (`generateContent` endpoint). Failure to produce a summary results in `500` or `504` response codes.
- **Photos**: Up to five photo URLs per restaurant are constructed using the `photo_reference` returned by Google Places.
- **Logging**: On errors, stack traces are printed to stdout for debugging.

## Changelog
| Date | Version | Notes |
|------|---------|-------|
| 2025-10-17 | 1.0 | Initial specification extracted from FastAPI service (`backend/main.py`). |
