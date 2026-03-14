from __future__ import annotations

import re

from models.schemas import IntentType


class IntentService:
    """Classifies user queries into high-level intents."""

    LAUNCH_PATTERNS = [
        r"\blaunch\b",
        r"\brelease\s+date\b",
        r"\bwhen\s+is\b.*\b(released|launching|coming\s+out)\b",
        r"\bdays?\s+until\b",
        r"\bhow\s+many\s+days\s+ago\b",
        r"\bdays?\s+ago\b",
        r"\bcountdown\b",
    ]

    NEWS_PATTERNS = [
        r"\blatest\b",
        r"\bbreaking\b",
        r"\bnews\b",
        r"\brecent\b",
        r"\bupdates?\b",
        r"\btoday\b",
        r"\bthis\s+week\b",
    ]

    def detect_intent(self, query: str) -> IntentType:
        query_normalized = query.lower().strip()

        if self._matches_any(self.LAUNCH_PATTERNS, query_normalized):
            return IntentType.LAUNCH_DATE

        if self._matches_any(self.NEWS_PATTERNS, query_normalized):
            return IntentType.LATEST_NEWS

        return IntentType.GENERAL_QUESTION

    @staticmethod
    def _matches_any(patterns: list[str], text: str) -> bool:
        return any(re.search(pattern, text) for pattern in patterns)
