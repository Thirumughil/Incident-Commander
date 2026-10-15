"""Graph schema: labels, relationship types and indexes.

See the README for the full data model. Constants here are the single source of
truth for the names used by the loader and the queries.
"""

NODE_LABELS = [
    "Service", "Team", "Person", "Change", "Alert", "Incident",
    "Playbook", "Agent", "Task", "Finding",
]

REL_TYPES = [
    "DEPENDS_ON", "OWNS", "MEMBER_OF", "ON_CALL_FOR", "MODIFIED", "FIRED_ON",
    "PART_OF", "AFFECTED", "CAUSED_BY", "RESOLVED", "FIXED_BY", "APPLIES_TO",
    "ASSIGNED", "FOR", "HANDED_OFF_TO", "PRODUCED", "ABOUT", "EVIDENCE",
    "RELATED_TO",
]

# (label, property) pairs that get a range index. These are the lookup keys used by
# MATCH patterns in the queries, so each query starts from an index seek.
INDEXES = [
    ("Service", "name"),
    ("Team", "name"),
    ("Person", "name"),
    ("Change", "id"),
    ("Alert", "id"),
    ("Incident", "id"),
    ("Playbook", "id"),
    ("Agent", "name"),
    ("Task", "id"),
    ("Finding", "id"),
]


def ensure_schema(graph) -> None:
    """Create the range indexes. Safe to call repeatedly."""
    for label, prop in INDEXES:
        try:
            graph.query(f"CREATE INDEX FOR (n:{label}) ON (n.{prop})")
        except Exception as exc:  # noqa: BLE001 - client raises a generic error type
            if "already indexed" in str(exc).lower():
                continue
            raise
