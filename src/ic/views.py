"""Read models for the API: plain JSON-ready dicts assembled from graph queries.

Nothing here talks to the database directly. Each function takes a ``Tools`` and combines its
query results, so the same code is tested offline with a canned graph.
"""
from collections import defaultdict

from . import reasoning

SEVERITY_RANK = {"critical": 2, "warning": 1}
MAX_GRAPH_NODES = 40


def incident_summaries(tools):
    return tools.incident_list()


def _graph(tools, origin, origin_tier, blast, alerts, cause):
    hops = {b["service"]: b["hops"] for b in blast}
    tier = {b["service"]: b["tier"] for b in blast}
    if origin:
        hops[origin], tier[origin] = 0, origin_tier

    worst = {}
    for a in alerts:
        if SEVERITY_RANK.get(a["severity"], 0) >= SEVERITY_RANK.get(worst.get(a["service"]), 0):
            worst[a["service"]] = a["severity"]

    names = list(dict.fromkeys(([origin] if origin else []) + sorted(worst) + [b["service"] for b in blast]))
    names = names[:MAX_GRAPH_NODES]
    nodes = [dict(id=n, tier=tier.get(n), hops=hops.get(n), alerting=n in worst, severity=worst.get(n))
             for n in names]
    edges = tools.subgraph_edges(names) if names else []
    return dict(nodes=nodes, edges=edges, origin=origin, change=cause)


def _group_evidence(rows):
    grouped = defaultdict(lambda: defaultdict(list))
    for r in rows:
        label = r["label"] or "Other"
        if r["key"] not in grouped[r["finding"]][label]:
            grouped[r["finding"]][label].append(r["key"])
    return grouped


def _best_outcome(rows):
    rows = [o for o in rows if o.get("playbook_id")]
    return next((o for o in rows if o.get("worked")), rows[0] if rows else None)


def incident_detail(tools, incident):
    info = tools.incident_info(incident)
    if not info:
        raise KeyError(f"incident {incident}")

    alerts = tools.incident_alerts(incident)
    origin_row = tools.incident_origin(incident)
    origin = origin_row["service"] if origin_row else None
    alerting = sorted({a["service"] for a in alerts})

    blast = tools.blast_radius(origin) if origin else []
    cause = tools.incident_cause(incident)
    graph = _graph(tools, origin, origin_row["tier"] if origin_row else None, blast, alerts, cause)

    evidence = _group_evidence(tools.finding_evidence(incident))
    findings = [dict(f, evidence={k: list(v) for k, v in evidence.get(f["id"], {}).items()})
                for f in tools.findings(incident)]

    memory = dict(playbooks=[], similar=[])
    page = None
    if origin:
        similar = [s for s in tools.similar_incidents(origin, alerting) if s["incident"] != incident]
        ranked = reasoning.choose_playbook(tools.best_playbook(origin), similar)
        for r in ranked:
            r["recommended"] = r["playbook_id"] == info.get("recommended_playbook")
        memory = dict(playbooks=ranked, similar=similar)
        page = (tools.who_to_page(origin) or [None])[0]

    return dict(
        incident=info, origin=origin, alerting=alerting, alerts=alerts, graph=graph,
        findings=findings, tasks=tools.incident_tasks(incident), memory=memory,
        page=page, outcome=_best_outcome(tools.incident_outcome(incident)),
    )


def knowledge(tools):
    try:
        chokepoints = tools.betweenness()
    except Exception:  # noqa: BLE001 - betweenness is the least certain call; the page works without it
        chokepoints = []
    return dict(spof=tools.spof(), depended_on=tools.pagerank(), chokepoints=chokepoints)


def service_profile(tools, name):
    info = tools.service_info(name)
    if not info:
        raise KeyError(f"service {name}")
    return dict(
        info=info,
        neighbors=tools.service_neighbors(name),
        experts=tools.service_experts(name),
        incidents=tools.service_incidents(name),
        on_call=tools.who_to_page(name),
    )
