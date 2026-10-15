"""Pure decision logic, kept free of database calls so it can be tested offline.

The graph supplies the facts (query results); these functions combine them into the
decisions the agents record. Nothing here guesses: every output can be traced back to
rows the graph returned.
"""


def pick_suspect(changes_by_service, upstream_rows):
    """Choose the most likely origin.

    ``changes_by_service`` maps each alerting service to the rows of ``suspect_changes``.
    A change wins when more alerting services depend on the changed service, then by
    shorter total distance, then by recency. With no suspect change, fall back to the
    service most alerting services depend on (``common_upstream``).
    """
    alerting = sorted(changes_by_service)
    by_change = {}
    for service, rows in changes_by_service.items():
        for row in rows:
            entry = by_change.setdefault(row["change"], dict(row=row, distances={}))
            prev = entry["distances"].get(service)
            entry["distances"][service] = row["distance"] if prev is None else min(prev, row["distance"])

    if by_change:
        def rank(item):
            _chg, entry = item
            return (-len(entry["distances"]), sum(entry["distances"].values()), -entry["row"]["at"])

        chg_id, entry = min(by_change.items(), key=rank)
        row = entry["row"]
        return dict(
            kind="change", service=row["changed_service"], change=row,
            reached=sorted(entry["distances"]), alerting=alerting,
            distances=entry["distances"],
        )

    if upstream_rows:
        top = upstream_rows[0]
        return dict(kind="upstream", service=top["service"], change=None,
                    reached=None, alerting=alerting, reached_count=top["reached"], distances={})

    return dict(kind="none", service=alerting[0] if alerting else None, change=None,
                reached=None, alerting=alerting, distances={})


def choose_playbook(best_rows, similar_rows, bonus=0.25):
    """Rank playbooks by learned score, boosted when a similar past incident was fixed with it.

    The boost scales with how similar that incident was (score capped at 4). Only
    playbooks that apply to the origin service (``best_rows``) are ever recommended.
    """
    fixes = {}
    for row in similar_rows:
        if row.get("playbook_id"):
            fixes.setdefault(row["playbook_id"], row)
    ranked = []
    for row in best_rows:
        sim = fixes.get(row["playbook_id"])
        boost = bonus * min(sim["score"], 4) / 4 if sim else 0.0
        ranked.append(dict(row, similar_incident=sim["incident"] if sim else None,
                           similar_minutes=sim["minutes"] if sim else None,
                           boost=round(boost, 3), final=round(row["score"] + boost, 3)))
    ranked.sort(key=lambda r: (-r["final"], r["name"]))
    return ranked


def minutes_between(later, earlier):
    return max(0, round((later - earlier) / 60))


def format_path(path):
    return " -> ".join(path)


def status_update(incident, origin, reason, blast_total, blast_tier1, playbook, page):
    """Plain-text status update built only from recorded facts."""
    parts = [f"[{incident['severity'].upper()}] {incident['title']}."]
    parts.append(f"Likely origin: {origin}. Why: {reason}.")
    parts.append(f"{blast_total} services depend on it, {blast_tier1} of them tier 1.")
    if playbook:
        detail = f"score {playbook['score']:.2f}, {playbook['wins']} wins and {playbook['losses']} losses"
        if playbook.get("similar_incident"):
            detail += f"; worked in {playbook['similar_minutes']} min on {playbook['similar_incident']}"
        parts.append(f"Recommended fix: {playbook['name']} ({detail}).")
    if page:
        parts.append(f"Paging {page['person']} ({page['team']}).")
    return " ".join(parts)
