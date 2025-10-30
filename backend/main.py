from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from backend.api import router as api_router
from backend.api.deps import limiter
from backend.config import ALLOWED_ORIGINS
from backend.services.database import init_models, shutdown_engine


app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {"message": "Food Finder API"}


@app.on_event("startup")
async def on_startup() -> None:
    await init_models()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await shutdown_engine()
