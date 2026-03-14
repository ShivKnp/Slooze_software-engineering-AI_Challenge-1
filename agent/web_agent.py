from __future__ import annotations

from collections.abc import Iterator

import requests

from config.settings import Settings
from models.schemas import IntentType, SearchResult
from prompts.prompts import build_prompt
from services.context_service import ContextService
from services.intent_service import IntentService
from services.llm_service import LLMQuotaError, LLMService
from services.search_service import SearchService
from utils.date_utils import choose_launch_date, today_local
from utils.formatter import build_context, format_source_list


class WebAgent:
    """Coordinates intent detection, web search, prompting, and response generation."""

    def __init__(self, settings: Settings) -> None:
        self._intent_service = IntentService()
        self._context_service = ContextService()
        self._search_service = SearchService(
            api_key=settings.tavily_api_key,
            max_results=settings.tavily_max_results,
            search_depth=settings.tavily_search_depth,
        )
        self._llm_service = LLMService(
            api_key=settings.google_api_key,
            model_name=settings.google_model,
        )
        self._last_entity: str | None = None

    def stream_answer(self, query: str) -> Iterator[str]:
        if self._context_service.has_ambiguous_reference(query) and not self._last_entity:
            yield (
                "I need the subject to answer that follow-up question. "
                "Please specify what 'it' refers to."
            )
            return

        resolved_query = self._context_service.resolve_query(query, self._last_entity)
        intent = self._intent_service.detect_intent(resolved_query)

        current_entity = self._context_service.extract_primary_entity(query)
        if current_entity:
            self._last_entity = current_entity

        try:
            search_response = self._search_service.search(resolved_query)
            results = search_response.results
        except requests.RequestException as exc:
            yield (
                "I could not fetch web results at the moment. "
                f"Search error: {exc}."
            )
            return

        context = build_context(results)
        today = today_local()
        prompt = build_prompt(intent=intent, query=resolved_query, context=context, today=today)

        if not current_entity:
            inferred_entity = self._context_service.extract_primary_entity(resolved_query)
            if inferred_entity:
                self._last_entity = inferred_entity

        launch_info = choose_launch_date(results, today=today) if intent == IntentType.LAUNCH_DATE else None

        try:
            generated_any_token = False
            for token in self._llm_service.generate_stream(prompt):
                generated_any_token = True
                yield token

            if not generated_any_token:
                yield "I could not generate a response from the language model."

        except LLMQuotaError:
            # Fall back to an extractive answer when API quota is exceeded.
            yield self._extractive_fallback(query=resolved_query, results=results)

        if launch_info is not None:
            if launch_info.days_difference >= 0:
                timing_text = (
                    f"\n\nEstimated launch date: {launch_info.target_date.isoformat()} "
                    f"(in {launch_info.days_difference} day(s)) [Source {launch_info.source_index}]."
                )
            else:
                days_ago = abs(launch_info.days_difference)
                timing_text = (
                    f"\n\nEstimated launch date: {launch_info.target_date.isoformat()} "
                    f"({days_ago} day(s) ago) [Source {launch_info.source_index}]."
                )
            yield timing_text

        yield "\n\nSources:\n"
        yield format_source_list(results)

    def _extractive_fallback(self, query: str, results: list[SearchResult]) -> str:
        if not results:
            return (
                "I do not have enough information to answer right now. "
                "No sources were retrieved from the web search."
            )

        snippets = []
        for idx, result in enumerate(results[:3], start=1):
            title = result.title or "Untitled"
            content = " ".join(result.content.split())
            content = content[:220] + ("..." if len(content) > 220 else "")
            snippets.append(f"- {title}: {content} [Source {idx}]")

        joined = "\n".join(snippets)
        return (
            "The model quota is currently exhausted, so here is an extractive summary from the retrieved web data.\n\n"
            f"Question: {query}\n"
            f"Key points:\n{joined}"
        )
