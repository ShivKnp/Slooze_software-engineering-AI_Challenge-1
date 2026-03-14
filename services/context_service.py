from __future__ import annotations

import re


class ContextService:
    """Tracks and resolves conversational entity references across turns."""

    _AMBIGUOUS_REF_REGEX = re.compile(
        r"\b(it|its|they|them|their|this|that|these|those|he|she|him|her)\b",
        flags=re.IGNORECASE,
    )

    _LEADING_ENTITY_REGEX = re.compile(
        r"^\s*([a-z0-9][a-z0-9\s\-]{1,80}?)\s+(?:was|were|is|are|can|could|will|would|did|does|do)\b",
        flags=re.IGNORECASE,
    )

    _TRAILING_FALLBACK_REGEX = re.compile(
        r"\b(?:about|for|of|on)\s+([a-z0-9][a-z0-9\s\-]{1,80})\??$",
        flags=re.IGNORECASE,
    )

    _BAD_ENTITY_WORDS = {
        "how",
        "when",
        "what",
        "who",
        "why",
        "which",
        "days",
        "day",
        "ago",
        "latest",
        "news",
        "predict",
        "future",
        "launch",
        "release",
        "date",
        "invented",
    }

    def has_ambiguous_reference(self, query: str) -> bool:
        return bool(self._AMBIGUOUS_REF_REGEX.search(query))

    def extract_primary_entity(self, query: str) -> str | None:
        leading = self._LEADING_ENTITY_REGEX.search(query)
        if leading:
            candidate = self._normalize_entity(leading.group(1))
            if candidate:
                return candidate

        trailing = self._TRAILING_FALLBACK_REGEX.search(query)
        if trailing:
            candidate = self._normalize_entity(trailing.group(1))
            if candidate:
                return candidate

        return None

    def resolve_query(self, query: str, last_entity: str | None) -> str:
        if not last_entity:
            return query

        if not self.has_ambiguous_reference(query):
            return query

        return self._AMBIGUOUS_REF_REGEX.sub(last_entity, query)

    def _normalize_entity(self, text: str) -> str | None:
        cleaned = " ".join(text.strip().split())
        cleaned = re.sub(r"[^a-zA-Z0-9\s\-]", "", cleaned)
        lowered = cleaned.lower()

        if not lowered:
            return None

        words = lowered.split()
        if not words:
            return None

        if all(word in self._BAD_ENTITY_WORDS for word in words):
            return None

        if len(words) == 1 and words[0] in self._BAD_ENTITY_WORDS:
            return None

        return cleaned
