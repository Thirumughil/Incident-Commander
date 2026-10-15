"""Learner: writes the outcome back so the next incident starts from better knowledge.

One atomic query updates the incident, the FIXED_BY edge and the playbook's success
and failure counters. The next ``best_playbook`` query reads those counters, so the
ranking changes after every resolved incident.
"""


class Learner:
    name = "Learner"

    def __init__(self, tools):
        self.tools = tools

    def resolve(self, incident, playbook=None, worked=True, minutes=None, person=None):
        t = self.tools
        info = t.incident_info(incident)
        origin = t.incident_origin(incident)["service"]
        playbook = playbook or info["recommended_playbook"]
        person = person or info["paged"]
        if not playbook:
            raise ValueError("no playbook given and none was recommended for this incident")
        minutes = 15 if minutes is None else int(minutes)

        task = t.create_task(incident, self.name, "learn")

        def stats():
            row = next((r for r in t.best_playbook(origin) if r["playbook_id"] == playbook), None)
            if row is None:
                raise ValueError(f"playbook {playbook} does not apply to {origin}")
            return row

        before = stats()
        if person:
            t.record_responder(person, incident, minutes)
        t.record_outcome(incident, playbook, worked, minutes)
        after = stats()

        verdict = "worked" if worked else "did not work"
        t.record_finding(
            incident, self.name,
            claim=(f"{before['name']} {verdict} in {minutes} min. Its score for {origin} moved "
                   f"{before['score']:.3f} -> {after['score']:.3f} ({after['wins']} wins, {after['losses']} losses)."
                   + (f" {person} is now recorded as a resolver of this incident." if person else "")),
            confidence=1.0, query="record_outcome; record_responder",
            evidence={"Playbook": [playbook], "Incident": [incident], "Person": [person] if person else [],
                      "Service": [origin]},
        )
        t.complete_task(task)
        return dict(incident=incident, playbook=playbook, worked=worked,
                    before=before["score"], after=after["score"])
