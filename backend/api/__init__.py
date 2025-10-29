from fastapi import APIRouter

from . import groups, restaurants


router = APIRouter()
router.include_router(groups.router)
router.include_router(restaurants.router)
