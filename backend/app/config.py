import json
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

    cors_origins: str = "http://localhost:3000"

    @staticmethod
    def _clean_origin(value: object) -> str:
        return str(value).strip().strip('"').strip("'").strip().rstrip("/")

    @property
    def cors_origins_list(self) -> list[str]:
        raw = (self.cors_origins or "").strip()
        if not raw:
            return []
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                return [self._clean_origin(item) for item in parsed if self._clean_origin(item)]
        return [self._clean_origin(part) for part in raw.split(",") if self._clean_origin(part)]


@lru_cache
def get_settings() -> "Settings":
    return Settings()


settings = get_settings()
