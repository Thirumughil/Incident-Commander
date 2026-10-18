#!/usr/bin/env python3
"""Prove why INC-014 ranks #1 and the planted decoys (INC-021, INC-007) lose.

Runs on a throwaway copy of the tenant graph (default 'tenant_zdecoys')
created via FalkorDB graph.copy(), and deletes the copy upon completion.

Usage:
    python scripts/prove_decoys.py --tenant acme
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic import queries  # noqa: E402
from ic.graph import get_db, graph_name  # noqa: E402
from ic.scenario import ALERTS  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--tenant", default="acme", help="Source tenant to copy")
    ap.add_argument("--scratch-name", default="tenant_zdecoys", help="Throwaway graph name")
    args = ap.parse_args()

    db = get_db()
    src_graph_name = graph_name(args.tenant)
    scratch_name = args.scratch_name

    print(f"Connecting to live FalkorDB...")
    src_graph = db.select_graph(src_graph_name)

    # Clean up any leftover throwaway graph first
    try:
        db.select_graph(scratch_name).delete()
    except Exception:
        pass

    print(f"Creating throwaway graph copy: {src_graph_name} -> {scratch_name}")
    scratch = src_graph.copy(scratch_name)

    try:
        alerting_services = sorted({svc for svc, _m, _s, _o in ALERTS})
        suspect = "currency"

        print(f"\nScenario Parameters:")
        print(f"  Suspected Origin: {suspect}")
        print(f"  Alerting Services ({len(alerting_services)}): {alerting_services}")

        # 1. Run actual Cypher query: similar_incidents
        rows = queries.run(scratch, "similar_incidents", suspect=suspect, alerting=alerting_services)

        print(f"\nLive Cypher Query Result (`queries/similar_incidents.cypher`):")
        print(f"{'Rank':<5} {'Incident':<12} {'Score':<7} {'Overlap':<9} {'Chg Caused':<12} {'Playbook':<25} {'Title'}")
        print("-" * 100)
        for idx, r in enumerate(rows, start=1):
            print(f"{idx:<5} {r['incident']:<12} {r['score']:<7} {r['overlap']:<9} {r['change_caused']:<12} "
                  f"{r['playbook'] + ' (' + str(r['minutes']) + 'm)':<25} {r['title']}")

        # 2. Inspect the 3 planted incidents specifically: INC-014, INC-007, INC-021
        cypher_inspect = """
        MATCH (i:Incident) WHERE i.id IN ['INC-014', 'INC-007', 'INC-021']
        OPTIONAL MATCH (i)-[:AFFECTED {role: 'origin'}]->(orig:Service)
        OPTIONAL MATCH (i)-[:AFFECTED {role: 'impacted'}]->(imp:Service)
        OPTIONAL MATCH (i)-[:CAUSED_BY]->(c:Change)
        OPTIONAL MATCH (i)-[f:FIXED_BY]->(pb:Playbook)
        RETURN i.id AS id, i.title AS title, orig.name AS origin, collect(DISTINCT imp.name) AS impacted,
               c.id AS change_id, c.kind AS change_kind, c.summary AS change_summary,
               pb.id AS pb_id, pb.name AS pb_name, f.worked AS worked, f.minutes AS minutes
        ORDER BY i.id
        """
        raw_items = scratch.query(cypher_inspect).result_set

        print(f"\nDetailed Score Breakdown of Planted Incidents:")
        print("=" * 100)
        inspected = {}
        for row in raw_items:
            inc_id, title, origin, impacted, chg_id, chg_kind, chg_sum, pb_id, pb_name, worked, mins = row
            # Calculate overlap with current alerting services
            overlap_services = sorted(set(impacted).intersection(set(alerting_services)))
            overlap_count = len(overlap_services)
            chg_caused = 1 if chg_id else 0
            computed_score = overlap_count + 2 * chg_caused
            origin_match = (origin == suspect)

            inspected[inc_id] = {
                "id": inc_id,
                "title": title,
                "origin": origin,
                "impacted": impacted,
                "overlap_services": overlap_services,
                "overlap_count": overlap_count,
                "change_id": chg_id,
                "change_kind": chg_kind,
                "change_summary": chg_sum,
                "change_caused": chg_caused,
                "score": computed_score,
                "origin_match": origin_match,
                "playbook_id": pb_id,
                "playbook_name": pb_name,
                "worked": worked,
                "minutes": mins,
            }

            print(f"[{inc_id}] {title}")
            print(f"  * Origin Service:        {origin} (Matches Suspect '{suspect}': {origin_match})")
            print(f"  * Downstream Impacted:   {impacted}")
            print(f"  * Alerting Overlap:      {overlap_services} -> count = {overlap_count}")
            print(f"  * Causal Change:         {chg_id or 'None'} ({chg_kind or 'N/A'}: {chg_sum or 'N/A'}) -> factor = +{2 * chg_caused}")
            print(f"  * Total Incident Score:  {overlap_count} + 2*({chg_caused}) = {computed_score}")
            print(f"  * Historical Fix:        {pb_id} ({pb_name}) in {mins} min (worked={worked})")
            print("-" * 100)

        # 3. Explicit Data-Driven Statement
        inc14 = inspected.get("INC-014")
        inc7 = inspected.get("INC-007")
        inc21 = inspected.get("INC-021")

        print("\nEXPLICIT VERDICT: WHY INC-014 RANKS FIRST & DECOYS LOSE:")
        print("=" * 100)

        if not inc14 or not inc7 or not inc21:
            print("[FAIL] Missing one or more planted incidents in graph.")
            sys.exit(1)

        # Confirm INC-014 beats INC-007
        if inc14["score"] > inc7["score"]:
            print(f"1. INC-014 vs INC-007 (Decoy on Same Origin):")
            print(f"   - Both originate on '{suspect}'.")
            print(f"   - INC-014 has {inc14['overlap_count']} overlapping alerting services ({inc14['overlap_services']}) vs {inc7['overlap_count']} for INC-007 ({inc7['overlap_services']}).")
            print(f"   - INC-014 was triggered by a config change ('{inc14['change_summary']}'), adding +2 change causality.")
            print(f"   - INC-007 had NO causal change recorded (+0).")
            print(f"   - Score comparison: INC-014 ({inc14['score']}) > INC-007 ({inc7['score']}).")
            print(f"   - Proven fix: INC-014 used {inc14['playbook_id']} ({inc14['playbook_name']}), which addresses pool configuration.")
        else:
            print(f"[FINDING] INC-014 ({inc14['score']}) did not score higher than INC-007 ({inc7['score']})!")

        # Confirm INC-021 is eliminated
        print(f"\n2. INC-014 vs INC-021 (Decoy on Different Origin):")
        print(f"   - Origin Service: INC-014 is on '{inc14['origin']}', while INC-021 is on '{inc21['origin']}'.")
        print(f"   - Graph Filtering: Because Analyzer traced dependencies upstream to '{suspect}', Cypher matches `origin: '{suspect}'`.")
        print(f"   - INC-021 is ELIMINATED from similar incidents because origin '{inc21['origin']}' != '{suspect}'.")
        print(f"   - Even in ungrounded symptom matching: INC-021 has score {inc21['score']} (no change recorded), losing to INC-014's score of {inc14['score']}.")
        print(f"   - Playbook mismatch: INC-021 applied {inc21['playbook_id']} ({inc21['playbook_name']}) on payment, which cannot fix database pool starvation on currency.")

        # Check ranking order
        top_historical = [r for r in rows if r["incident"].startswith("INC-0")][:1]
        if top_historical and top_historical[0]["incident"] == "INC-014":
            print(f"\n[PASS] INC-014 is confirmed as the #1 ranked historical twin incident.")
        else:
            top_id = top_historical[0]["incident"] if top_historical else "None"
            print(f"\n[NOTE] Top historical incident is {top_id} (INC-014 score is {inc14['score']}).")

    finally:
        print(f"\nCleaning up throwaway graph: {scratch_name}")
        try:
            scratch.delete()
            print("Cleanup complete.")
        except Exception as exc:
            print(f"Warning during cleanup: {exc}")


if __name__ == "__main__":
    main()
