#!/usr/bin/env python3
"""Reproduce a resolve request safely, with the full traceback, on a throwaway COPY of a tenant graph.

Your real data is never touched: the tenant graph is copied to ``tenant_zrepro``, the Learner runs
against the copy exactly as the API would, and the copy is deleted at the end.

    python scripts/repro_resolve.py --tenant acme --incident INC-1792087137
    python scripts/repro_resolve.py --tenant acme --incident INC-1792087137 --playbook PB-04 --minutes 9 --person "Priya Raman"
    python scripts/repro_resolve.py --tenant acme --list      # incidents you can try

Nothing here changes the real graph, so it does not count as recording a real fix.
"""
import argparse
import os
import sys
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic.agents import Learner  # noqa: E402
from ic.graph import get_db, graph_name  # noqa: E402
from ic.tools import Tools  # noqa: E402

COPY = "tenant_zrepro"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tenant", default="acme")
    ap.add_argument("--incident")
    ap.add_argument("--playbook")
    ap.add_argument("--minutes", type=int)
    ap.add_argument("--person")
    ap.add_argument("--failed", action="store_true")
    ap.add_argument("--list", action="store_true", help="list incidents and exit")
    args = ap.parse_args()

    db = get_db()
    src = db.select_graph(graph_name(args.tenant))
    real = Tools(src)

    if args.list or not args.incident:
        for row in real.incident_list()[:15]:
            print(f"{row['id']:<22} {row['status']:<9} {row['severity']:<5} origin={row['origin']} "
                  f"recommended={row['recommended_playbook']} paged={row['paged']}")
        return

    try:
        db.select_graph(COPY).delete()
    except Exception:  # noqa: BLE001
        pass
    scratch = src.copy(COPY)
    try:
        tools = Tools(scratch)
        print(f"Resolving {args.incident} on a copy of {graph_name(args.tenant)} ...")
        try:
            out = Learner(tools).resolve(args.incident, playbook=args.playbook, worked=not args.failed,
                                         minutes=args.minutes, person=args.person)
            print("OK:", out)
            print("Findings now on the copy:")
            for f in tools.findings(args.incident)[-2:]:
                print("  ", f["agent"], "-", f["claim"])
        except Exception:  # noqa: BLE001
            print("FAILED. Full traceback:\n")
            traceback.print_exc()
            sys.exit(1)
    finally:
        try:
            scratch.delete()
        except Exception:  # noqa: BLE001
            pass
        print("(copy deleted; your real graph was not changed)")


if __name__ == "__main__":
    main()
