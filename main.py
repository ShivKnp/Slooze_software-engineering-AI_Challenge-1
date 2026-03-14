from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

from agent.web_agent import WebAgent
from config.settings import Settings


def run() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(env_path)

    settings = Settings.from_env()
    agent = WebAgent(settings=settings)

    print("Web Search Agent (type 'exit' to quit)")
    

    while True:
        try:
            query = input("\nUser Query: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            break

        if query.lower() in {"exit", "quit"}:
            print("Goodbye.")
            break

        if not query:
            print("Please enter a question.")
            continue

        print("Agent: ", end="", flush=True)
        for token in agent.stream_answer(query):
            print(token, end="", flush=True)
        print()


if __name__ == "__main__":
    run()
