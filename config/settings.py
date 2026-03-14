from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    """Application settings loaded from environment variables."""

    google_api_key: str
    tavily_api_key: str
    google_model: str = "gemini-2.5-flash"
    tavily_max_results: int = 6
    tavily_search_depth: str = "advanced"

    @classmethod
    def from_env(cls) -> "Settings":
        google_api_key = os.getenv("GOOGLE_API_KEY", "").strip()
        tavily_api_key = os.getenv("TAVILY_API_KEY", "").strip()
        google_model = os.getenv("GOOGLE_MODEL", "gemini-2.5-flash").strip()

        missing = []
        if not google_api_key:
            missing.append("GOOGLE_API_KEY")
        if not tavily_api_key:
            missing.append("TAVILY_API_KEY")

        if missing:
            missing_vars = ", ".join(missing)
            raise ValueError(f"Missing required environment variables: {missing_vars}")

        return cls(
            google_api_key=google_api_key,
            tavily_api_key=tavily_api_key,
            google_model=google_model,
        )
