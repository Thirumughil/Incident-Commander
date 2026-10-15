"""Responder: chooses the fix, decides who to page, and drafts the status update."""
from .. import llm, reasoning


class Responder:
    name = "Responder"

    def __init__(self, tools, use_llm=True):
        self.tools = tools
        self.use_llm = use_llm

    def run_pending(self):
        results = []
        for task in self.tools.open_tasks(self.name):
            results.append(self.respond(task["task"], task["incident"]))
        return results

    def respond(self, task, incident):
        t = self.tools
        info = t.incident_info(incident)
        origin = t.incident_origin(incident)["service"]  # the Analyzer's decision, read from the graph
        alerting = sorted({a["service"] for a in t.incident_alerts(incident)})

        similar = t.similar_incidents(origin, alerting)
        ranked = reasoning.choose_playbook(t.best_playbook(origin), similar)
        page = (t.who_to_page(origin) or [None])[0]
        blast = t.blast_radius(origin)

        top = ranked[0] if ranked else None
        if top:
            alts = ", ".join(f"{r['name']} {r['final']:.2f}" for r in ranked[1:3])
            why = f"learned score {top['score']:.2f} ({top['wins']} wins, {top['losses']} losses)"
            if top["similar_incident"]:
                why += (f" + {top['boost']:.2f} because {top['similar_incident']} was fixed this way in "
                        f"{top['similar_minutes']} min")
            t.record_finding(
                incident, self.name,
                claim=f"Recommended fix: {top['name']}, total {top['final']:.2f} = {why}. Next best: {alts or 'none'}.",
                confidence=min(0.95, top["final"]), query="best_playbook; similar_incidents; choose_playbook",
                evidence={"Playbook": [r["playbook_id"] for r in ranked[:3]],
                          "Incident": [top["similar_incident"]] if top["similar_incident"] else [],
                          "Service": [origin]},
            )
        if page:
            t.record_finding(
                incident, self.name,
                claim=(f"Page {page['person']} ({page['role']}, {page['team']}, {page['channel']}): on call for the team "
                       f"that owns {origin}, and has resolved {page['prior_fixes']} earlier incident(s) on it."),
                confidence=0.9 if page["prior_fixes"] else 0.7, query="who_to_page",
                evidence={"Person": [page["person"]], "Team": [page["team"]], "Service": [origin]},
            )

        incident_row = dict(severity=info["severity"], title=info["title"])
        reason = "see findings"
        origin_finding = next((f for f in t.findings(incident) if f["agent"] == "Analyzer"), None)
        if origin_finding:
            reason = origin_finding["claim"].split(":", 1)[-1].strip().rstrip(".")
        tier1 = sum(1 for r in blast if r["tier"] == 1)
        plain = reasoning.status_update(incident_row, origin, reason, len(blast), tier1, top, page)
        update = (llm.rewrite(plain) if self.use_llm else None) or plain
        t.record_finding(
            incident, self.name, claim=f"Status update draft: {update}", confidence=0.8,
            query="template" if update == plain else f"llm:{llm.MODEL}",
            evidence={"Service": [origin]},
        )

        t.set_recommendation(incident, top["playbook_id"] if top else "", page["person"] if page else "")
        t.complete_task(task)
        return dict(incident=incident, playbook=top["name"] if top else None,
                    page=page["person"] if page else None, update=update)
