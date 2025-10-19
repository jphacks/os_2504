from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional, Set
from datetime import datetime
import asyncio
import httpx
import os
import secrets
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from urllib.parse import quote

load_dotenv()

# レート制限の設定
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS設定 - 本番環境では環境変数で指定
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_PLACES_API_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
GOOGLE_PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
# Gemini API (最軽量・最安モデル)
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent"
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

class SearchPreferences(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="緯度（-90〜90）")
    longitude: float = Field(..., ge=-180, le=180, description="経度（-180〜180）")
    radius: int = Field(default=1000, ge=100, le=5000, description="検索半径（100〜5000m）")
    min_price: Optional[int] = Field(default=0, ge=0, le=4)
    max_price: Optional[int] = Field(default=4, ge=0, le=4)
    types: Optional[List[str]] = ["restaurant", "cafe"]

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
    photo_urls: Optional[List[str]] = []  # 複数の写真URL
    lat: float
    lng: float
    types: List[str]
    reviews: Optional[List[Review]] = []
    phone_number: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    user_ratings_total: Optional[int] = None
    opening_hours: Optional[Dict] = None  # 営業時間情報
    summary: Optional[str] = None  # AIサマリー

class SummarizeRequest(BaseModel):
    restaurant_name: str
    reviews: List[Review]
    format: Optional[str] = "card"  # "card" or "detail"


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


class GroupState:
    def __init__(
        self,
        group_id: str,
        preferences: SearchPreferences,
        organizer_id: str,
        group_name: Optional[str] = None,
        restaurants: Optional[List[Restaurant]] = None,
    ) -> None:
        self.group_id = group_id
        self.group_name = group_name
        self.preferences = preferences
        self.organizer_id = organizer_id
        self.created_at = datetime.utcnow()
        self.status: str = "voting"
        self.members: Set[str] = {organizer_id}
        self.restaurants: List[Restaurant] = restaurants or []
        self.restaurant_map: Dict[str, Restaurant] = {
            restaurant.place_id: restaurant for restaurant in self.restaurants
        }
        self.votes: Dict[str, Dict[str, str]] = {}
        self.results: Optional[List[CandidateResult]] = None

    def ensure_member(self, member_id: str) -> None:
        self.members.add(member_id)

    def upsert_restaurants(self, restaurants: List[Restaurant]) -> None:
        self.restaurants = restaurants
        self.restaurant_map = {restaurant.place_id: restaurant for restaurant in restaurants}


groups: Dict[str, GroupState] = {}
group_lock = asyncio.Lock()

async def generate_summary(restaurant_name: str, reviews: List[Review], format: str = "card") -> Optional[str]:
    """AIサマリーを生成する共通関数"""
    if not reviews or len(reviews) < 5:
        return None

    # レビューテキストを整形
    reviews_text = "\n".join([
        f"- {review.author_name}さんの評価: {review.rating}点\n  {review.text}"
        for review in reviews
    ])

    # Geminiへのプロンプト作成（形式によって変更）
    if format == "detail":
        # 詳細ページ用：吹き出し形式
        prompt = f"""以下は「{restaurant_name}」というレストランのレビューです。
これらのレビューを読んで、このレストランの魅力や特徴を100文字程度で簡潔にまとめてください。

重要な指示：
- 語尾は必ず「〜モグ」で終わらせてください。この語尾に自然に繋がるようにしてください。
- 親しみやすく、明るい口調で書いてください
- 改行を活用して見やすい文章にしてください
- あなたが重要だと思ったキーワード（料理名、特徴、雰囲気など）は ***キーワード*** の形式で囲んでください
  例: この店は***焼肉***が美味しくて、***雰囲気***も最高だモグ！

レビュー:
{reviews_text}

まとめ:"""
    else:
        # カード用：箇条書き形式
        prompt = f"""以下は「{restaurant_name}」というレストランのレビューです。
これらのレビューを読んで、このレストランの魅力や特徴を短めの3つの箇条書きでまとめてください。

重要な指示：
- 必ず3つの要点を箇条書き形式で出力してください
- 各要点は1行で、改行で区切ってください
- 各行の最初に「・」などの記号は不要です
- 親しみやすく、明るい口調で書いてください
- 語尾は「〜モグ」で終わらせてください
- あなたが重要だと思ったキーワード（料理名、特徴、雰囲気など）は ***キーワード*** の形式で囲んでください
  例:
  ***焼肉***が絶品で満足度高いモグ
  ***雰囲気***が良くてデートにピッタリだモグ
  ***コスパ***最高でリピート確定だモグ

レビュー:
{reviews_text}

まとめ:"""

    # Gemini API呼び出し
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{GEMINI_API_URL}?key={GOOGLE_API_KEY}",
                json={
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }]
                },
                timeout=30.0
            )

            if response.status_code != 200:
                return None

            data = response.json()

            if "candidates" in data and len(data["candidates"]) > 0:
                summary = data["candidates"][0]["content"]["parts"][0]["text"]
                return summary.strip()
            else:
                return None

        except Exception as e:
            print(f"Error generating summary: {str(e)}")
            return None

async def fetch_restaurants_from_google(preferences: SearchPreferences) -> List[Restaurant]:
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Google API key not configured")

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
        response = await client.get(GOOGLE_PLACES_API_URL, params=params)

        if response.status_code != 200:
            print(f"Google Places API error: status={response.status_code}, body={response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch restaurants")

        data = response.json()

        if data.get("status") not in {"OK", "ZERO_RESULTS"}:
            print(
                f"Google API error: status={data.get('status')}, error={data.get('error_message', 'No error message')}"
            )
            raise HTTPException(status_code=500, detail=f"Google API error: {data.get('status')}")

        for place in data.get("results", []):
            photo_url = None
            photo_urls: List[str] = []

            if place.get("photos"):
                for i, photo in enumerate(place["photos"][:5]):
                    photo_ref = photo.get("photo_reference")
                    if photo_ref:
                        url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference={photo_ref}&key={GOOGLE_API_KEY}"
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
                                url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference={photo_ref}&key={GOOGLE_API_KEY}"
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

            summary = await generate_summary(place["name"], reviews, "card")

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

def calculate_group_results(state: GroupState) -> List[CandidateResult]:
    results: List[CandidateResult] = []

    for place_id, restaurant in state.restaurant_map.items():
        likes = 0
        dislikes = 0

        for member_votes in state.votes.values():
            vote_value = member_votes.get(place_id)
            if vote_value == "like":
                likes += 1
            elif vote_value == "dislike":
                dislikes += 1

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
        for restaurant in state.restaurants[:5]:
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
    return results

@app.get("/")
async def root():
    return {"message": "Food Finder API"}

def _generate_unique_group_id() -> str:
    group_id = secrets.token_urlsafe(6)
    while group_id in groups:
        group_id = secrets.token_urlsafe(6)
    return group_id

def _create_preferences_from_request(group_request: GroupCreateRequest) -> SearchPreferences:
    data = group_request.model_dump(exclude={"group_name"})
    return SearchPreferences(**data)

@app.post("/api/groups", response_model=GroupCreateResponse)
async def create_group(
    group_request: GroupCreateRequest,
    member_id: str = Query(..., min_length=1, max_length=64, description="作成者のメンバーID"),
):
    preferences = _create_preferences_from_request(group_request)
    restaurants = await fetch_restaurants_from_google(preferences)

    async with group_lock:
        group_id = _generate_unique_group_id()
        state = GroupState(
            group_id=group_id,
            preferences=preferences,
            organizer_id=member_id,
            group_name=group_request.group_name,
            restaurants=restaurants,
        )
        groups[group_id] = state

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

@app.get("/api/groups/{group_id}", response_model=GroupInfoResponse)
async def get_group(
    group_id: str,
    member_id: Optional[str] = Query(default=None, min_length=1, max_length=64, description="参加者のメンバーID"),
):
    async with group_lock:
        state = groups.get(group_id)
        if not state:
            raise HTTPException(status_code=404, detail="Group not found")
        if member_id:
            state.ensure_member(member_id)

        return GroupInfoResponse(
            group_id=state.group_id,
            status=state.status,
            organizer_id=state.organizer_id,
            members=sorted(state.members),
            created_at=state.created_at,
            preferences=state.preferences,
            group_name=state.group_name,
        )

@app.get("/api/groups/{group_id}/candidates", response_model=List[Restaurant])
async def get_group_candidates(
    group_id: str,
    member_id: Optional[str] = Query(default=None, min_length=1, max_length=64),
    start: int = Query(default=0, ge=0, description="候補の開始インデックス"),
    limit: int = Query(default=20, ge=1, le=50, description="取得する件数"),
):
    async with group_lock:
        state = groups.get(group_id)
        if not state:
            raise HTTPException(status_code=404, detail="Group not found")
        if member_id:
            state.ensure_member(member_id)

        filtered_restaurants = state.restaurants
        if member_id:
            voted_place_ids = {pid for pid, _ in state.votes.get(member_id, {}).items()}
            if voted_place_ids:
                filtered_restaurants = [
                    restaurant
                    for restaurant in state.restaurants
                    if restaurant.place_id not in voted_place_ids
                ]

        slice_end = start + limit
        return filtered_restaurants[start:slice_end]

@app.post("/api/groups/{group_id}/vote")
async def submit_vote(
    group_id: str,
    vote_request: VoteRequest,
    member_id: str = Query(..., min_length=1, max_length=64),
):
    async with group_lock:
        state = groups.get(group_id)
        if not state:
            raise HTTPException(status_code=404, detail="Group not found")
        if state.status != "voting":
            raise HTTPException(status_code=400, detail="Group is not accepting votes")
        state.ensure_member(member_id)
        if vote_request.candidate_id not in state.restaurant_map:
            raise HTTPException(status_code=404, detail="Candidate not found")

        member_votes = state.votes.setdefault(member_id, {})
        member_votes[vote_request.candidate_id] = vote_request.value

    return {"status": "ok"}

@app.post("/api/groups/{group_id}/finish", response_model=GroupResultsResponse)
async def finish_group(
    group_id: str,
    member_id: str = Query(..., min_length=1, max_length=64),
):
    async with group_lock:
        state = groups.get(group_id)
        if not state:
            raise HTTPException(status_code=404, detail="Group not found")
        if state.organizer_id != member_id:
            raise HTTPException(status_code=403, detail="Only the organizer can finish the group")

        if state.status != "finished":
            results = calculate_group_results(state)
            state.results = results
            state.status = "finished"
        else:
            results = state.results or calculate_group_results(state)

        return GroupResultsResponse(
            group_id=state.group_id,
            status=state.status,
            results=results,
        )

@app.get("/api/groups/{group_id}/results", response_model=GroupResultsResponse)
async def get_group_results(group_id: str):
    async with group_lock:
        state = groups.get(group_id)
        if not state:
            raise HTTPException(status_code=404, detail="Group not found")
        if state.status != "finished" or not state.results:
            raise HTTPException(status_code=404, detail="Results not ready")

        return GroupResultsResponse(
            group_id=state.group_id,
            status=state.status,
            results=state.results,
        )

@app.post("/api/restaurants/search", response_model=List[Restaurant])
@limiter.limit("10/minute")
async def search_restaurants(request: Request, preferences: SearchPreferences):
    try:
        restaurants = await fetch_restaurants_from_google(preferences)
        return restaurants
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Unexpected error in search_restaurants: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/restaurants/{place_id}", response_model=Restaurant)
@limiter.limit("20/minute")
async def get_restaurant_details(request: Request, place_id: str):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Google API key not configured")
    
    params = {
        "key": GOOGLE_API_KEY,
        "place_id": place_id,
        "fields": "name,formatted_address,rating,price_level,photos,geometry,types,reviews,user_ratings_total,formatted_phone_number,website,url,opening_hours",
        "language": "ja"  # 日本語で結果を取得
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_PLACE_DETAILS_URL, params=params)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch restaurant details")
        
        data = response.json()
        
        if data.get("status") != "OK":
            raise HTTPException(status_code=500, detail=f"Google API error: {data.get('status')}")
        
        place = data.get("result", {})
        
        photo_url = None
        photo_urls = []
        
        # 利用可能な写真を最大5枚取得
        if place.get("photos"):
            for i, photo in enumerate(place["photos"][:5]):
                photo_ref = photo.get("photo_reference")
                if photo_ref:
                    url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference={photo_ref}&key={GOOGLE_API_KEY}"
                    photo_urls.append(url)
                    if i == 0:
                        photo_url = url
        
        # 写真が少ない場合のデバッグ情報
        print(f"Restaurant: {place.get('name', '')}, Photos found: {len(photo_urls)}")
        
        # レビューを取得（5件に変更）
        reviews = []
        raw_reviews = place.get("reviews", [])
        for review in raw_reviews[:5]:  # 最大5件のレビューを取得
            reviews.append(Review(
                author_name=review.get("author_name", ""),
                rating=review.get("rating", 0),
                text=review.get("text", ""),
                time=review.get("relative_time_description", "")
            ))

        # AIサマリーを生成（詳細ページ用）
        summary = await generate_summary(place.get("name", ""), reviews, "detail")

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
            summary=summary
        )

@app.post("/api/restaurants/summarize")
@limiter.limit("30/minute")
async def summarize_restaurant(request: Request, request_data: SummarizeRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Google API key not configured")

    # レビューテキストを整形
    reviews_text = "\n".join([
        f"- {review.author_name}さんの評価: {review.rating}点\n  {review.text}"
        for review in request_data.reviews
    ])

    # Geminiへのプロンプト作成（形式によって変更）
    if request_data.format == "detail":
        # 詳細ページ用：吹き出し形式
        prompt = f"""以下は「{request_data.restaurant_name}」というレストランのレビューです。
これらのレビューを読んで、このレストランの魅力や特徴を100文字程度で簡潔にまとめてください。

重要な指示：
- 語尾は必ず「〜モグ」で終わらせてください。この語尾に自然に繋がるようにしてください。
- 親しみやすく、明るい口調で書いてください
- 改行を活用して見やすい文章にしてください
- あなたが重要だと思ったキーワード（料理名、特徴、雰囲気など）は ***キーワード*** の形式で囲んでください
  例: この店は***焼肉***が美味しくて、***雰囲気***も最高だモグ！

レビュー:
{reviews_text}

まとめ:"""
    else:
        # カード用：箇条書き形式
        prompt = f"""以下は「{request_data.restaurant_name}」というレストランのレビューです。
これらのレビューを読んで、このレストランの魅力や特徴を短めの3つの箇条書きでまとめてください。

重要な指示：
- 必ず3つの要点を箇条書き形式で出力してください
- 各要点は1行で、改行で区切ってください
- 各行の最初に「・」などの記号は不要です
- 親しみやすく、明るい口調で書いてください
- 語尾は「〜モグ」で終わらせてください
- あなたが重要だと思ったキーワード（料理名、特徴、雰囲気など）は ***キーワード*** の形式で囲んでください
  例:
  ***焼肉***が絶品で満足度高いモグ
  ***雰囲気***が良くてデートにピッタリだモグ
  ***コスパ***最高でリピート確定だモグ

レビュー:
{reviews_text}

まとめ:"""

    # Gemini API呼び出し
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{GEMINI_API_URL}?key={GOOGLE_API_KEY}",
                json={
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }]
                },
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to call Gemini API")

            data = response.json()

            # レスポンスから要約テキストを抽出
            if "candidates" in data and len(data["candidates"]) > 0:
                summary = data["candidates"][0]["content"]["parts"][0]["text"]
                return {"summary": summary.strip()}
            else:
                raise HTTPException(status_code=500, detail="No summary generated")

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Gemini API timeout")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error calling Gemini API: {str(e)}")
