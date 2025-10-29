from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Review(BaseModel):
    author_name: str
    rating: int
    text: str
    time: str


class Restaurant(BaseModel):
    place_id: str
    name: str
    address: str
    rating: Optional[float]
    price_level: Optional[int]
    photo_url: Optional[str]
    photo_urls: Optional[List[str]] = Field(default_factory=list)
    lat: float
    lng: float
    types: List[str]
    reviews: Optional[List[Review]] = Field(default_factory=list)
    phone_number: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    user_ratings_total: Optional[int] = None
    opening_hours: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None


class SummarizeRequest(BaseModel):
    restaurant_name: str
    reviews: List[Review]
    format: Optional[str] = "card"
