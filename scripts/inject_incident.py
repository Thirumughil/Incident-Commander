#!/usr/bin/env python3
"""Fire the live demo scenario into a tenant graph.

Writes one Change on ``currency`` (a DB connection pool change, 22 minutes ago) and
four alerts that fire within about a minute on ``checkout``, ``cart``, ``frontend``
and ``payment``. It does NOT create an Incident: opening and grouping is the
Detector agent's job.

    python scripts/inject_incident.py --tenant acme
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic.graph import tenant_graph  # noqa: E402

ALERTS = [
    ("checkout", "p99_latency_ms", "critical", 0),
    ("cart", "error_rate_pct", "warning", 20),
    ("frontend", "error_rate_pct", "critical", 35),
    ("payment", "timeouts_per_min", "critical", 55),
]

INJECT_QUERY = """
MATCH (s:Service {name: $origin})
CREATE (c:Change {id: $change_id, kind: 'config', at: $change_at, summary: $summary})
CREATE (c)-[:MODIFIED]->(s)
"""

ALERT_QUERY = """
MATCH (s:Service {name: $service})
CREATE (a:Alert {id: $id, metric: $metric, severity: $severity, fired_at: $fired_at, status: 'open'})
CREATE (a)-[:FIRED_ON]->(s)
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tenant", default="acme")
    ap.add_argument("--origin", default="currency", help="service the bad change landed on")
    args = ap.parse_args()

    now = int(time.time())
    graph = tenant_graph(args.tenant)
    change_id = f"CHG-LIVE-{now}"
    graph.query(INJECT_QUERY, {
        "origin": args.origin, "change_id": change_id, "change_at": now - 22 * 60,
        "summary": "Lower DB connection pool 50 -> 10",
    })
    for service, metric, severity, offset in ALERTS:
        graph.query(ALERT_QUERY, {
            "service": service, "id": f"ALT-LIVE-{now}-{service}", "metric": metric,
            "severity": severity, "fired_at": now + offset,
        })
    print(f"Injected change {change_id} on {args.origin} and {len(ALERTS)} alerts into tenant {args.tenant!r}.")


if __name__ == "__main__":
    main()
