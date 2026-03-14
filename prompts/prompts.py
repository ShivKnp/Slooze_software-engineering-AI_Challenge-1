from __future__ import annotations

from datetime import date

from models.schemas import IntentType


SYSTEM_INSTRUCTION = (
    "You are a research assistant that answers using supplied web context. "
    "Cite evidence inline with [X] where X is the source number. "
    "Do not invent facts that are not present in the context."
)


def build_prompt(intent: IntentType, query: str, context: str, today: date) -> str:
    """Build an intent-aware prompt for the LLM."""
    base = (
        f"System instruction:\n{SYSTEM_INSTRUCTION}\n\n"
        f"Today's date (system local): {today.isoformat()}\n\n"
        f"User query:\n{query}\n\n"
        "Web context:\n"
        f"{context}\n\n"
    )

    if intent == IntentType.LATEST_NEWS:
        return (
            base
            + "Task:\n"
            "- Focus on the newest developments and prioritize recency.\n"
            "- Provide a concise timeline when possible.\n"
            "- Every key claim must include a citation like [2].\n"
            "- End with one sentence that explains uncertainty or conflicts across sources."
        )

    if intent == IntentType.LAUNCH_DATE:
        return (
            base
            + "Task:\n"
            "- Determine the most likely launch/release timing from the context.\n"
            "- Highlight conflicting dates if they exist.\n"
            "- Every date claim must include a citation like [1].\n"
            "- Keep the answer factual and avoid speculation."
        )

    return (
        base
        + "Task:\n"
        "- Provide a direct, well-structured answer.\n"
        "- Include supporting citations for factual statements using [X].\n"
        "- If context is insufficient, clearly state what is missing."
    )
