"""Agent control flow against a fake tool layer loaded with real query output from a live run."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic import reasoning  # noqa: E402
from ic.agents import Analyzer, Detector, Learner, Responder  # noqa: E402

CHG = dict(change="CHG-LIVE-1", kind="config", summary="Lower DB connection pool 50 -> 10",
           at=1000, changed_service="currency")
ALERTS = [
    dict(alert="A1", metric="p99_latency_ms", severity="critical", fired_at=1000 + 1320, service="checkout"),
    dict(alert="A2", metric="error_rate_pct", severity="warning", fired_at=1000 + 1340, service="cart"),
    dict(alert="A3", metric="error_rate_pct", severity="critical", fired_at=1000 + 1355, service="frontend"),
    dict(alert="A4", metric="timeouts_per_min", severity="critical", fired_at=1000 + 1375, service="payment"),
]
BEST = [
    dict(playbook_id="PB-04", name="rollback-pool-config", wins=3, losses=0, score=0.8),
    dict(playbook_id="PB-05", name="flush-cache", wins=6, losses=1, score=0.778),
    dict(playbook_id="PB-01", name="rollback-last-change", wins=12, losses=4, score=0.722),
]
SIMILAR = [
    dict(incident="INC-014", title="currency latency spike, checkout slow", started_at=1, overlap=2,
         change_caused=1, score=4, playbook_id="PB-04", playbook="rollback-pool-config", minutes=11),
    dict(incident="INC-007", title="currency elevated error rate, cart failing", started_at=0, overlap=1,
         change_caused=0, score=1, playbook_id="PB-05", playbook="flush-cache", minutes=14),
]


class FakeTools:
    def __init__(self):
        self.calls, self.tasks = [], []
        self.stats = {r["playbook_id"]: dict(r) for r in BEST}
        self.info = dict(id="INC-1", title="checkout p99_latency_ms (+3 related alerts)", status="open",
                         severity="sev1", started_at=2320, recommended_playbook=None, paged=None, root_cause=None)

    def _log(self, name, *a):
        self.calls.append((name, a))

    # reads
    def open_alerts(self): return ALERTS
    def incident_alerts(self, incident): return ALERTS
    def incident_info(self, incident): return self.info
    def incident_origin(self, incident): return dict(service="currency", tier=1)
    def blast_radius(self, service):
        return [dict(service=s, tier=t, hops=1) for s, t in
                [("checkout", 1), ("frontend", 1), ("payment", 1), ("pricing", 2), ("quote", 2)]]
    def explain_path(self, impacted, origin): return dict(path=[impacted, origin], hops=1)
    def suspect_changes(self, service, start): return [dict(CHG, distance=1)]
    def common_upstream(self, alerting): return [dict(service="currency", tier=1, reached=4, total_distance=6)]
    def similar_incidents(self, suspect, alerting): return SIMILAR
    def best_playbook(self, service):
        return [dict(r, score=(r["wins"] + 1) / (r["wins"] + r["losses"] + 2)) for r in self.stats.values()]
    def who_to_page(self, service):
        return [dict(person="Priya Raman", role="Senior SRE", team="payments", channel="#team-payments", prior_fixes=1)]
    def pagerank(self): return [dict(service="secrets-vault", score=0.03), dict(service="currency", score=0.02)]
    def findings(self, incident):
        return [dict(f, id="x") for f in self.findings_store]
    findings_store = []

    # writes
    def link_related_alerts(self): self._log("link")
    def group_alerts(self): return [dict(componentId=1, alerts=["A1", "A2", "A3", "A4"])]
    def open_incident(self, incident, title, severity, started_at, alert_ids):
        self._log("open_incident", incident, severity, tuple(alert_ids))
    def create_task(self, incident, agent, kind):
        tid = f"T{len(self.tasks) + 1}"
        self.tasks.append(dict(id=tid, agent=agent, kind=kind, incident=incident, status="open"))
        return tid
    def complete_task(self, task): self._set(task, "done")
    def handoff_task(self, task, to, reason): self._set(task, "handed_off"); self._log("handoff", task, to)
    def _set(self, task, status):
        for t in self.tasks:
            if t["id"] == task:
                t["status"] = status
    def mark_affected(self, incident, service, role): self._log("affected", service, role)
    def record_cause(self, incident, change, root_cause): self._log("cause", change, root_cause)
    def set_recommendation(self, incident, playbook, person):
        self.info["recommended_playbook"], self.info["paged"] = playbook, person
    def record_responder(self, person, incident, minutes): self._log("responder", person, minutes)
    def record_outcome(self, incident, playbook, worked, minutes):
        s = self.stats[playbook]
        s["wins" if worked else "losses"] += 1
    def record_finding(self, incident, agent, claim, confidence, query, evidence):
        self.findings_store.append(dict(agent=agent, claim=claim, confidence=confidence, query=query, evidence=evidence))
        return "F"

    # the real Tools.open_tasks returns task/incident keys
    def open_tasks(self, agent):  # noqa: F811
        return [dict(task=t["id"], kind=t["kind"], incident=t["incident"]) for t in self.tasks
                if t["agent"] == agent and t["status"] == "open"]


class AgentFlowTests(unittest.TestCase):
    def setUp(self):
        FakeTools.findings_store = []
        self.t = FakeTools()

    def run_all(self):
        opened = Detector(self.t).run()
        analyzed = Analyzer(self.t).run_pending()
        responded = Responder(self.t, use_llm=False).run_pending()
        return opened, analyzed, responded

    def test_detector_groups_alerts_into_one_incident(self):
        opened = Detector(self.t).run()
        self.assertEqual(len(opened), 1)
        self.assertEqual(opened[0]["severity"], "sev1")
        self.assertEqual(self.t.open_tasks("Analyzer")[0]["incident"], opened[0]["incident"])
        self.assertEqual(FakeTools.findings_store[0]["agent"], "Detector")

    def test_full_pipeline_decisions(self):
        opened, analyzed, responded = self.run_all()
        self.assertEqual(analyzed[0]["origin"], "currency")
        self.assertEqual(analyzed[0]["similar"][0], "INC-014")
        self.assertEqual(responded[0]["playbook"], "rollback-pool-config")
        self.assertEqual(responded[0]["page"], "Priya Raman")
        self.assertEqual(self.t.info["recommended_playbook"], "PB-04")
        self.assertIn("rollback-pool-config", responded[0]["update"])

    def test_agents_coordinate_through_tasks_only(self):
        self.run_all()
        by_agent = {t["agent"]: t["status"] for t in self.t.tasks}
        self.assertEqual(by_agent, {"Analyzer": "handed_off", "Responder": "done"})
        self.assertIn(("handoff", ("T1", "Responder")), self.t.calls)

    def test_every_claim_has_evidence_and_query(self):
        self.run_all()
        for f in FakeTools.findings_store:
            self.assertTrue(f["query"], f["claim"])
            self.assertTrue(any(f["evidence"].values()), f["claim"])
        agents = {f["agent"] for f in FakeTools.findings_store}
        self.assertEqual(agents, {"Detector", "Analyzer", "Responder"})

    def test_analyzer_remembers_the_cause(self):
        self.run_all()
        self.assertIn(("cause", ("CHG-LIVE-1", "Lower DB connection pool 50 -> 10")), self.t.calls)

    def test_recommendation_shows_total_score_and_alternatives(self):
        self.run_all()
        claim = next(f for f in FakeTools.findings_store if f["claim"].startswith("Recommended fix"))["claim"]
        self.assertIn("total 1.05", claim)
        self.assertIn("0.80", claim)
        self.assertIn("+ 0.25 because INC-014", claim)
        self.assertIn("flush-cache 0.84", claim)

    def test_origin_claim_cites_the_change(self):
        self.run_all()
        claim = next(f for f in FakeTools.findings_store if f["claim"].startswith("Probable origin"))
        self.assertIn("CHG-LIVE-1", claim["claim"])
        self.assertIn("4 of 4", claim["claim"])
        self.assertEqual(claim["evidence"]["Change"], ["CHG-LIVE-1"])

    def test_learner_changes_the_ranking(self):
        self.run_all()
        before = {r["playbook_id"]: r["score"] for r in self.t.best_playbook("currency")}
        out = Learner(self.t).resolve("INC-1", worked=True, minutes=11)
        self.assertEqual(out["playbook"], "PB-04")
        self.assertGreater(out["after"], out["before"])
        self.assertAlmostEqual(out["before"], before["PB-04"])
        self.assertIn(("responder", ("Priya Raman", 11)), self.t.calls)

    def test_learner_failure_lowers_score(self):
        self.run_all()
        out = Learner(self.t).resolve("INC-1", worked=False, minutes=30)
        self.assertLess(out["after"], out["before"])

    def test_learner_rejects_inapplicable_playbook(self):
        self.run_all()
        with self.assertRaises(ValueError):
            Learner(self.t).resolve("INC-1", playbook="PB-99")


class ReasoningTests(unittest.TestCase):
    def test_pick_suspect_prefers_change_reaching_more_services(self):
        near = dict(change="C1", kind="deploy", summary="x", at=5, changed_service="auth", distance=1)
        wide = dict(change="C2", kind="config", summary="y", at=1, changed_service="currency", distance=2)
        got = reasoning.pick_suspect({"checkout": [near, wide], "frontend": [wide], "cart": [wide]}, [])
        self.assertEqual(got["service"], "currency")
        self.assertEqual(got["reached"], ["cart", "checkout", "frontend"])

    def test_pick_suspect_falls_back_to_upstream(self):
        got = reasoning.pick_suspect({"checkout": []}, [dict(service="redis-cache", tier=1, reached=3, total_distance=4)])
        self.assertEqual((got["kind"], got["service"]), ("upstream", "redis-cache"))

    def test_choose_playbook_only_boosts_applicable_playbooks(self):
        ranked = reasoning.choose_playbook(BEST[1:], SIMILAR)  # PB-04 does not apply here
        self.assertEqual(ranked[0]["playbook_id"], "PB-05")
        self.assertIsNone(next(r for r in ranked if r["playbook_id"] == "PB-01")["similar_incident"])

    def test_choose_playbook_boost_can_reorder(self):
        close = [dict(playbook_id="PB-A", name="a", wins=1, losses=0, score=0.70),
                 dict(playbook_id="PB-04", name="rollback-pool-config", wins=1, losses=0, score=0.60)]
        ranked = reasoning.choose_playbook(close, SIMILAR)
        self.assertEqual(ranked[0]["playbook_id"], "PB-04")


if __name__ == "__main__":
    unittest.main()
