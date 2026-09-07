from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


AI_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = AI_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            PROJECT_DIR / "web" / ".env.local",
            PROJECT_DIR / "web" / ".env",
            PROJECT_DIR / ".env",
            AI_DIR / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openai_base_url: str = Field(default="", alias="OPENAI_BASE_URL")
    openai_model: str = Field(default="openai/gpt-4o-mini", alias="OPENAI_MODEL")
    ai_service_secret: str = Field(default="", alias="AI_SERVICE_SECRET")
    database_url: str = Field(default="", alias="DATABASE_URL")
    allowed_origins: str = Field(default="http://localhost:3000", alias="ALLOWED_ORIGINS")
    port: int = Field(default=8000, alias="PORT")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def openai_enabled(self) -> bool:
        return bool(self.model_api_key) and self.model_api_key.startswith("sk-")

    @property
    def model_api_key(self) -> str:
        return self.openrouter_api_key or self.openai_api_key

    @property
    def model_base_url(self) -> str:
        if self.openai_base_url:
            return self.openai_base_url
        if self.model_api_key.startswith("sk-or-"):
            return "https://openrouter.ai/api/v1"
        return "https://api.openai.com/v1"

    @property
    def database_connection_url(self) -> str:
        """Use encrypted Neon TLS without requiring a local CA file."""
        parts = urlsplit(self.database_url)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        if query.get("sslmode") == "verify-full":
            query["sslmode"] = "require"
            query.pop("sslrootcert", None)
        return urlunsplit(parts._replace(query=urlencode(query)))


@lru_cache
def get_settings() -> Settings:
    return Settings()
