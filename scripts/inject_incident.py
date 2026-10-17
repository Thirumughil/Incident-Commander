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

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic.graph import tenant_graph  # noqa: E402
from ic.scenario import inject_live  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tenant", default="acme")
    ap.add_argument("--origin", default="currency", help="service the bad change landed on")
    args = ap.parse_args()

    out = inject_live(tenant_graph(args.tenant), origin=args.origin)
    print(f"Injected change {out['change']} on {args.origin} and {len(out['alerts'])} alerts "
          f"into tenant {args.tenant!r}.")


if __name__ == "__main__":
    main()
