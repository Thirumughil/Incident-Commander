"""Live demo scenario: a bad config change on one service and an alert burst on its dependents.

Shared by ``scripts/inject_incident.py`` and the API's inject endpoint. It writes a Change and
four Alerts but does NOT open an Incident: grouping the alerts is the Detector agent's job.
"""
import threading
import time

ALERTS = [
    ("checkout", "p99_latency_ms", "critical", 0),
    ("cart", "error_rate_pct", "warning", 20),
    ("frontend", "error_rate_pct", "critical", 35),
    ("payment", "timeouts_per_min", "critical", 55),
]

CHANGE_QUERY = """
MATCH (s:Service {name: $origin})
CREATE (c:Change {id: $change_id, kind: 'config', at: $change_at, summary: $summary})
CREATE (c)-[:MODIFIED]->(s)
"""

ALERT_QUERY = """
MATCH (s:Service {name: $service})
CREATE (a:Alert {id: $id, metric: $metric, severity: $severity, fired_at: $fired_at, status: 'open'})
CREATE (a)-[:FIRED_ON]->(s)
"""

_lock = threading.Lock()
_last_stamp = 0


def inject_live(graph, origin="currency", now=None):
    """Write the scenario. Stamps are strictly increasing so ids never collide, even when the
    button is clicked twice in the same second."""
    global _last_stamp
    with _lock:
        stamp = max(int(now if now is not None else time.time()), _last_stamp + 1)
        _last_stamp = stamp

    change_id = f"CHG-LIVE-{stamp}"
    graph.query(CHANGE_QUERY, {
        "origin": origin, "change_id": change_id, "change_at": stamp - 22 * 60,
        "summary": "Lower DB connection pool 50 -> 10",
    })
    alert_ids = []
    for service, metric, severity, offset in ALERTS:
        alert_id = f"ALT-LIVE-{stamp}-{service}"
        graph.query(ALERT_QUERY, {
            "service": service, "id": alert_id, "metric": metric,
            "severity": severity, "fired_at": stamp + offset,
        })
        alert_ids.append(alert_id)
    return dict(change=change_id, alerts=alert_ids, at=stamp, origin=origin)
