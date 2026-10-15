#!/usr/bin/env python3
"""Run every query in queries/ against a seeded tenant and print what comes back.

Read queries run on the tenant graph. Write queries run on a throwaway copy of it
(``tenant_zcheck``), which is deleted at the end, so your data is left untouched.

    python scripts/seed.py --tenant acme --reset
    python scripts/inject_incident.py --tenant acme
    python scripts/check_queries.py --tenant acme

Paste the full output back if any query fails: the error text says what FalkorDB
did not accept.
"""
import argparse
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic import queries  # noqa: E402
from ic.graph import get_db, graph_name  # noqa: E402

OK, FAIL = "ok  ", "FAIL"
failures = []


def show(graph, name, **params):
    try:
        rows = queries.run(graph, name, **params)
    except Exception as exc:  # noqa: BLE001
        failures.append(name)
        print(f"[{FAIL}] {name}\n       {type(exc).__name__}: {exc}")
        return None
    print(f"[{OK}] {name}: {len(rows)} row(s)")
    for row in rows[:4]:
        print("       ", row)
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tenant", default="acme")
    args = ap.parse_args()

    db = get_db()
    src_name = graph_name(args.tenant)
    graph = db.select_graph(src_name)
    now = int(time.time())

    print(f"== read queries on {src_name} ==")
    alerts = show(graph, "current_open_alerts") or []
    alerting = sorted({a["service"] for a in alerts}) or ["checkout"]
    show(graph, "blast_radius", service="currency")
    show(graph, "explain_path", impacted="frontend", origin="currency")
    show(graph, "suspect_changes", service="checkout", incident_start=now)
    show(graph, "similar_incidents", suspect="currency", alerting=alerting)
    show(graph, "best_playbook", service="currency")
    show(graph, "who_to_page", service="currency")
    show(graph, "knowledge_spof")
    show(graph, "pagerank")
    show(graph, "betweenness")

    print(f"\n== write queries on a copy of {src_name} ==")
    copy_name = "tenant_zcheck"
    try:
        try:
            db.select_graph(copy_name).delete()
        except Exception:  # noqa: BLE001
            pass
        scratch = graph.copy(copy_name)
    except Exception as exc:  # noqa: BLE001
        failures.append("graph.copy")
        print(f"[{FAIL}] graph.copy\n       {type(exc).__name__}: {exc}")
        scratch = None

    if scratch is not None:
        try:
            show(scratch, "link_related_alerts")
            show(scratch, "group_alerts_wcc")
            ids = [a["alert"] for a in alerts]
            show(scratch, "open_incident", incident="INC-TEST", title="check run", severity="sev1",
                 now=now, alert_ids=ids)
            show(scratch, "create_task", incident="INC-TEST", agent="Analyzer", task="TSK-1",
                 kind="analyze", now=now)
            show(scratch, "mark_affected", incident="INC-TEST", service="currency", role="origin")
            show(scratch, "handoff_task", task="TSK-1", to="Responder", now=now, reason="analysis done")
            node_ids = [r[0] for r in scratch.query(
                "MATCH (s:Service) WHERE s.name IN ['currency', 'checkout'] RETURN id(s)").result_set]
            show(scratch, "record_finding", incident="INC-TEST", agent="Analyzer", fid="FND-1",
                 claim="currency is upstream of checkout", confidence=0.9,
                 query="blast_radius(currency)", now=now, node_ids=node_ids)
            show(scratch, "record_responder", person="Priya Raman", incident="INC-TEST", minutes=12)
            before = scratch.query("MATCH (p:Playbook {id: 'PB-04'}) RETURN p.successes, p.failures").result_set[0]
            show(scratch, "record_outcome", incident="INC-TEST", playbook="PB-04", worked=True, minutes=12, now=now)
            after = scratch.query("MATCH (p:Playbook {id: 'PB-04'}) RETURN p.successes, p.failures").result_set[0]
            print(f"       PB-04 counters before {before} -> after {after}")
            ev = scratch.query("MATCH (:Finding {id: 'FND-1'})-[:EVIDENCE]->(e) RETURN count(e)").result_set[0][0]
            print(f"       evidence edges on FND-1: {ev}")
        finally:
            try:
                scratch.delete()
            except Exception:  # noqa: BLE001
                pass

    print()
    if failures:
        print(f"{len(failures)} problem(s): {', '.join(failures)}")
        sys.exit(1)
    print("All queries ran.")


if __name__ == "__main__":
    main()
