from __future__ import annotations

from models.schemas import SearchResult


def build_context(results: list[SearchResult]) -> str:
    """Build prompt context from search results."""
    if not results:
        return "No search results available."

    blocks: list[str] = []
    for idx, result in enumerate(results, start=1):
        snippet = _clean_snippet(result.content)
        blocks.append(
            f"[{idx}]\n"
            f"Title: {result.title or 'N/A'}\n"
            f"URL: {result.url or 'N/A'}\n"
            f"Snippet: {snippet or 'N/A'}"
        )

    return "\n\n".join(blocks)


def format_source_list(results: list[SearchResult]) -> str:
    if not results:
        return "No sources found."

    lines = []
    for idx, result in enumerate(results, start=1):
        lines.append(f"[{idx}]{result.url}")
    return "\n".join(lines)


def _clean_snippet(snippet: str, max_len: int = 400) -> str:
    normalized = " ".join(snippet.split())
    if len(normalized) <= max_len:
        return normalized
    return normalized[: max_len - 3].rstrip() + "..."
