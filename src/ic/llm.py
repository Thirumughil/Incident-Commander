"""Optional LLM layer.

The graph makes every decision. The model only rewrites the recorded facts as a short
status update for humans. If no API key or SDK is available, the pipeline uses the plain
template from ``reasoning.status_update`` and everything else behaves identically.
"""
import os

MODEL = os.getenv("IC_MODEL", "claude-sonnet-5-5")

SYSTEM = (
    "You write short incident status updates for engineers. Use ONLY the facts provided. "
    "Do not add causes, numbers or names that are not in the facts. Maximum 80 words, plain text."
)


def available() -> bool:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return False
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    return True


def rewrite(facts: str):
    """Return a polished update, or None if the model is unavailable or fails."""
    if not available():
        return None
    try:
        import anthropic

        client = anthropic.Anthropic()
        msg = client.messages.create(
            model=MODEL, max_tokens=300, system=SYSTEM,
            messages=[{"role": "user", "content": f"Facts:\n{facts}\n\nWrite the status update."}],
        )
        text = "".join(block.text for block in msg.content if getattr(block, "type", "") == "text").strip()
        return text or None
    except Exception:  # noqa: BLE001 - never let the demo depend on the model
        return None
