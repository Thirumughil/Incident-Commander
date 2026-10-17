"""Service layer and read models, tested offline with fakes (no FalkorDB, no FastAPI needed)."""
import ast
import os
import sys
import threading
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic import views  # noqa: E402
from ic.service import BadRequest, Busy, NotFound, Service, Unavailable  # noqa: E402


class FakeTools:
    """A tiny canned graph for incident INC-1 (origin currency) plus one unrelated incident."""

    g = object()

    def incident_list(self):
        return [dict(id="INC-1", title="checkout slow", status="open", severity="sev1", started_at=10,
                     resolved_at=None, recommended_playbook="PB-04", paged="Priya Raman", origin="currency")]

    def incident_info(self, incident):
        if incident != "INC-1":
            return None
        return dict(id="INC-1", title="checkout slow", status="open", severity="sev1", started_at=10,
                    resolved_at=None, recommended_playbook="PB-04", paged="Priya Raman", root_cause="pool")

    def incident_alerts(self, incident):
        return [dict(alert="A1", metric="p99", severity="critical", fired_at=11, service="checkout"),
                dict(alert="A2", metric="err", severity="warning", fired_at=12, service="checkout"),
                dict(alert="A3", metric="err", severity="warning", fired_at=13, service="cart")]

    def incident_origin(self, incident):
        return dict(service="currency", tier=1)

    def blast_radius(self, service):
        return [dict(service="checkout", tier=1, hops=1), dict(service="cart", tier=1, hops=3),
                dict(service="quote", tier=2, hops=1)]

    def incident_cause(self, incident):
        return dict(change="CHG-1", kind="config", summary="Lower pool", at=1)

    def subgraph_edges(self, names):
        return [dict(source="checkout", target="currency", kind="sync", criticality="hard")]

    def finding_evidence(self, incident):
        return [dict(finding="F1", label="Service", key="currency"),
                dict(finding="F1", label="Service", key="currency"),  # duplicate rows are collapsed
                dict(finding="F1", label="Change", key="CHG-1")]

    def findings(self, incident):
        return [dict(id="F1", claim="Probable origin is currency", confidence=0.9, query="q",
                     created_at=1.0, agent="Analyzer", evidence=["currency"])]

    def similar_incidents(self, suspect, alerting):
        return [dict(incident="INC-1", title="self", started_at=1, overlap=3, change_caused=1, score=5,
                     playbook_id="PB-04", playbook="rollback-pool-config", minutes=9),
                dict(incident="INC-014", title="twin", started_at=0, overlap=2, change_caused=1, score=4,
                     playbook_id="PB-04", playbook="rollback-pool-config", minutes=11)]

    def best_playbook(self, service):
        return [dict(playbook_id="PB-04", name="rollback-pool-config", wins=3, losses=0, score=0.8),
                dict(playbook_id="PB-05", name="flush-cache", wins=6, losses=1, score=0.78)]

    def who_to_page(self, service):
        return [dict(person="Priya Raman", role="SRE", team="payments", channel="#p", prior_fixes=1)]

    def incident_tasks(self, incident):
        return [dict(task="T1", kind="analyze", status="handed_off", agent="Analyzer", handed_to="Responder")]

    def incident_outcome(self, incident):
        return [dict(playbook_id=None, playbook=None, worked=None, minutes=None, resolver=None)]

    def spof(self):
        return [dict(service="ledger", tier=2, people_who_fixed_it=1)]

    def pagerank(self):
        return [dict(service="secrets-vault", score=0.03)]

    def betweenness(self):
        raise RuntimeError("signature changed")

    def service_info(self, service):
        return dict(service=service, tier=1) if service in ("currency", "checkout") else None

    def service_neighbors(self, service):
        return dict(depends_on=["redis-cache"], dependents=["checkout"])

    def service_experts(self, service):
        return []

    def service_incidents(self, service):
        return []


class ViewTests(unittest.TestCase):
    def test_incident_detail_assembles_everything_the_ui_needs(self):
        d = views.incident_detail(FakeTools(), "INC-1")
        self.assertEqual(d["origin"], "currency")
        self.assertEqual(d["alerting"], ["cart", "checkout"])
        nodes = {n["id"]: n for n in d["graph"]["nodes"]}
        self.assertEqual(nodes["currency"]["hops"], 0)
        self.assertTrue(nodes["checkout"]["alerting"])
        self.assertEqual(nodes["checkout"]["severity"], "critical")  # worst alert wins
        self.assertFalse(nodes["quote"]["alerting"])
        self.assertEqual(d["graph"]["change"]["change"], "CHG-1")
        self.assertEqual(d["findings"][0]["evidence"], {"Service": ["currency"], "Change": ["CHG-1"]})
        self.assertEqual(d["page"]["person"], "Priya Raman")

    def test_memory_excludes_the_incident_itself_and_flags_the_recommendation(self):
        d = views.incident_detail(FakeTools(), "INC-1")
        self.assertEqual([s["incident"] for s in d["memory"]["similar"]], ["INC-014"])
        top = d["memory"]["playbooks"][0]
        self.assertEqual((top["playbook_id"], top["recommended"]), ("PB-04", True))
        self.assertFalse(d["memory"]["playbooks"][1]["recommended"])
        self.assertIsNone(d["outcome"])  # an open incident has no outcome yet

    def test_missing_incident_raises_key_error(self):
        with self.assertRaises(KeyError):
            views.incident_detail(FakeTools(), "INC-404")

    def test_knowledge_survives_a_broken_betweenness_call(self):
        k = views.knowledge(FakeTools())
        self.assertEqual(k["chokepoints"], [])
        self.assertEqual(k["spof"][0]["service"], "ledger")

    def test_service_profile_and_missing_service(self):
        self.assertEqual(views.service_profile(FakeTools(), "currency")["neighbors"]["dependents"], ["checkout"])
        with self.assertRaises(KeyError):
            views.service_profile(FakeTools(), "nope")


def make_service(**overrides):
    kwargs = dict(
        get_db=lambda: object(),
        list_tenants_fn=lambda db: ["acme", "globex"],
        tools_fn=lambda tenant, db: FakeTools(),
        run_fn=lambda tenant, use_llm=False, db=None: dict(opened=[dict(incident="INC-1")], analyzed=[], responded=[]),
        resolve_fn=lambda tenant, incident, **kw: dict(incident=incident, **kw),
        inject_fn=lambda graph, origin="currency": dict(change="CHG-LIVE-1", alerts=["a"], at=1, origin=origin),
    )
    kwargs.update(overrides)
    return Service(**kwargs)


class ServiceTests(unittest.TestCase):
    def test_tenant_validation(self):
        svc = make_service()
        with self.assertRaises(BadRequest):
            svc.require_tenant("Bad Name")
        with self.assertRaises(NotFound) as ctx:
            svc.require_tenant("acne")  # a typo must not silently create a graph
        self.assertIn("acme", str(ctx.exception))
        svc.require_tenant("globex")

    def test_reads(self):
        svc = make_service()
        self.assertEqual(svc.incidents("acme")["incidents"][0]["id"], "INC-1")
        self.assertEqual(svc.incident("acme", "INC-1")["origin"], "currency")
        with self.assertRaises(NotFound) as ctx:
            svc.incident("acme", "INC-404")
        self.assertIn("INC-404", str(ctx.exception))
        self.assertIn("spof", svc.knowledge("acme"))

    def test_run_reports_how_many_incidents_were_opened(self):
        out = make_service().run("acme")
        self.assertEqual(out["opened_count"], 1)
        empty = make_service(run_fn=lambda tenant, use_llm=False, db=None: dict(opened=[], analyzed=[], responded=[]))
        self.assertEqual(empty.run("acme")["opened_count"], 0)  # nothing to process is not "a new incident"

    def test_unexpected_errors_are_logged_with_traceback_and_named(self):
        def broken(tenant, use_llm=False, db=None):
            raise ConnectionError("falkordb is down")

        svc = make_service(run_fn=broken)
        with self.assertLogs("ic.service", level="ERROR") as logs:
            with self.assertRaises(Unavailable) as ctx:
                svc.run("acme")
        self.assertIn("ConnectionError: falkordb is down", str(ctx.exception))
        self.assertIn("Traceback", "\n".join(logs.output))

    def test_run_lock_is_released_after_a_failure(self):
        calls = []

        def flaky(tenant, use_llm=False, db=None):
            calls.append(1)
            if len(calls) == 1:
                raise RuntimeError("first run fails")
            return dict(opened=[], analyzed=[], responded=[])

        svc = make_service(run_fn=flaky)
        with self.assertLogs("ic.service", level="ERROR"):
            with self.assertRaises(Unavailable):
                svc.run("acme")
        self.assertEqual(svc.run("acme")["opened_count"], 0)

    def test_second_concurrent_run_for_the_same_tenant_is_refused(self):
        started, release = threading.Event(), threading.Event()

        def slow_for_acme(tenant, use_llm=False, db=None):
            if tenant == "acme":
                started.set()
                release.wait(5)
            return dict(opened=[], analyzed=[], responded=[])

        svc = make_service(run_fn=slow_for_acme)
        first = threading.Thread(target=lambda: svc.run("acme"))
        first.start()
        self.assertTrue(started.wait(5))
        with self.assertRaises(Busy):
            svc.run("acme")  # same tenant: refused while the first run is in progress
        self.assertEqual(svc.run("globex")["opened_count"], 0)  # other tenants are not blocked
        release.set()
        first.join(5)
        self.assertEqual(svc.run("acme")["opened_count"], 0)  # lock released afterwards

    def test_resolve_error_mapping(self):
        def raises(exc):
            def fn(tenant, incident, **kw):
                raise exc
            return fn

        with self.assertRaises(NotFound):
            make_service(resolve_fn=raises(LookupError("incident INC-9 not found"))).resolve("acme", "INC-9")
        with self.assertRaises(BadRequest) as ctx:
            make_service(resolve_fn=raises(ValueError("unknown person 'string'"))).resolve("acme", "INC-1")
        self.assertIn("unknown person", str(ctx.exception))
        with self.assertLogs("ic.service", level="ERROR"):
            with self.assertRaises(Unavailable) as ctx:
                make_service(resolve_fn=raises(RuntimeError("boom"))).resolve("acme", "INC-1")
        with self.assertRaises(BadRequest) as ctx:
            make_service(resolve_fn=raises(ValueError("incident INC-1 is already resolved; recording it again would double-count the playbook"))).resolve("acme", "INC-1")
        self.assertIn("already resolved", str(ctx.exception))
        with self.assertRaises(NotFound) as ctx:
            make_service(resolve_fn=raises(LookupError("incident INC-1 has no identified origin yet; run the pipeline first"))).resolve("acme", "INC-1")
        self.assertIn("no identified origin yet", str(ctx.exception))
        with self.assertRaises(BadRequest) as ctx:
            make_service(resolve_fn=raises(ValueError("playbook PB-99 does not apply to currency"))).resolve("acme", "INC-1")
        self.assertIn("does not apply", str(ctx.exception))

    def test_resolve_passes_arguments_through(self):
        out = make_service().resolve("acme", "INC-1", playbook="PB-04", worked=False, minutes=30, person="Priya Raman")
        self.assertEqual((out["playbook"], out["worked"], out["minutes"], out["person"]), ("PB-04", False, 30, "Priya Raman"))

    def test_inject_checks_the_service_exists(self):
        svc = make_service()
        self.assertEqual(svc.inject("acme", origin="currency")["change"], "CHG-LIVE-1")
        with self.assertRaises(NotFound):
            svc.inject("acme", origin="not-a-service")


class ApiFileTests(unittest.TestCase):
    """FastAPI is not installed in every environment, so check api.py's contract from its source."""

    def setUp(self):
        path = os.path.join(os.path.dirname(__file__), "..", "src", "ic", "api.py")
        with open(path, encoding="utf-8") as fh:
            self.tree = ast.parse(fh.read())

    def routes(self):
        found = set()
        for node in ast.walk(self.tree):
            if isinstance(node, ast.FunctionDef):
                for dec in node.decorator_list:
                    if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.args:
                        found.add((dec.func.attr.upper(), dec.args[0].value))
        return found

    def test_existing_endpoints_are_kept_and_new_ones_added(self):
        routes = self.routes()
        for expected in [("GET", "/health"), ("GET", "/tenants"), ("POST", "/incidents/run"),
                         ("POST", "/incidents/{incident_id}/resolve"), ("GET", "/incidents"),
                         ("GET", "/incidents/{incident_id}"), ("GET", "/knowledge"),
                         ("GET", "/services/{name}"), ("POST", "/demo/inject")]:
            self.assertIn(expected, routes)

    def test_no_bare_exception_swallowing(self):
        for node in ast.walk(self.tree):
            if isinstance(node, ast.ExceptHandler):
                self.assertIsNotNone(node.type, "bare except in api.py")
                self.assertNotEqual(getattr(node.type, "id", ""), "Exception",
                                    "api.py must not catch Exception: errors are logged in service.py")


if __name__ == "__main__":
    unittest.main()
