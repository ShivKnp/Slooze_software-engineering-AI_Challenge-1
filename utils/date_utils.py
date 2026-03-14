from __future__ import annotations

import re
from datetime import date, datetime

from models.schemas import LaunchInfo, SearchResult

# Captures common date styles seen in snippets.
DATE_REGEX = re.compile(
    r"\b(?:"
    r"\d{4}-\d{2}-\d{2}"
    r"|\d{1,2}/\d{1,2}/\d{2,4}"
    r"|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},\s*\d{4}"
    r"|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}"
    r")\b",
    flags=re.IGNORECASE,
)

DATE_FORMATS = [
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%m/%d/%y",
    "%b %d, %Y",
    "%B %d, %Y",
    "%d %b %Y",
    "%d %B %Y",
]


def today_local() -> date:
    return date.today()


def extract_dates(text: str) -> list[date]:
    matches = DATE_REGEX.findall(text)
    parsed_dates: list[date] = []

    for raw_date in matches:
        candidate = _parse_date(raw_date)
        if candidate is not None:
            parsed_dates.append(candidate)

    unique_dates = sorted(set(parsed_dates))
    return unique_dates


def choose_launch_date(results: list[SearchResult], today: date | None = None) -> LaunchInfo | None:
    """Choose the most plausible launch date from retrieved snippets."""
    current = today or today_local()
    candidates: list[LaunchInfo] = []

    for idx, item in enumerate(results, start=1):
        combined = f"{item.title}. {item.content}"
        for found_date in extract_dates(combined):
            days = (found_date - current).days
            candidates.append(LaunchInfo(target_date=found_date, days_difference=days, source_index=idx))

    if not candidates:
        return None

    future_candidates = [c for c in candidates if c.days_difference >= 0]
    if future_candidates:
        return min(future_candidates, key=lambda c: c.days_difference)

    return max(candidates, key=lambda c: c.days_difference)


def _parse_date(raw: str) -> date | None:
    cleaned = raw.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None
