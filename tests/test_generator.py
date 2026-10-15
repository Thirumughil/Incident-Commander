import os
import sys
import unittest
from collections import Counter
from graphlib import CycleError, TopologicalSorter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic.graph import graph_name  # noqa: E402
from ic.schema import NODE_LABELS, REL_TYPES  # noqa: E402
from ic.seed import data  # noqa: E402
from ic.seed.generator import build_dataset  # noqa: E402
from ic.seed.loader import _edge_query, _node_query, load_dataset  # noqa: E402

NOW = 1_800_000_000  # fixed so tests are deterministic


def edges(ds, rel):
    return next(e for e in ds["edges"] if e["rel"] == rel)["rows"]


class GeneratorTests(unittest.TestCase):
    def setUp(self):
        self.ds = build_dataset(tenant="acme", seed=1, now=NOW)

    def test_sizes(self):
        n = self.ds["nodes"]
        self.assertEqual(len(n["Service"]), 40)
        self.assertEqual(len(n["Team"]), 8)
        self.assertEqual(len(n["Incident"]), 30)
        self.assertEqual(len(n["Playbook"]), 15)
        self.assertEqual(len(n["Agent"]), 4)
        self.assertGreaterEqual(len(n["Person"]), 20)
        self.assertGreaterEqual(len(n["Change"]), 60)

    def test_dependencies_are_acyclic_and_reference_real_services(self):
        names = {s["name"] for s in self.ds["nodes"]["Service"]}
        graph = {}
        for e in edges(self.ds, "DEPENDS_ON"):
            self.assertIn(e["src"], names)
            self.assertIn(e["dst"], names)
            graph.setdefault(e["src"], set()).add(e["dst"])
        try:
            list(TopologicalSorter(graph).static_order())
        except CycleError as exc:
            self.fail(f"dependency cycle: {exc}")

    def test_every_edge_endpoint_exists(self):
        keys = {}
        for label, rows in self.ds["nodes"].items():
            key = {"Service": "name", "Team": "name", "Person": "name", "Agent": "name"}.get(label, "id")
            keys[label] = {r[key] for r in rows}
        for e in self.ds["edges"]:
            for row in e["rows"]:
                self.assertIn(row["src"], keys[e["src"][0]], f'{e["rel"]} src {row["src"]}')
                self.assertIn(row["dst"], keys[e["dst"][0]], f'{e["rel"]} dst {row["dst"]}')

    def test_names_used_in_schema_constants(self):
        self.assertTrue(set(self.ds["nodes"]) <= set(NODE_LABELS))
        self.assertTrue({e["rel"] for e in self.ds["edges"]} <= set(REL_TYPES))

    def test_unique_ids(self):
        for label, key in (("Incident", "id"), ("Change", "id"), ("Alert", "id"), ("Playbook", "id"),
                           ("Service", "name"), ("Person", "name")):
            values = [r[key] for r in self.ds["nodes"][label]]
            self.assertEqual(len(values), len(set(values)), label)

    def test_one_on_call_person_per_team(self):
        by_team = Counter()
        member_team = {e["src"]: e["dst"] for e in edges(self.ds, "MEMBER_OF")}
        for p in self.ds["nodes"]["Person"]:
            if p["oncall_now"]:
                by_team[member_team[p["name"]]] += 1
        self.assertEqual(set(by_team), set(data.TEAMS))
        self.assertTrue(all(v == 1 for v in by_team.values()))

    def test_planted_twin_incident(self):
        inc = {i["id"]: i for i in self.ds["nodes"]["Incident"]}
        self.assertIn("INC-014", inc)
        affected = {(e["src"], e["dst"]): e["role"] for e in edges(self.ds, "AFFECTED")}
        self.assertEqual(affected[("INC-014", "currency")], "origin")
        for svc in ("quote", "checkout", "frontend"):
            self.assertEqual(affected[("INC-014", svc)], "impacted")
        fixed = [e for e in edges(self.ds, "FIXED_BY") if e["src"] == "INC-014"]
        self.assertEqual([(e["dst"], e["worked"], e["minutes"]) for e in fixed], [("PB-04", True, 11)])
        resolved = [e for e in edges(self.ds, "RESOLVED") if e["dst"] == "INC-014"]
        self.assertEqual(resolved[0]["src"], "Priya Raman")
        # a suspect change 25 minutes before the incident on the same service
        chg = [e["dst"] for e in edges(self.ds, "CAUSED_BY") if e["src"] == "INC-014"]
        self.assertEqual(len(chg), 1)
        change = next(c for c in self.ds["nodes"]["Change"] if c["id"] == chg[0])
        self.assertEqual(inc["INC-014"]["started_at"] - change["at"], 25 * 60)
        self.assertIn("connection pool", change["summary"])

    def test_planted_decoys(self):
        affected = {(e["src"], e["dst"]) for e in edges(self.ds, "AFFECTED")}
        self.assertIn(("INC-021", "payment"), affected)
        self.assertNotIn(("INC-021", "currency"), affected)
        self.assertIn(("INC-007", "currency"), affected)
        self.assertNotIn(("INC-007", "checkout"), affected)

    def test_playbook_counters_include_incident_outcomes(self):
        pb = {p["id"]: p for p in self.ds["nodes"]["Playbook"]}
        for pb_id, base in ((p[0], p) for p in data.PLAYBOOKS):
            wins = sum(1 for e in edges(self.ds, "FIXED_BY") if e["dst"] == pb_id and e["worked"])
            fails = sum(1 for e in edges(self.ds, "FIXED_BY") if e["dst"] == pb_id and not e["worked"])
            self.assertEqual(pb[pb_id]["successes"], base[5] + wins)
            self.assertEqual(pb[pb_id]["failures"], base[6] + fails)

    def test_every_incident_is_resolved_with_a_working_fix(self):
        worked = Counter(e["src"] for e in edges(self.ds, "FIXED_BY") if e["worked"])
        for inc in self.ds["nodes"]["Incident"]:
            self.assertEqual(worked[inc["id"]], 1, inc["id"])
            self.assertGreater(inc["resolved_at"], inc["started_at"])
            self.assertLess(inc["resolved_at"], NOW)

    def test_bus_factor_services_exist(self):
        fixers = {}
        by_inc = {}
        for e in edges(self.ds, "RESOLVED"):
            by_inc.setdefault(e["dst"], set()).add(e["src"])
        for e in edges(self.ds, "AFFECTED"):
            fixers.setdefault(e["dst"], set()).update(by_inc.get(e["src"], set()))
        weak = [s["name"] for s in self.ds["nodes"]["Service"] if len(fixers.get(s["name"], ())) < 2]
        self.assertGreaterEqual(len(weak), 3)

    def test_deterministic(self):
        again = build_dataset(tenant="acme", seed=1, now=NOW)
        self.assertEqual(self.ds, again)

    def test_second_tenant_is_independent(self):
        other = build_dataset(tenant="globex", seed=2, now=NOW, plant_demo=False)
        mine = {p["name"] for p in self.ds["nodes"]["Person"]}
        theirs = {p["name"] for p in other["nodes"]["Person"]}
        self.assertFalse(mine & theirs)
        self.assertNotIn("Priya Raman", theirs)
        other_ids = {i["title"] for i in other["nodes"]["Incident"]}
        self.assertNotIn("currency latency spike, checkout slow", other_ids)


class LoaderTests(unittest.TestCase):
    def test_load_issues_parameterised_queries(self):
        calls = []

        class FakeGraph:
            def query(self, q, params=None):
                calls.append((q, params))

            def delete(self):
                calls.append(("DELETE", None))

        ds = build_dataset(now=NOW)
        counts = load_dataset(FakeGraph(), ds, reset=True)
        self.assertEqual(counts["Service"], 40)
        self.assertEqual(calls[0][0], "DELETE")
        index_calls = [c for c in calls if c[0].startswith("CREATE INDEX")]
        self.assertEqual(len(index_calls), 10)
        unwind = [c for c in calls if c[0].startswith("UNWIND")]
        self.assertTrue(all(isinstance(c[1]["rows"], list) for c in unwind))

    def test_query_text(self):
        self.assertEqual(
            _node_query("Service", {"name": 1, "tier": 2}),
            "UNWIND $rows AS r CREATE (:Service {name: r.name, tier: r.tier})",
        )
        q = _edge_query("DEPENDS_ON", ("Service", "name"), ("Service", "name"), {"src": 1, "dst": 2, "kind": 3})
        self.assertIn("MATCH (a:Service {name: r.src}), (b:Service {name: r.dst})", q)
        self.assertIn("CREATE (a)-[:DEPENDS_ON {kind: r.kind}]->(b)", q)


class TenantTests(unittest.TestCase):
    def test_graph_name_validation(self):
        self.assertEqual(graph_name("acme"), "tenant_acme")
        for bad in ("", "A", "acme corp", "acme;drop", "../x", "1abc", None):
            with self.assertRaises(ValueError):
                graph_name(bad)


if __name__ == "__main__":
    unittest.main()
