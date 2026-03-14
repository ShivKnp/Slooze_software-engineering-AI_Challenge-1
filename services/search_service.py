from __future__ import annotations

from typing import Any

import requests

from models.schemas import SearchResponse, SearchResult


class SearchService:
    """Handles Tavily web search requests."""

    TAVILY_URL = "https://api.tavily.com/search"

    def __init__(self, api_key: str, max_results: int = 6, search_depth: str = "advanced") -> None:
        self._api_key = api_key
        self._max_results = max_results
        self._search_depth = search_depth

    def search(self, query: str) -> SearchResponse:
        payload = {
            "api_key": self._api_key,
            "query": query,
            "search_depth": self._search_depth,
            "max_results": self._max_results,
            "include_answer": False,
            "include_raw_content": False,
        }

        response = requests.post(self.TAVILY_URL, json=payload, timeout=25)
        response.raise_for_status()

        data = response.json()
        results = [self._to_result(item) for item in data.get("results", [])]

        return SearchResponse(query=query, results=results)

    @staticmethod
    def _to_result(item: dict[str, Any]) -> SearchResult:
        return SearchResult(
            title=str(item.get("title", "")).strip(),
            url=str(item.get("url", "")).strip(),
            content=str(item.get("content", "")).strip(),
        )
