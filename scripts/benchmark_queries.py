#!/usr/bin/env python3
"""Benchmark key Cypher queries on live FalkorDB.

Runs 1 warm-up iteration followed by 30 timed iterations for each key query,
computing median and p95 latency in milliseconds.

Usage:
    python scripts/benchmark_queries.py --tenant acme
"""
import argparse
import datetime
import os
import platform
import statistics
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic import queries  # noqa: E402
from ic.graph import get_db, graph_name  # noqa: E402
from ic.scenario import ALERTS  # noqa: E402


def benchmark_query(graph, query_name, params, n_runs=30):
    # 1 warm-up run
    queries.run(graph, query_name, **params)

    times_ms = []
    for _ in range(n_runs):
        start = time.perf_counter()
        queries.run(graph, query_name, **params)
        duration_ms = (time.perf_counter() - start) * 1000.0
        times_ms.append(duration_ms)

    times_ms.sort()
    med = statistics.median(times_ms)
    # 95th percentile using nearest rank
    p95_idx = int(0.95 * len(times_ms))
    p95 = times_ms[min(p95_idx, len(times_ms) - 1)]
    min_ms = times_ms[0]
    max_ms = times_ms[-1]

    return {
        "query": query_name,
        "runs": n_runs,
        "median_ms": round(med, 2),
        "p95_ms": round(p95, 2),
        "min_ms": round(min_ms, 2),
        "max_ms": round(max_ms, 2),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--tenant", default="acme", help="Target tenant")
    ap.add_argument("--runs", type=int, default=30, help="Number of timed runs (default: 30)")
    args = ap.parse_args()

    now_stamp = int(time.time())
    db = get_db()
    g_name = graph_name(args.tenant)
    graph = db.select_graph(g_name)

    bench_date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    machine_info = f"{platform.system()} {platform.release()} ({platform.machine()}), Python {platform.python_version()}"

    print("=" * 80)
    print("FALKORDB QUERY LATENCY BENCHMARK (1 warm-up, 30 timed iterations)")
    print("=" * 80)
    print(f"Date:    {bench_date}")
    print(f"Machine: {machine_info}")
    print(f"Target:  {g_name} on FalkorDB (:6380)")
    print("-" * 80)

    alerting_services = sorted({svc for svc, _m, _s, _o in ALERTS})

    benchmarks = [
        ("blast_radius", "queries/blast_radius.cypher", {"service": "currency"}),
        ("suspect_changes", "queries/suspect_changes.cypher", {"service": "checkout", "incident_start": now_stamp}),
        ("similar_incidents", "queries/similar_incidents.cypher", {"suspect": "currency", "alerting": alerting_services}),
        ("best_playbook", "queries/best_playbook.cypher", {"service": "currency"}),
        ("who_to_page", "queries/who_to_page.cypher", {"service": "currency"}),
        ("knowledge_spof", "queries/knowledge_spof.cypher", {}),
    ]

    results = []
    print(f"{'Query Name':<20} {'Cypher File':<32} {'Median':<10} {'p95':<10} {'Min':<8} {'Max':<8}")
    print("-" * 90)

    for q_name, file_name, params in benchmarks:
        res = benchmark_query(graph, q_name, params, n_runs=args.runs)
        res["file"] = file_name
        results.append(res)
        print(f"{res['query']:<20} {file_name:<32} {res['median_ms']:>6.2f} ms {res['p95_ms']:>6.2f} ms {res['min_ms']:>5.2f} ms {res['max_ms']:>5.2f} ms")

    print("=" * 90)
    print("\nMarkdown Table for README:")
    print("-" * 90)
    print("| Question | Why It Needs Multi-Hop Traversal | Cypher Query File | Measured Latency (Median / p95) |")
    print("| :--- | :--- | :--- | :--- |")

    questions = {
        "blast_radius": (
            "What downstream services break if service X fails?",
            "Traverses reverse `DEPENDS_ON*1..4` dependency paths to identify all cascading victims ordered by tier and distance."
        ),
        "suspect_changes": (
            "What recent changes were deployed upstream of alerting services?",
            "Correlates `Change` events deployed within the last 2 hours to services reachable within `DEPENDS_ON*0..3` hops."
        ),
        "similar_incidents": (
            "What past incidents shared this root cause and cascade topology?",
            "Anchors on `(origin)` while calculating alert symptom overlap on `(i)-[:AFFECTED]->(s)` and change causality via `(i)-[:CAUSED_BY]->(c)`."
        ),
        "best_playbook": (
            "Which playbook has the highest empirical win rate for this service?",
            "Traverses `(:Playbook)-[:APPLIES_TO]->(s)` and computes Laplace-smoothed win/loss scores from historical resolution edges."
        ),
        "who_to_page": (
            "Who is on call for the owning team with the most prior outage fixes?",
            "Traverses `(s)<-[:OWNS]-(t)<-[:ON_CALL_FOR]-(p)` and counts historical `(p)-[:RESOLVED]->(:Incident)-[:AFFECTED]->(s)` links."
        ),
        "knowledge_spof": (
            "Which services have an organizational bus factor of exactly 1 engineer?",
            "Traverses all `(s)<-[:AFFECTED]-(:Incident)<-[:RESOLVED]-(p)` and filters services where `count(DISTINCT p) == 1`."
        ),
    }

    for r in results:
        q_text, why_text = questions[r["query"]]
        print(f"| **{q_text}** | {why_text} | [`{r['file']}`]({r['file']}) | **{r['median_ms']:.2f} ms** / {r['p95_ms']:.2f} ms |")

    print("\nHonest Boundary Note:")
    print("Measured on synthetic graph topology of 40 services, 77 dependencies, and 30 historical incidents; not production scale.")


if __name__ == "__main__":
    main()
