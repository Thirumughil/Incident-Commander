#!/usr/bin/env python3
"""Seed a tenant graph with synthetic data.

    python scripts/seed.py --tenant acme --reset
    python scripts/seed.py --tenant globex --seed 2 --no-plant
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic.graph import graph_name, tenant_graph  # noqa: E402
from ic.seed.generator import build_dataset  # noqa: E402
from ic.seed.loader import load_dataset  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tenant", default="acme")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--no-plant", action="store_true", help="skip the planted demo incidents")
    ap.add_argument("--incidents", type=int, default=30)
    ap.add_argument("--reset", action="store_true", help="delete the tenant graph first")
    args = ap.parse_args()

    graph_name(args.tenant)  # validate early
    dataset = build_dataset(tenant=args.tenant, seed=args.seed, plant_demo=not args.no_plant,
                            n_incidents=args.incidents)
    graph = tenant_graph(args.tenant)
    counts = load_dataset(graph, dataset, reset=args.reset)
    print(f"Loaded tenant {args.tenant!r} into graph {graph_name(args.tenant)!r}:")
    for key, n in counts.items():
        print(f"  {key:<12} {n}")


if __name__ == "__main__":
    main()
