from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ZayWear API"
    environment: str = "development"
    debug: bool = False

    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/apparel"

    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "slips"

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    exchange_window_days: int = 3

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()
