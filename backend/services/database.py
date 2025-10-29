import asyncio
from typing import AsyncGenerator

from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import DATABASE_URL


class Base(DeclarativeBase):
    pass


engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_models(max_attempts: int = 5, delay_seconds: float = 2.0) -> None:
    from . import models  # noqa: F401  Ensures models are imported

    attempt = 0
    while True:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except OperationalError as exc:
            attempt += 1
            if attempt >= max_attempts:
                raise RuntimeError("Database is not ready") from exc
            await asyncio.sleep(delay_seconds * attempt)


async def shutdown_engine() -> None:
    await engine.dispose()
