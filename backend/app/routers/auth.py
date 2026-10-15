from fastapi import APIRouter, HTTPException

from app.dependencies import CurrentUserDep, SessionDep
from app.models import Profile
from app.schemas import ProfileRead, ProfileUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_or_create_profile(user: CurrentUserDep, session: SessionDep) -> Profile:
    profile = session.get(Profile, user.id)
    if profile is None:
        profile = Profile(
            id=user.id,
            phone=user.phone or f"unknown-{user.id[:8]}",
            is_admin=user.is_admin,
        )
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return profile


@router.get("/me", response_model=ProfileRead)
def get_profile(user: CurrentUserDep, session: SessionDep) -> Profile:
    return _get_or_create_profile(user, session)


@router.patch("/me", response_model=ProfileRead)
def update_profile(
    payload: ProfileUpdate,
    user: CurrentUserDep,
    session: SessionDep,
) -> Profile:
    profile = _get_or_create_profile(user, session)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile
