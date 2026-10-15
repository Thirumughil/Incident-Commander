"""Write a generated dataset into a tenant graph using batched UNWIND queries.

Labels and relationship types come from internal constants (never user input), so
they are safe to place in the query text. All values go through query parameters.
"""
from ..schema import ensure_schema

BATCH = 500


def _batches(rows, size=BATCH):
    for i in range(0, len(rows), size):
        yield rows[i:i + size]


def _node_query(label, row):
    props = ", ".join(f"{k}: r.{k}" for k in row)
    return f"UNWIND $rows AS r CREATE (:{label} {{{props}}})"


def _edge_query(rel, src, dst, row):
    (src_label, src_key), (dst_label, dst_key) = src, dst
    extra = [k for k in row if k not in ("src", "dst")]
    props = f" {{{', '.join(f'{k}: r.{k}' for k in extra)}}}" if extra else ""
    return (
        f"UNWIND $rows AS r "
        f"MATCH (a:{src_label} {{{src_key}: r.src}}), (b:{dst_label} {{{dst_key}: r.dst}}) "
        f"CREATE (a)-[:{rel}{props}]->(b)"
    )


def load_dataset(graph, dataset, reset=False):
    """Create indexes and load every node and edge row. Returns row counts."""
    if reset:
        try:
            graph.delete()
        except Exception:  # noqa: BLE001 - graph may not exist yet
            pass
    ensure_schema(graph)

    counts = {}
    for label, rows in dataset["nodes"].items():
        if not rows:
            continue
        query = _node_query(label, rows[0])
        for chunk in _batches(rows):
            graph.query(query, {"rows": chunk})
        counts[label] = len(rows)

    for edge in dataset["edges"]:
        rows = edge["rows"]
        if not rows:
            continue
        query = _edge_query(edge["rel"], edge["src"], edge["dst"], rows[0])
        for chunk in _batches(rows):
            graph.query(query, {"rows": chunk})
        counts[edge["rel"]] = len(rows)
    return counts
