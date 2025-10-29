from typing import List

from fastapi import APIRouter, HTTPException, Request

from backend.api.deps import limiter
from backend.schemas.groups import SearchPreferences
from backend.schemas.restaurants import Restaurant, SummarizeRequest
from backend.services import restaurants as restaurant_service
from backend.services.exceptions import ServiceError


router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])


@router.post("/search", response_model=List[Restaurant])
@limiter.limit("10/minute")
async def search_restaurants(request: Request, preferences: SearchPreferences) -> List[Restaurant]:
    del request  # request is required for rate limiting but unused directly
    try:
        return await restaurant_service.search_restaurants(preferences)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/{place_id}", response_model=Restaurant)
@limiter.limit("20/minute")
async def get_restaurant_details(request: Request, place_id: str) -> Restaurant:
    del request
    try:
        return await restaurant_service.get_restaurant_details(place_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/summarize")
@limiter.limit("30/minute")
async def summarize_restaurant(request: Request, request_data: SummarizeRequest) -> dict:
    del request
    try:
        summary = await restaurant_service.summarize_restaurant(request_data)
        return {"summary": summary}
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
