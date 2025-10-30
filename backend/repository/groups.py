from typing import Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.models import GroupMemberModel, GroupModel, GroupRestaurantModel, GroupVoteModel


async def group_exists(session: AsyncSession, group_id: str) -> bool:
    return await session.get(GroupModel, group_id) is not None


async def fetch_group(session: AsyncSession, group_id: str) -> Optional[GroupModel]:
    return await session.get(GroupModel, group_id)


async def add_group(session: AsyncSession, group: GroupModel) -> GroupModel:
    session.add(group)
    await session.flush()
    return group


async def ensure_member(session: AsyncSession, group_id: str, member_id: str) -> GroupMemberModel:
    result = await session.execute(
        select(GroupMemberModel).where(
            GroupMemberModel.group_id == group_id,
            GroupMemberModel.member_id == member_id,
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        member = GroupMemberModel(group_id=group_id, member_id=member_id)
        session.add(member)
        await session.flush()
    return member


async def fetch_member_ids(session: AsyncSession, group_id: str) -> List[str]:
    result = await session.execute(
        select(GroupMemberModel.member_id)
        .where(GroupMemberModel.group_id == group_id)
        .order_by(GroupMemberModel.member_id)
    )
    return list(result.scalars().all())


async def add_restaurants(session: AsyncSession, restaurants: Iterable[GroupRestaurantModel]) -> None:
    restaurants = list(restaurants)
    if not restaurants:
        return
    session.add_all(restaurants)
    await session.flush()


async def fetch_restaurants(session: AsyncSession, group_id: str) -> List[GroupRestaurantModel]:
    result = await session.execute(
        select(GroupRestaurantModel)
        .where(GroupRestaurantModel.group_id == group_id)
        .order_by(GroupRestaurantModel.position)
    )
    return list(result.scalars().all())


async def fetch_member_vote_place_ids(session: AsyncSession, group_id: str, member_id: str) -> List[str]:
    result = await session.execute(
        select(GroupVoteModel.place_id).where(
            GroupVoteModel.group_id == group_id,
            GroupVoteModel.member_id == member_id,
        )
    )
    return list(result.scalars().all())


async def candidate_exists(session: AsyncSession, group_id: str, place_id: str) -> bool:
    result = await session.execute(
        select(GroupRestaurantModel.id).where(
            GroupRestaurantModel.group_id == group_id,
            GroupRestaurantModel.place_id == place_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def get_vote(
    session: AsyncSession,
    group_id: str,
    member_id: str,
    place_id: str,
) -> Optional[GroupVoteModel]:
    result = await session.execute(
        select(GroupVoteModel).where(
            GroupVoteModel.group_id == group_id,
            GroupVoteModel.member_id == member_id,
            GroupVoteModel.place_id == place_id,
        )
    )
    return result.scalar_one_or_none()


async def create_vote(session: AsyncSession, group_id: str, member_id: str, place_id: str, value: str) -> GroupVoteModel:
    vote = GroupVoteModel(
        group_id=group_id,
        member_id=member_id,
        place_id=place_id,
        value=value,
    )
    session.add(vote)
    await session.flush()
    return vote


async def fetch_votes(session: AsyncSession, group_id: str) -> Sequence[Tuple[str, str]]:
    result = await session.execute(
        select(GroupVoteModel.place_id, GroupVoteModel.value).where(GroupVoteModel.group_id == group_id)
    )
    return result.all()
