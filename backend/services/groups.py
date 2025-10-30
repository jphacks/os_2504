import secrets
from typing import Dict, List, Optional
from urllib.parse import quote

from sqlalchemy.exc import IntegrityError

from backend.config import FRONTEND_BASE_URL
from backend.repository import groups as group_repo
from backend.schemas.groups import (
    CandidateResult,
    GroupCreateRequest,
    GroupCreateResponse,
    GroupInfoResponse,
    GroupResultsResponse,
    SearchPreferences,
    VoteRequest,
)
from backend.schemas.restaurants import Restaurant, Review

from . import restaurants as restaurant_service
from .database import AsyncSessionLocal
from .exceptions import ServiceError
from .models import GroupModel, GroupRestaurantModel


async def create_group(group_request: GroupCreateRequest, member_id: str) -> GroupCreateResponse:
    preferences = _create_preferences_from_request(group_request)
    restaurants = await restaurant_service.fetch_restaurants_from_google(preferences)

    async with AsyncSessionLocal() as session:
        try:
            group_id = await _generate_unique_group_id(session)
            group = GroupModel(
                id=group_id,
                group_name=group_request.group_name,
                organizer_id=member_id,
                latitude=preferences.latitude,
                longitude=preferences.longitude,
                radius=preferences.radius,
                min_price=preferences.min_price,
                max_price=preferences.max_price,
                types=preferences.types or [],
                status="voting",
            )
            await group_repo.add_group(session, group)
            await group_repo.ensure_member(session, group_id, member_id)
            await group_repo.add_restaurants(session, _build_restaurant_models(group_id, restaurants))

            await session.commit()
        except ServiceError:
            await session.rollback()
            raise
        except IntegrityError as exc:
            await session.rollback()
            raise ServiceError(500, "Failed to create group") from exc
        except Exception as exc:
            await session.rollback()
            raise ServiceError(500, "Failed to create group") from exc

    base_url = FRONTEND_BASE_URL.rstrip("/")
    invite_url = f"{base_url}/group/{group_id}"
    organizer_join_url = f"{invite_url}?memberId={quote(member_id)}"

    return GroupCreateResponse(
        group_id=group_id,
        invite_url=invite_url,
        organizer_id=member_id,
        organizer_join_url=organizer_join_url,
        group_name=group_request.group_name,
    )


async def get_group_info(group_id: str, member_id: Optional[str]) -> GroupInfoResponse:
    async with AsyncSessionLocal() as session:
        try:
            group = await group_repo.fetch_group(session, group_id)
            if not group:
                raise ServiceError(404, "Group not found")

            if member_id:
                await group_repo.ensure_member(session, group_id, member_id)

            members = await group_repo.fetch_member_ids(session, group_id)

            preferences = _preferences_from_group_model(group)
            await session.commit()
        except ServiceError:
            await session.rollback()
            raise
        except Exception as exc:
            await session.rollback()
            raise ServiceError(500, "Failed to get group information") from exc

    return GroupInfoResponse(
        group_id=group.id,
        status=group.status,
        organizer_id=group.organizer_id,
        members=members,
        created_at=group.created_at,
        preferences=preferences,
        group_name=group.group_name,
    )


async def list_group_candidates(
    group_id: str,
    member_id: Optional[str],
    start: int,
    limit: int,
) -> List[Restaurant]:
    async with AsyncSessionLocal() as session:
        try:
            group = await group_repo.fetch_group(session, group_id)
            if not group:
                raise ServiceError(404, "Group not found")

            voted_place_ids: set[str] = set()
            if member_id:
                await group_repo.ensure_member(session, group_id, member_id)
                voted_place_ids = set(await group_repo.fetch_member_vote_place_ids(session, group_id, member_id))

            restaurant_rows = await group_repo.fetch_restaurants(session, group_id)

            restaurants = [_restaurant_from_model(row) for row in restaurant_rows]
            if voted_place_ids:
                restaurants = [
                    restaurant for restaurant in restaurants if restaurant.place_id not in voted_place_ids
                ]

            slice_end = start + limit
            response = restaurants[start:slice_end]

            await session.commit()
        except ServiceError:
            await session.rollback()
            raise
        except Exception as exc:
            await session.rollback()
            raise ServiceError(500, "Failed to get group candidates") from exc

    return response


async def submit_vote(group_id: str, member_id: str, vote_request: VoteRequest) -> None:
    async with AsyncSessionLocal() as session:
        try:
            group = await group_repo.fetch_group(session, group_id)
            if not group:
                raise ServiceError(404, "Group not found")
            if group.status != "voting":
                raise ServiceError(400, "Group is not accepting votes")

            await group_repo.ensure_member(session, group_id, member_id)

            if not await group_repo.candidate_exists(session, group_id, vote_request.candidate_id):
                raise ServiceError(404, "Candidate not found")

            existing_vote = await group_repo.get_vote(session, group_id, member_id, vote_request.candidate_id)

            if existing_vote:
                existing_vote.value = vote_request.value
            else:
                await group_repo.create_vote(session, group_id, member_id, vote_request.candidate_id, vote_request.value)

            await session.commit()
        except ServiceError:
            await session.rollback()
            raise
        except Exception as exc:
            await session.rollback()
            raise ServiceError(500, "Failed to submit vote") from exc


async def finish_group(group_id: str, member_id: str) -> GroupResultsResponse:
    async with AsyncSessionLocal() as session:
        try:
            group = await group_repo.fetch_group(session, group_id)
            if not group:
                raise ServiceError(404, "Group not found")
            if group.organizer_id != member_id:
                raise ServiceError(403, "Only the organizer can finish the group")

            if group.status != "finished":
                group.status = "finished"

            await session.commit()
            status = group.status
        except ServiceError:
            await session.rollback()
            raise
        except Exception as exc:
            await session.rollback()
            raise ServiceError(500, "Failed to finish group") from exc

    results = await _calculate_group_results(group_id)

    return GroupResultsResponse(
        group_id=group_id,
        status=status,
        results=results,
    )


async def get_group_results(group_id: str) -> GroupResultsResponse:
    async with AsyncSessionLocal() as session:
        try:
            group = await group_repo.fetch_group(session, group_id)
            if not group:
                raise ServiceError(404, "Group not found")
            if group.status != "finished":
                raise ServiceError(404, "Results not ready")
            await session.commit()
        except ServiceError:
            await session.rollback()
            raise
        except Exception as exc:
            await session.rollback()
            raise ServiceError(500, "Failed to get group results") from exc

    results = await _calculate_group_results(group_id)

    return GroupResultsResponse(
        group_id=group_id,
        status="finished",
        results=results,
    )


async def _calculate_group_results(group_id: str) -> List[CandidateResult]:
    async with AsyncSessionLocal() as session:
        try:
            restaurant_rows = await group_repo.fetch_restaurants(session, group_id)

            restaurant_map: Dict[str, Restaurant] = {
                row.place_id: _restaurant_from_model(row) for row in restaurant_rows
            }

            vote_rows = await group_repo.fetch_votes(session, group_id)

            counts: Dict[str, Dict[str, int]] = {}
            for place_id, value in vote_rows:
                if place_id not in restaurant_map:
                    continue
                place_counts = counts.setdefault(place_id, {"like": 0, "dislike": 0})
                if value == "like":
                    place_counts["like"] += 1
                elif value == "dislike":
                    place_counts["dislike"] += 1

            results: List[CandidateResult] = []
            for place_id, restaurant in restaurant_map.items():
                place_counts = counts.get(place_id, {"like": 0, "dislike": 0})
                likes = place_counts["like"]
                dislikes = place_counts["dislike"]
                if likes == 0 and dislikes == 0:
                    continue

                score = likes - dislikes
                results.append(
                    CandidateResult(
                        restaurant=restaurant,
                        score=float(score),
                        likes=likes,
                        dislikes=dislikes,
                    )
                )

            if not results:
                for restaurant in list(restaurant_map.values())[:5]:
                    results.append(
                        CandidateResult(
                            restaurant=restaurant,
                            score=0.0,
                            likes=0,
                            dislikes=0,
                        )
                    )

            results.sort(
                key=lambda item: (
                    item.score,
                    item.likes,
                    item.restaurant.rating or 0.0,
                ),
                reverse=True,
            )

            await session.commit()
        except Exception as exc:
            await session.rollback()
            raise ServiceError(500, "Failed to load group results") from exc

    return results


def _create_preferences_from_request(group_request: GroupCreateRequest) -> SearchPreferences:
    data = group_request.model_dump(exclude={"group_name"})
    return SearchPreferences(**data)


async def _generate_unique_group_id(session) -> str:
    while True:
        candidate = secrets.token_urlsafe(6)
        if not await group_repo.group_exists(session, candidate):
            return candidate


def _preferences_from_group_model(group: GroupModel) -> SearchPreferences:
    return SearchPreferences(
        latitude=group.latitude,
        longitude=group.longitude,
        radius=group.radius,
        min_price=group.min_price,
        max_price=group.max_price,
        types=group.types or ["restaurant", "cafe"],
    )


def _restaurant_from_model(model: GroupRestaurantModel) -> Restaurant:
    reviews: List[Review] = []
    if model.reviews:
        reviews = [Review(**review) for review in model.reviews]

    return Restaurant(
        place_id=model.place_id,
        name=model.name,
        address=model.address or "",
        rating=model.rating,
        price_level=model.price_level,
        photo_url=model.photo_url,
        photo_urls=model.photo_urls or [],
        lat=model.lat,
        lng=model.lng,
        types=model.types or [],
        reviews=reviews,
        phone_number=model.phone_number,
        website=model.website,
        google_maps_url=model.google_maps_url,
        user_ratings_total=model.user_ratings_total,
        opening_hours=model.opening_hours,
        summary=model.summary,
    )


def _build_restaurant_models(group_id: str, restaurants: List[Restaurant]) -> List[GroupRestaurantModel]:
    models: List[GroupRestaurantModel] = []
    for index, restaurant in enumerate(restaurants):
        review_payload = None
        if restaurant.reviews:
            review_payload = [review.model_dump(mode="python") for review in restaurant.reviews]

        models.append(
            GroupRestaurantModel(
                group_id=group_id,
                place_id=restaurant.place_id,
                position=index,
                name=restaurant.name,
                address=restaurant.address,
                rating=restaurant.rating,
                price_level=restaurant.price_level,
                photo_url=restaurant.photo_url,
                photo_urls=restaurant.photo_urls or [],
                lat=restaurant.lat,
                lng=restaurant.lng,
                types=restaurant.types or [],
                reviews=review_payload,
                phone_number=restaurant.phone_number,
                website=restaurant.website,
                google_maps_url=restaurant.google_maps_url,
                user_ratings_total=restaurant.user_ratings_total,
                opening_hours=restaurant.opening_hours,
                summary=restaurant.summary,
            )
        )
    return models
