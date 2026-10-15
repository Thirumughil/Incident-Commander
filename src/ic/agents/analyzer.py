"""Analyzer: finds the likely origin, the blast radius, and similar past incidents.

Reads its task from the graph, does multi-hop analysis with graph queries, writes a
Finding (with evidence edges) for every conclusion, then hands off to the Responder.
"""
from .. import reasoning


class Analyzer:
    name = "Analyzer"

    def __init__(self, tools):
        self.tools = tools

    def run_pending(self):
        results = []
        for task in self.tools.open_tasks(self.name):
            results.append(self.analyze(task["task"], task["incident"]))
        return results

    def analyze(self, task, incident):
        t = self.tools
        info = t.incident_info(incident)
        alerts = t.incident_alerts(incident)
        alerting = sorted({a["service"] for a in alerts})

        changes = {svc: t.suspect_changes(svc, info["started_at"]) for svc in alerting}
        upstream = t.common_upstream(alerting)
        suspect = reasoning.pick_suspect(changes, upstream)
        origin = suspect["service"]

        blast = t.blast_radius(origin)
        similar = t.similar_incidents(origin, alerting)
        paths = {}
        for svc in alerting:
            if svc != origin:
                p = t.explain_path(svc, origin)
                if p:
                    paths[svc] = p["path"]

        # shared state: record the decision on the graph for the other agents
        t.mark_affected(incident, origin, "origin")
        for svc in alerting:
            if svc != origin:
                t.mark_affected(incident, svc, "impacted")

        # 1. origin
        if suspect["kind"] == "change":
            chg = suspect["change"]
            t.record_cause(incident, chg["change"], chg["summary"])  # memory: remember what caused it
            lead = reasoning.minutes_between(info["started_at"], chg["at"])
            reached = suspect["reached"]
            claim = (f"Probable origin is {origin}: change {chg['change']} ('{chg['summary']}') landed {lead} min "
                     f"before the incident, and {len(reached)} of {len(alerting)} alerting services depend on "
                     f"{origin} within 3 hops.")
            confidence = 0.9 if len(reached) >= 0.75 * len(alerting) else 0.7
            evidence = {"Service": [origin] + reached, "Change": [chg["change"]]}
            reason = f"change {chg['change']} {lead} min before, upstream of {len(reached)}/{len(alerting)} alerting services"
            query = "suspect_changes per alerting service; pick_suspect"
        else:
            claim = (f"Probable origin is {origin}: it is the dependency shared by the most alerting services "
                     f"({upstream[0]['reached'] if upstream else 0} of {len(alerting)}) and no recent change was found.")
            confidence = 0.55
            evidence = {"Service": [origin] + alerting}
            reason = "most shared upstream dependency, no recent change found"
            query = "common_upstream; pick_suspect"
        t.record_finding(incident, self.name, claim, confidence, query, evidence)

        # 2. blast radius
        tier1 = [r["service"] for r in blast if r["tier"] == 1]
        names = [r["service"] for r in blast]
        t.record_finding(
            incident, self.name,
            claim=(f"{len(blast)} services depend on {origin} within 4 hops, {len(tier1)} of them tier 1 "
                   f"({', '.join(names[:6])}{'...' if len(names) > 6 else ''})."),
            confidence=1.0, query="blast_radius", evidence={"Service": [origin] + names[:15]},
        )

        # 3. paths
        if paths:
            lines = "; ".join(reasoning.format_path(p) for p in paths.values())
            t.record_finding(
                incident, self.name,
                claim=f"Dependency paths from the alerting services to the origin: {lines}.",
                confidence=1.0, query="explain_path (shortestPath over DEPENDS_ON)",
                evidence={"Service": sorted({s for p in paths.values() for s in p})},
            )

        # 4. memory
        if similar:
            top = similar[0]
            how = f"fixed by {top['playbook']} in {top['minutes']} min" if top.get("playbook") else "no recorded fix"
            trigger = "also triggered by a change" if top["change_caused"] else "not change-triggered"
            claim = (f"Most similar past incident is {top['incident']} ('{top['title']}'): same origin {origin}, "
                     f"{top['overlap']} shared alerting service(s), {trigger}; {how}.")
            confidence = min(0.95, 0.5 + 0.1 * top["score"])
            evidence = {"Incident": [r["incident"] for r in similar[:3]],
                        "Playbook": [r["playbook_id"] for r in similar[:3] if r.get("playbook_id")],
                        "Service": [origin]}
        else:
            claim = f"No resolved incident with origin {origin} exists in memory."
            confidence, evidence = 0.5, {"Service": [origin]}
        t.record_finding(incident, self.name, claim, confidence, "similar_incidents", evidence)

        # 5. criticality via PageRank
        ranked = [r["service"] for r in t.pagerank()]
        where = f"#{ranked.index(origin) + 1} of the top 10" if origin in ranked else "outside the top 10"
        t.record_finding(
            incident, self.name,
            claim=f"{origin} ranks {where} most depended-on services by PageRank over DEPENDS_ON.",
            confidence=1.0, query="algo.pageRank('Service','DEPENDS_ON')", evidence={"Service": [origin]},
        )

        # hand off through the graph
        t.handoff_task(task, "Responder", reason=f"origin identified: {origin}")
        t.create_task(incident, "Responder", "respond")
        return dict(incident=incident, origin=origin, reason=reason, blast=len(blast),
                    similar=[r["incident"] for r in similar])
