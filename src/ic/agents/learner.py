"""Learner: writes the outcome back so the next incident starts from better knowledge.

One atomic query updates the incident, the FIXED_BY edge and the playbook's success
and failure counters. The next ``best_playbook`` query reads those counters, so the
ranking changes after every resolved incident.

Everything that can be checked is checked BEFORE the first write, so a bad request (unknown
incident, unknown person, a playbook that does not apply, an already-resolved incident) leaves
the graph untouched. If a write fails part way, the learn task is marked failed instead of
being left looking open.
"""


class Learner:
    name = "Learner"

    def __init__(self, tools):
        self.tools = tools

    def resolve(self, incident, playbook=None, worked=True, minutes=None, person=None):
        t = self.tools

        info = t.incident_info(incident)
        if not info:
            raise LookupError(f"incident {incident} not found")
        origin_row = t.incident_origin(incident)
        if not origin_row:
            raise LookupError(f"incident {incident} has no identified origin yet; run the pipeline first")
        if info.get("status") == "resolved":
            raise ValueError(f"incident {incident} is already resolved; recording it again would double-count the playbook")

        origin = origin_row["service"]
        playbook = playbook or info.get("recommended_playbook")
        person = person or info.get("paged") or None
        if not playbook:
            raise ValueError("no playbook given and none was recommended for this incident")
        if person and not t.person_exists(person):
            raise ValueError(f"unknown person {person!r}")
        minutes = 15 if minutes is None else int(minutes)

        def stats():
            row = next((r for r in t.best_playbook(origin) if r["playbook_id"] == playbook), None)
            if row is None:
                raise ValueError(f"playbook {playbook} does not apply to {origin}")
            return row

        before = stats()  # validates the playbook before anything is written

        task = t.create_task(incident, self.name, "learn")
        try:
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
        except Exception as exc:
            try:
                t.fail_task(task, f"{type(exc).__name__}: {exc}")
            except Exception:  # noqa: BLE001 - never hide the original error
                pass
            raise
        return dict(incident=incident, playbook=playbook, worked=worked,
                    before=before["score"], after=after["score"])
