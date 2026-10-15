from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.dependencies import AdminUserDep, SessionDep
from app.models import Township
from app.schemas import TownshipCreate, TownshipRead, TownshipUpdate

router = APIRouter(prefix="/townships", tags=["townships"])


@router.get("", response_model=list[TownshipRead])
def list_townships(session: SessionDep) -> list[Township]:
    statement = select(Township).where(Township.is_active == True)  # noqa: E712
    return list(session.exec(statement).all())


@router.get("/{township_id}", response_model=TownshipRead)
def get_township(township_id: int, session: SessionDep) -> Township:
    township = session.get(Township, township_id)
    if township is None:
        raise HTTPException(status_code=404, detail="Township not found")
    return township


@router.post("", response_model=TownshipRead, status_code=201)
def create_township(
    payload: TownshipCreate,
    session: SessionDep,
    _admin: AdminUserDep,
) -> Township:
    existing = session.exec(select(Township).where(Township.name == payload.name)).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Township already exists")

    township = Township(**payload.model_dump())
    session.add(township)
    session.commit()
    session.refresh(township)
    return township


@router.patch("/{township_id}", response_model=TownshipRead)
def update_township(
    township_id: int,
    payload: TownshipUpdate,
    session: SessionDep,
    _admin: AdminUserDep,
) -> Township:
    township = session.get(Township, township_id)
    if township is None:
        raise HTTPException(status_code=404, detail="Township not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(township, key, value)
    session.add(township)
    session.commit()
    session.refresh(township)
    return township
