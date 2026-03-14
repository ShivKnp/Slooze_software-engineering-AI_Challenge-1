from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum


class IntentType(str, Enum):
    GENERAL_QUESTION = "general_question"
    LAUNCH_DATE = "launch_date"
    LATEST_NEWS = "latest_news"


@dataclass(frozen=True)
class SearchResult:
    title: str
    url: str
    content: str


@dataclass(frozen=True)
class SearchResponse:
    query: str
    results: list[SearchResult]


@dataclass(frozen=True)
class LaunchInfo:
    target_date: date
    days_difference: int
    source_index: int
