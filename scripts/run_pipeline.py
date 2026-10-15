#!/usr/bin/env python3
"""Run Detector -> Analyzer -> Responder on the open alerts of a tenant and print the traced result.

    python scripts/inject_incident.py --tenant acme
    python scripts/run_pipeline.py --tenant acme
    python scripts/run_pipeline.py --tenant acme --resolve INC-<id>      # Learner: record that the fix worked
    python scripts/run_pipeline.py --tenant acme --resolve INC-<id> --failed
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic.pipeline import resolve, run_pipeline  # noqa: E402


def print_findings(tools, incident):
    for f in tools.findings(incident):
        print(f"  [{f['agent']:<9}] ({f['confidence']:.2f}) {f['claim']}")
        print(f"              evidence: {', '.join(f['evidence']) or '-'}   via {f['query']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tenant", default="acme")
    ap.add_argument("--no-llm", action="store_true", help="never call a model, use the plain template")
    ap.add_argument("--resolve", metavar="INCIDENT", help="record the outcome of an incident (Learner)")
    ap.add_argument("--playbook", help="playbook id used (default: the one the Responder recommended)")
    ap.add_argument("--failed", action="store_true", help="the fix did not work")
    ap.add_argument("--minutes", type=int, help="minutes the fix took")
    ap.add_argument("--person", help="who resolved it (default: the person paged)")
    args = ap.parse_args()

    if args.resolve:
        out = resolve(args.tenant, args.resolve, playbook=args.playbook, worked=not args.failed,
                      minutes=args.minutes, person=args.person)
        print(f"Learner recorded {out['playbook']} for {out['incident']}: "
              f"score {out['before']:.3f} -> {out['after']:.3f}")
        return

    result = run_pipeline(args.tenant, use_llm=not args.no_llm)
    if not result["opened"]:
        print("No open alerts. Run scripts/inject_incident.py first.")
        return
    for item in result["opened"]:
        print(f"\n=== {item['incident']}  ({item['severity']}, {item['alerts']} alerts) ===")
        print_findings(result["tools"], item["incident"])
    for item in result["responded"]:
        print(f"\nRecommended: {item['playbook']}   Page: {item['page']}")
        print(f"To record the outcome: python scripts/run_pipeline.py --tenant {args.tenant} --resolve {item['incident']}")


if __name__ == "__main__":
    main()
