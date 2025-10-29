from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from backend.schemas.groups import GroupCreateRequest, GroupCreateResponse, GroupInfoResponse, GroupResultsResponse, VoteRequest
from backend.schemas.restaurants import Restaurant
from backend.services import groups as group_service
from backend.services.exceptions import ServiceError


router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.post("", response_model=GroupCreateResponse)
async def create_group(
    group_request: GroupCreateRequest,
    member_id: str = Query(..., min_length=1, max_length=64, description="作成者のメンバーID"),
) -> GroupCreateResponse:
    try:
        return await group_service.create_group(group_request, member_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/{group_id}", response_model=GroupInfoResponse)
async def get_group(
    group_id: str,
    member_id: Optional[str] = Query(default=None, min_length=1, max_length=64, description="参加者のメンバーID"),
) -> GroupInfoResponse:
    try:
        return await group_service.get_group_info(group_id, member_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/{group_id}/candidates", response_model=List[Restaurant])
async def get_group_candidates(
    group_id: str,
    member_id: Optional[str] = Query(default=None, min_length=1, max_length=64),
    start: int = Query(default=0, ge=0, description="候補の開始インデックス"),
    limit: int = Query(default=20, ge=1, le=50, description="取得する件数"),
) -> List[Restaurant]:
    try:
        return await group_service.list_group_candidates(group_id, member_id, start, limit)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/{group_id}/vote")
async def submit_vote(
    group_id: str,
    vote_request: VoteRequest,
    member_id: str = Query(..., min_length=1, max_length=64),
) -> dict:
    try:
        await group_service.submit_vote(group_id, member_id, vote_request)
        return {"status": "ok"}
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/{group_id}/finish", response_model=GroupResultsResponse)
async def finish_group(
    group_id: str,
    member_id: str = Query(..., min_length=1, max_length=64),
) -> GroupResultsResponse:
    try:
        return await group_service.finish_group(group_id, member_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/{group_id}/results", response_model=GroupResultsResponse)
async def get_group_results(group_id: str) -> GroupResultsResponse:
    try:
        return await group_service.get_group_results(group_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
