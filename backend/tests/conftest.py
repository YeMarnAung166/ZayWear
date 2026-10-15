from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.database import get_session
from app.dependencies import CurrentUser, get_current_user, require_admin

USER_ID = "user-1"
ADMIN_ID = "admin-1"


@pytest.fixture()
def engine():
    import app.models  # noqa: F401 - register tables

    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(eng)
    return eng


@pytest.fixture()
def session(engine) -> Generator[Session, None, None]:
    with Session(engine) as s:
        yield s


@pytest.fixture()
def client(engine, session) -> Generator[TestClient, None, None]:
    import app.main as main

    user = CurrentUser({"sub": USER_ID, "phone": "+959123456789"})
    admin = CurrentUser({"sub": ADMIN_ID, "role": "service_role"})

    def _override_session() -> Generator[Session, None, None]:
        yield session

    main.app.dependency_overrides[get_session] = _override_session
    main.app.dependency_overrides[get_current_user] = lambda: user
    main.app.dependency_overrides[require_admin] = lambda: admin

    with TestClient(main.app) as c:
        yield c

    main.app.dependency_overrides.clear()
