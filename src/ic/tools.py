"""Tool layer: every action an agent can take on the graph.

Each method wraps one named query from ``queries/``. Agents only ever touch the graph
through this class, which makes it the natural thing to expose over MCP later. The
``record_finding`` tool is how an agent shows its work: it stores the claim, the query
that produced it, and EVIDENCE edges to the nodes it relied on.
"""
import time
import uuid

from . import queries

# label -> the property that identifies a node of that label
NODE_KEYS = {
    "Service": "name", "Team": "name", "Person": "name", "Agent": "name",
    "Incident": "id", "Change": "id", "Alert": "id", "Playbook": "id", "Task": "id", "Finding": "id",
}


class Tools:
    def __init__(self, graph, clock=time.time):
        self.g = graph
        self.clock = clock
        self._last = 0.0

    def _now(self):
        """Strictly increasing timestamps: on Windows the clock ticks about every 15 ms, so
        findings written back to back would otherwise share a time and lose their order."""
        t = float(self.clock())
        if t <= self._last:
            t = self._last + 1e-6
        self._last = t
        return t

    def _q(self, name, **params):
        return queries.run(self.g, name, **params)

    # ---- reads -------------------------------------------------------------
    def open_alerts(self):
        return self._q("current_open_alerts")

    def incident_alerts(self, incident):
        return self._q("incident_alerts", incident=incident)

    def incident_info(self, incident):
        rows = self._q("incident_info", incident=incident)
        return rows[0] if rows else None

    def incident_origin(self, incident):
        rows = self._q("incident_origin", incident=incident)
        return rows[0] if rows else None

    def blast_radius(self, service):
        return self._q("blast_radius", service=service)

    def explain_path(self, impacted, origin):
        rows = self._q("explain_path", impacted=impacted, origin=origin)
        return rows[0] if rows and rows[0].get("path") else None

    def suspect_changes(self, service, incident_start):
        return self._q("suspect_changes", service=service, incident_start=incident_start)

    def common_upstream(self, alerting):
        return self._q("common_upstream", alerting=list(alerting))

    def similar_incidents(self, suspect, alerting):
        return self._q("similar_incidents", suspect=suspect, alerting=list(alerting))

    def best_playbook(self, service):
        return self._q("best_playbook", service=service)

    def who_to_page(self, service):
        return self._q("who_to_page", service=service)

    def pagerank(self):
        return self._q("pagerank")

    def betweenness(self):
        return self._q("betweenness")

    def spof(self):
        return self._q("knowledge_spof")

    def open_tasks(self, agent):
        return self._q("open_tasks", agent=agent)

    def findings(self, incident):
        return self._q("incident_findings", incident=incident)

    def incident_list(self):
        return self._q("incident_list")

    def incident_cause(self, incident):
        rows = self._q("incident_cause", incident=incident)
        return rows[0] if rows else None

    def finding_evidence(self, incident):
        return self._q("finding_evidence", incident=incident)

    def incident_tasks(self, incident):
        return self._q("incident_tasks", incident=incident)

    def subgraph_edges(self, names):
        return self._q("subgraph_edges", names=sorted(set(names)))

    def incident_outcome(self, incident):
        return self._q("incident_outcome", incident=incident)

    def person_exists(self, person):
        return bool(self._q("person_exists", person=person))

    def service_info(self, service):
        rows = self._q("service_info", service=service)
        return rows[0] if rows else None

    def service_experts(self, service):
        return self._q("service_experts", service=service)

    def service_incidents(self, service):
        return self._q("service_incidents", service=service)

    def service_neighbors(self, service):
        rows = self._q("service_neighbors", service=service)
        return rows[0] if rows else dict(depends_on=[], dependents=[])

    # ---- writes ------------------------------------------------------------
    def link_related_alerts(self):
        self._q("link_related_alerts")

    def group_alerts(self):
        return self._q("group_alerts_wcc")

    def open_incident(self, incident, title, severity, started_at, alert_ids):
        self._q("open_incident", incident=incident, title=title, severity=severity,
                now=started_at, alert_ids=list(alert_ids))

    def create_task(self, incident, agent, kind):
        task = f"TSK-{uuid.uuid4().hex[:8]}"
        self._q("create_task", incident=incident, agent=agent, task=task, kind=kind, now=self._now())
        return task

    def complete_task(self, task):
        self._q("complete_task", task=task, now=self._now())

    def fail_task(self, task, error):
        self._q("fail_task", task=task, now=self._now(), error=str(error)[:300])

    def handoff_task(self, task, to, reason):
        self._q("handoff_task", task=task, to=to, now=self._now(), reason=reason)

    def mark_affected(self, incident, service, role):
        self._q("mark_affected", incident=incident, service=service, role=role)

    def record_cause(self, incident, change, root_cause):
        self._q("record_cause", incident=incident, change=change, root_cause=root_cause)

    def set_recommendation(self, incident, playbook, person):
        self._q("set_recommendation", incident=incident, playbook=playbook, person=person or "")

    def record_responder(self, person, incident, minutes):
        self._q("record_responder", person=person, incident=incident, minutes=minutes)

    def record_outcome(self, incident, playbook, worked, minutes):
        self._q("record_outcome", incident=incident, playbook=playbook, worked=worked,
                minutes=minutes, now=int(self._now()))

    def node_ids(self, evidence):
        """Internal ids of the nodes named in ``evidence`` = {label: [key, ...]}."""
        ids = []
        for label, keys in evidence.items():
            if label not in NODE_KEYS:
                raise ValueError(f"unknown label {label!r}")
            keys = sorted({k for k in keys if k})
            if not keys:
                continue
            key = NODE_KEYS[label]
            result = self.g.query(f"MATCH (n:{label}) WHERE n.{key} IN $keys RETURN id(n)", {"keys": keys})
            ids.extend(row[0] for row in result.result_set)
        return ids

    def record_finding(self, incident, agent, claim, confidence, query, evidence):
        """Store a claim, the query behind it, and EVIDENCE edges to the supporting nodes."""
        fid = f"FND-{uuid.uuid4().hex[:8]}"
        self._q("record_finding", incident=incident, agent=agent, fid=fid, claim=claim,
                confidence=round(float(confidence), 2), query=query, now=self._now(),
                node_ids=self.node_ids(evidence))
        return fid
