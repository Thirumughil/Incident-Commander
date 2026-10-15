"""Detector: turns a burst of related alerts into one incident.

Rule-based, no LLM. It links alerts that fired close together on services near each
other in the dependency graph, finds the connected components (WCC), and opens one
incident per component with a task for the Analyzer.
"""


class Detector:
    name = "Detector"

    def __init__(self, tools):
        self.tools = tools

    def run(self):
        t = self.tools
        t.link_related_alerts()
        components = t.group_alerts()
        alerts = {a["alert"]: a for a in t.open_alerts()}
        opened = []
        for n, comp in enumerate(components, start=1):
            rows = sorted((alerts[i] for i in comp["alerts"] if i in alerts), key=lambda a: a["fired_at"])
            if not rows:
                continue
            first = rows[0]
            started = first["fired_at"]
            critical = sum(1 for r in rows if r["severity"] == "critical")
            severity = "sev1" if critical >= 2 else ("sev2" if critical == 1 else "sev3")
            services = sorted({r["service"] for r in rows})
            title = f"{first['service']} {first['metric']}"
            if len(rows) > 1:
                title += f" (+{len(rows) - 1} related alerts)"
            incident = f"INC-{started}" if n == 1 else f"INC-{started}-{n}"

            t.open_incident(incident, title, severity, started, [r["alert"] for r in rows])
            t.record_finding(
                incident, self.name,
                claim=(f"Grouped {len(rows)} open alerts on {', '.join(services)} into one incident: "
                       f"they fired within 5 minutes of each other on services within 2 dependency hops."),
                confidence=0.9 if len(rows) > 1 else 0.6,
                query="link_related_alerts; group_alerts_wcc",
                evidence={"Alert": [r["alert"] for r in rows], "Service": services},
            )
            task = t.create_task(incident, "Analyzer", "analyze")
            opened.append(dict(incident=incident, task=task, alerts=len(rows), severity=severity))
        return opened
