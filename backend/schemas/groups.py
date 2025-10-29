from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from .restaurants import Restaurant


class SearchPreferences(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="緯度（-90〜90）")
    longitude: float = Field(..., ge=-180, le=180, description="経度（-180〜180）")
    radius: int = Field(default=1000, ge=100, le=5000, description="検索半径（100〜5000m）")
    min_price: Optional[int] = Field(default=0, ge=0, le=4)
    max_price: Optional[int] = Field(default=4, ge=0, le=4)
    types: Optional[List[str]] = Field(default_factory=lambda: ["restaurant", "cafe"])


class GroupCreateRequest(SearchPreferences):
    group_name: Optional[str] = Field(default=None, max_length=50, description="グループ名（任意）")


class GroupCreateResponse(BaseModel):
    group_id: str
    invite_url: str
    organizer_id: str
    organizer_join_url: str
    group_name: Optional[str] = None


class GroupInfoResponse(BaseModel):
    group_id: str
    status: str
    organizer_id: str
    members: List[str]
    created_at: datetime
    preferences: SearchPreferences
    group_name: Optional[str] = None


class VoteRequest(BaseModel):
    candidate_id: str
    value: Literal["like", "dislike"]


class CandidateResult(BaseModel):
    restaurant: Restaurant
    score: float
    likes: int
    dislikes: int


class GroupResultsResponse(BaseModel):
    group_id: str
    status: str
    results: List[CandidateResult]
