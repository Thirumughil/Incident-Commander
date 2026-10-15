"""Named Cypher queries, loaded from the ``queries/`` folder.

The ``.cypher`` files are the single source of truth: the agents call them through
``run`` and the README lists the same files, so the documented queries are the ones
the product actually executes.
"""
from functools import lru_cache
from pathlib import Path

QUERY_DIR = Path(__file__).resolve().parents[2] / "queries"


@lru_cache(maxsize=None)
def load(name: str) -> str:
    path = QUERY_DIR / f"{name}.cypher"
    if not path.is_file():
        raise KeyError(f"unknown query {name!r}")
    lines = [ln for ln in path.read_text().splitlines() if not ln.lstrip().startswith("//")]
    return "\n".join(lines).strip()


def available() -> list[str]:
    return sorted(p.stem for p in QUERY_DIR.glob("*.cypher"))


def run(graph, name: str, **params):
    """Run a named query and return rows as a list of dicts keyed by column name."""
    result = graph.query(load(name), params or None)
    header = [h[1] if isinstance(h, (list, tuple)) else h for h in result.header]
    return [dict(zip(header, row)) for row in result.result_set]
