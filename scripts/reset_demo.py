"""One-command demo reset script for Incident Commander.

Quickly resets a tenant graph back to clean seed state so demo video
recordings can be rehearsed and recorded from a clean baseline.

Usage:
    python scripts/reset_demo.py --tenant acme --yes
"""
import argparse
import sys
from pathlib import Path

# Ensure src is on path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from ic.graph import graph_name, tenant_graph
from ic.seed.generator import build_dataset
from ic.seed.loader import load_dataset


def main():
    parser = argparse.ArgumentParser(description="Reset demo tenant to clean baseline.")
    parser.add_argument("--tenant", default="acme", help="Tenant to reset (default: acme)")
    parser.add_argument("--yes", action="store_true", help="Confirmation flag (required)")
    args = parser.parse_args()

    if not args.yes:
        print("ERROR: Safety guard: --yes is required to reset the demo graph.")
        print(f"To reset '{args.tenant}', run:\n    python scripts/reset_demo.py --tenant {args.tenant} --yes")
        sys.exit(1)

    print(f"Resetting demo state for tenant '{args.tenant}' (graph: '{graph_name(args.tenant)}') ...")
    dataset = build_dataset(tenant=args.tenant, seed=1, plant_demo=True, n_incidents=30)
    graph = tenant_graph(args.tenant)
    counts = load_dataset(graph, dataset, reset=True)

    print(f"\n[SUCCESS] Tenant '{args.tenant}' demo state reset cleanly!")
    for label, count in counts.items():
        print(f"  {label:<12} {count}")
    print("\nYou are ready to record the demo walkthrough from a pristine baseline.")


if __name__ == "__main__":
    main()
