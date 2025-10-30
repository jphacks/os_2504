from typing import List, Optional

import httpx

from backend.constants import (
    REVIEW_LINE_TEMPLATE,
    SUMMARY_CARD_PROMPT_TEMPLATE,
    SUMMARY_DETAIL_PROMPT_TEMPLATE,
)
from backend.config import (
    GEMINI_API_URL,
    GOOGLE_API_KEY,
    GOOGLE_PLACE_DETAILS_URL,
    GOOGLE_PLACES_API_URL,
)
from backend.schemas.groups import SearchPreferences
from backend.schemas.restaurants import Restaurant, Review, SummarizeRequest

from .exceptions import ServiceError


async def search_restaurants(preferences: SearchPreferences) -> List[Restaurant]:
    return await fetch_restaurants_from_google(preferences)


async def fetch_restaurants_from_google(preferences: SearchPreferences) -> List[Restaurant]:
    if not GOOGLE_API_KEY:
        raise ServiceError(500, "Google API key not configured")

    params = {
        "key": GOOGLE_API_KEY,
        "location": f"{preferences.latitude},{preferences.longitude}",
        "radius": preferences.radius,
        "type": "restaurant",
        "opennow": True,
        "language": "ja",
    }

    if preferences.min_price is not None and preferences.max_price is not None:
        params["minprice"] = preferences.min_price
        params["maxprice"] = preferences.max_price

    restaurants: List[Restaurant] = []

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(GOOGLE_PLACES_API_URL, params=params)
        except Exception as exc:
            raise ServiceError(500, f"Failed to fetch restaurants: {exc}") from exc

        if response.status_code != 200:
            raise ServiceError(response.status_code, "Failed to fetch restaurants")

        data = response.json()

        if data.get("status") not in {"OK", "ZERO_RESULTS"}:
            raise ServiceError(500, f"Google API error: {data.get('status')}")

        for place in data.get("results", []):
            photo_url = None
            photo_urls: List[str] = []

            if place.get("photos"):
                for i, photo in enumerate(place["photos"][:5]):
                    photo_ref = photo.get("photo_reference")
                    if photo_ref:
                        url = (
                            f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800"
                            f"&photoreference={photo_ref}&key={GOOGLE_API_KEY}"
                        )
                        photo_urls.append(url)
                        if i == 0:
                            photo_url = url

            detail_params = {
                "key": GOOGLE_API_KEY,
                "place_id": place["place_id"],
                "fields": "reviews,rating,user_ratings_total,photos,formatted_phone_number,website,url",
                "language": "ja",
            }

            detail_response = await client.get(GOOGLE_PLACE_DETAILS_URL, params=detail_params)
            reviews: List[Review] = []

            if detail_response.status_code == 200:
                detail_data = detail_response.json()
                if detail_data.get("status") == "OK":
                    detail_result = detail_data.get("result", {})

                    detail_photos = detail_result.get("photos", [])
                    if detail_photos and len(photo_urls) < 5:
                        for photo in detail_photos[1:]:
                            if len(photo_urls) >= 5:
                                break
                            photo_ref = photo.get("photo_reference")
                            if photo_ref:
                                url = (
                                    "https://maps.googleapis.com/maps/api/place/photo?"
                                    f"maxwidth=800&photoreference={photo_ref}&key={GOOGLE_API_KEY}"
                                )
                                if url not in photo_urls:
                                    photo_urls.append(url)

                    raw_reviews = detail_result.get("reviews", [])
                    for review in raw_reviews[:5]:
                        reviews.append(
                            Review(
                                author_name=review.get("author_name", ""),
                                rating=review.get("rating", 0),
                                text=review.get("text", ""),
                                time=review.get("relative_time_description", ""),
                            )
                        )

            phone_number = None
            website = None
            google_maps_url = None
            user_ratings_total = None

            if detail_response.status_code == 200:
                detail_data_result = detail_response.json()
                if detail_data_result.get("status") == "OK":
                    detail_info = detail_data_result.get("result", {})
                    phone_number = detail_info.get("formatted_phone_number")
                    website = detail_info.get("website")
                    google_maps_url = detail_info.get("url")
                    user_ratings_total = detail_info.get("user_ratings_total")

            summary = await _generate_summary(place.get("name", ""), reviews, "card")

            restaurant = Restaurant(
                place_id=place["place_id"],
                name=place["name"],
                address=place.get("vicinity", ""),
                rating=place.get("rating"),
                price_level=place.get("price_level"),
                photo_url=photo_url,
                photo_urls=photo_urls,
                lat=place["geometry"]["location"]["lat"],
                lng=place["geometry"]["location"]["lng"],
                types=place.get("types", []),
                reviews=reviews,
                phone_number=phone_number,
                website=website,
                google_maps_url=google_maps_url,
                user_ratings_total=user_ratings_total,
                summary=summary,
            )
            restaurants.append(restaurant)

    return restaurants


async def get_restaurant_details(place_id: str) -> Restaurant:
    if not GOOGLE_API_KEY:
        raise ServiceError(500, "Google API key not configured")

    params = {
        "key": GOOGLE_API_KEY,
        "place_id": place_id,
        "fields": "name,formatted_address,rating,price_level,photos,geometry,types,reviews,user_ratings_total,"
        "formatted_phone_number,website,url,opening_hours",
        "language": "ja",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_PLACE_DETAILS_URL, params=params)

        if response.status_code != 200:
            raise ServiceError(response.status_code, "Failed to fetch restaurant details")

        data = response.json()

        if data.get("status") != "OK":
            raise ServiceError(500, f"Google API error: {data.get('status')}")

        place = data.get("result", {})

        photo_url = None
        photo_urls: List[str] = []

        if place.get("photos"):
            for i, photo in enumerate(place["photos"][:5]):
                photo_ref = photo.get("photo_reference")
                if photo_ref:
                    url = (
                        f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800"
                        f"&photoreference={photo_ref}&key={GOOGLE_API_KEY}"
                    )
                    photo_urls.append(url)
                    if i == 0:
                        photo_url = url

        reviews = []
        raw_reviews = place.get("reviews", [])
        for review in raw_reviews[:5]:
            reviews.append(
                Review(
                    author_name=review.get("author_name", ""),
                    rating=review.get("rating", 0),
                    text=review.get("text", ""),
                    time=review.get("relative_time_description", ""),
                )
            )

        summary = await _generate_summary(place.get("name", ""), reviews, "detail")

        return Restaurant(
            place_id=place_id,
            name=place.get("name", ""),
            address=place.get("formatted_address", ""),
            rating=place.get("rating"),
            price_level=place.get("price_level"),
            photo_url=photo_url,
            photo_urls=photo_urls,
            lat=place.get("geometry", {}).get("location", {}).get("lat", 0),
            lng=place.get("geometry", {}).get("location", {}).get("lng", 0),
            types=place.get("types", []),
            reviews=reviews,
            phone_number=place.get("formatted_phone_number"),
            website=place.get("website"),
            google_maps_url=place.get("url"),
            user_ratings_total=place.get("user_ratings_total"),
            opening_hours=place.get("opening_hours"),
            summary=summary,
        )


async def summarize_restaurant(request_data: SummarizeRequest) -> str:
    summary = await _generate_summary(request_data.restaurant_name, request_data.reviews, request_data.format or "card")
    if summary is None:
        raise ServiceError(500, "No summary generated")
    return summary


async def _generate_summary(restaurant_name: str, reviews: List[Review], format: str = "card") -> Optional[str]:
    if not GOOGLE_API_KEY:
        raise ServiceError(500, "Google API key not configured")

    if not reviews or len(reviews) < 5:
        return None

    reviews_text = "\n".join(
        [
            REVIEW_LINE_TEMPLATE.format(
                author_name=review.author_name,
                rating=review.rating,
                text=review.text,
            )
            for review in reviews
        ]
    )

    if format == "detail":
        prompt = SUMMARY_DETAIL_PROMPT_TEMPLATE.format(
            restaurant_name=restaurant_name,
            reviews_text=reviews_text,
        )
    else:
        prompt = SUMMARY_CARD_PROMPT_TEMPLATE.format(
            restaurant_name=restaurant_name,
            reviews_text=reviews_text,
        )

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{GEMINI_API_URL}?key={GOOGLE_API_KEY}",
                json={
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": prompt,
                                }
                            ]
                        }
                    ]
                },
                timeout=30.0,
            )
        except httpx.TimeoutException as exc:
            raise ServiceError(504, "Gemini API timeout") from exc
        except Exception as exc:
            raise ServiceError(500, f"Error calling Gemini API: {exc}") from exc

        if response.status_code != 200:
            raise ServiceError(response.status_code, "Failed to call Gemini API")

        data = response.json()

        if "candidates" in data and len(data["candidates"]) > 0:
            summary = data["candidates"][0]["content"]["parts"][0]["text"]
            return summary.strip()

        return None
