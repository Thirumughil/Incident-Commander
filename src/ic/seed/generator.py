"""Deterministic synthetic dataset builder (no database needed).

``build_dataset`` returns plain Python data: node rows per label and edge rows per
relationship type. ``loader.load_dataset`` writes it into a tenant graph. Keeping
generation separate from loading makes the data testable offline and reproducible
from a seed.

All times are epoch seconds. Incidents are spread over the 12 months before ``now``.
With ``plant_demo=True`` three incidents are planted on purpose so the live demo has
a clear right answer and two plausible wrong ones:

- INC-014: a near-twin of the live demo incident. Origin ``currency``, caused by a
  config change that lowered the DB connection pool, fixed by PB-04 in 11 minutes by
  Priya Raman.
- INC-021: same visible symptoms (checkout and frontend slow) but a different origin
  (``payment``) and a different fix. A wrong-but-plausible match.
- INC-007: same service (``currency``) but a different cause (cache eviction storm).
"""
import random
import time
from collections import defaultdict, deque

from . import data

DAY = 86400
MINUTE = 60

PLANTED = {
    14: dict(
        origin="currency", impacted=["quote", "checkout", "frontend"], pb="PB-04", worked=True,
        minutes=11, responder="Priya Raman", title="currency latency spike, checkout slow",
        change=("config", "Lower DB connection pool 50 -> 10", 25), severity="sev1",
    ),
    21: dict(
        origin="payment", impacted=["checkout", "frontend"], pb="PB-10", worked=True,
        minutes=19, responder="Arjun Mehta", title="payment provider timeouts, checkout slow",
        change=None, severity="sev1",
    ),
    7: dict(
        origin="currency", impacted=["cart"], pb="PB-05", worked=True,
        minutes=14, responder="Arjun Mehta", title="currency elevated error rate, cart failing",
        change=None, severity="sev2",
    ),
}

SYMPTOMS = ["latency spike", "elevated error rate", "timeouts", "saturation", "degraded throughput"]
CHANGE_LINKED_PLAYBOOKS = {"rollback-last-change", "disable-feature-flag", "rollback-pool-config", "refresh-config"}


def _reverse_adjacency(deps):
    rev = defaultdict(list)
    for src, dst, _kind, _crit in deps:
        rev[dst].append(src)
    return rev


def _dependents_within(rev, origin, max_hops=2):
    """Services that depend on ``origin`` within ``max_hops``, nearest first."""
    seen = {origin}
    order = []
    queue = deque([(origin, 0)])
    while queue:
        node, hops = queue.popleft()
        if hops == max_hops:
            continue
        for nxt in sorted(rev.get(node, [])):
            if nxt not in seen:
                seen.add(nxt)
                order.append(nxt)
                queue.append((nxt, hops + 1))
    return order


def _build_people(rng, plant_demo):
    if plant_demo:
        return {team: list(members) for team, members in data.PEOPLE_ACME.items()}
    pool = list(data.PEOPLE_POOL)
    rng.shuffle(pool)
    people, i = {}, 0
    for team, members in data.PEOPLE_ACME.items():
        people[team] = pool[i:i + len(members)]
        i += len(members)
    return people


def build_dataset(tenant="acme", seed=1, now=None, plant_demo=True, n_incidents=30):
    rng = random.Random(seed)
    now = int(now if now is not None else time.time())

    # --- topology -------------------------------------------------------------
    services = [dict(name=n, tier=t, language=lang, slo_ms=slo) for n, t, lang, _team, slo in data.SERVICES]
    service_names = [s["name"] for s in services]
    tier = {s["name"]: s["tier"] for s in services}
    owner = {n: team for n, _t, _l, team, _s in data.SERVICES}
    deps = data.dependencies()
    rev = _reverse_adjacency(deps)

    teams = [dict(name=n, slack_channel=ch) for n, ch in data.TEAMS.items()]

    # --- people ---------------------------------------------------------------
    people_by_team = _build_people(rng, plant_demo)
    persons, member_of, on_call_for = [], [], []
    for team, members in people_by_team.items():
        for idx, (name, role) in enumerate(members):
            current = idx == 0
            persons.append(dict(name=name, role=role, oncall_now=current))
            member_of.append(dict(src=name, dst=team))
            start = now - 3 * DAY if current else now + (4 + 7 * (idx - 1)) * DAY
            on_call_for.append(dict(src=name, dst=team, starts_at=start, ends_at=start + 7 * DAY))

    # --- playbooks ------------------------------------------------------------
    pb_info = {}
    applies_to = []
    for pid, name, steps, cause, applies, ps, pf in data.PLAYBOOKS:
        targets = service_names if applies == "all" else applies
        pb_info[pid] = dict(id=pid, name=name, steps=steps, cause=cause,
                            applies=set(targets), prior_s=ps, prior_f=pf, generic=applies == "all")
        for svc in targets:
            applies_to.append(dict(src=pid, dst=svc))

    # --- incidents, changes, alerts ---------------------------------------------
    times = sorted(rng.randint(now - 365 * DAY, now - 5 * DAY) for _ in range(n_incidents))
    incidents, affected, caused_by, resolved, fixed_by = [], [], [], [], []
    changes, modified, alerts, fired_on, part_of = [], [], [], [], []
    derived_s, derived_f = defaultdict(int), defaultdict(int)
    change_seq = 0
    weights_by_tier = {1: 3, 2: 3, 3: 2}

    def team_responder(origin, pick_first=False):
        members = [n for n, _r in people_by_team[owner[origin]]]
        if pick_first or origin in data.SINGLE_RESPONDER_SERVICES:
            return members[0]
        return rng.choice(members)

    for idx in range(1, n_incidents + 1):
        inc_id = f"INC-{idx:03d}"
        started = times[idx - 1]
        planted = PLANTED.get(idx) if plant_demo else None

        if planted:
            origin, impacted = planted["origin"], list(planted["impacted"])
            fixes = [(planted["pb"], planted["worked"], planted["minutes"])]
            responder = planted["responder"]
            title, severity = planted["title"], planted["severity"]
            change_spec = planted["change"]
        else:
            origin = rng.choices(service_names, weights=[weights_by_tier[tier[s]] for s in service_names])[0]
            pool = _dependents_within(rev, origin, 2)
            k = min(len(pool), rng.randint(0, 3))
            impacted = sorted(rng.sample(pool, k)) if k else []

            candidates = sorted((p for p in pb_info.values() if origin in p["applies"]), key=lambda p: p["id"])
            first = rng.choices(candidates, weights=[1 if p["generic"] else 3 for p in candidates])[0]
            p_ok = (first["prior_s"] + 1) / (first["prior_s"] + first["prior_f"] + 2)
            first_min = rng.randint(6, 40)
            if rng.random() < p_ok:
                fixes = [(first["id"], True, first_min)]
            else:
                others = [p for p in candidates if p["id"] != first["id"]]
                second = rng.choice(others)
                fixes = [(first["id"], False, first_min), (second["id"], True, rng.randint(10, 45))]
            responder = team_responder(origin)
            title = f"{origin} {rng.choice(SYMPTOMS)}"
            severity = "sev1" if tier[origin] == 1 and rng.random() < 0.6 else ("sev2" if tier[origin] < 3 else "sev3")
            final_pb = pb_info[fixes[-1][0]]
            change_spec = None
            if final_pb["name"] in CHANGE_LINKED_PLAYBOOKS or rng.random() < 0.25:
                kind = {"disable-feature-flag": "flag", "rollback-pool-config": "config",
                        "refresh-config": "config"}.get(final_pb["name"], rng.choice(data.CHANGE_KINDS))
                summary = rng.choice(data.CHANGE_SUMMARIES[kind]).format(n=rng.randint(100, 999))
                change_spec = (kind, summary, rng.randint(10, 120))

        total_minutes = sum(m for _pb, _ok, m in fixes)
        root_cause = pb_info[fixes[-1][0]]["cause"]
        incidents.append(dict(
            id=inc_id, title=title, status="resolved", severity=severity,
            started_at=started, resolved_at=started + total_minutes * MINUTE, root_cause=root_cause,
        ))

        affected.append(dict(src=inc_id, dst=origin, role="origin"))
        for svc in impacted:
            affected.append(dict(src=inc_id, dst=svc, role="impacted"))

        for pb_id, ok, minutes in fixes:
            fixed_by.append(dict(src=inc_id, dst=pb_id, worked=ok, minutes=minutes))
            (derived_s if ok else derived_f)[pb_id] += 1
        resolved.append(dict(src=responder, dst=inc_id, minutes=total_minutes))

        if change_spec:
            kind, summary, lead_min = change_spec
            change_seq += 1
            chg_id = f"CHG-{change_seq:04d}"
            changes.append(dict(id=chg_id, kind=kind, at=started - lead_min * MINUTE, summary=summary))
            modified.append(dict(src=chg_id, dst=origin))
            caused_by.append(dict(src=inc_id, dst=chg_id))

        for a_idx, svc in enumerate([origin] + impacted[:2], start=1):
            metric, sev = rng.choice(data.ALERT_METRICS)
            alert_id = f"ALT-{inc_id[4:]}-{a_idx}"
            alerts.append(dict(id=alert_id, metric=metric, severity=sev,
                               fired_at=started + rng.randint(0, 90), status="closed"))
            fired_on.append(dict(src=alert_id, dst=svc))
            part_of.append(dict(src=alert_id, dst=inc_id))

    # background changes that did not cause incidents
    for _ in range(max(0, 60 - len(changes))):
        change_seq += 1
        kind = rng.choice(data.CHANGE_KINDS)
        svc = rng.choice(service_names)
        changes.append(dict(
            id=f"CHG-{change_seq:04d}", kind=kind,
            at=rng.randint(now - 365 * DAY, now - 2 * DAY),
            summary=rng.choice(data.CHANGE_SUMMARIES[kind]).format(n=rng.randint(100, 999)),
        ))
        modified.append(dict(src=changes[-1]["id"], dst=svc))

    playbooks = [dict(id=p["id"], name=p["name"], steps=p["steps"], cause=p["cause"],
                      successes=p["prior_s"] + derived_s[p["id"]],
                      failures=p["prior_f"] + derived_f[p["id"]]) for p in pb_info.values()]

    agents = [
        dict(name="Detector", role="Groups alerts into an incident"),
        dict(name="Analyzer", role="Blast radius, suspect changes, similar incidents"),
        dict(name="Responder", role="Picks the fix and who to page, drafts the update"),
        dict(name="Learner", role="Writes the outcome back into memory"),
    ]

    owns = [dict(src=team, dst=svc) for svc, team in owner.items()]

    return {
        "meta": dict(tenant=tenant, seed=seed, now=now, plant_demo=plant_demo),
        "nodes": {
            "Service": services, "Team": teams, "Person": persons, "Change": changes,
            "Alert": alerts, "Incident": incidents, "Playbook": playbooks, "Agent": agents,
        },
        "edges": [
            dict(rel="DEPENDS_ON", src=("Service", "name"), dst=("Service", "name"),
                 rows=[dict(src=s, dst=d, kind=k, criticality=c) for s, d, k, c in deps]),
            dict(rel="OWNS", src=("Team", "name"), dst=("Service", "name"), rows=owns),
            dict(rel="MEMBER_OF", src=("Person", "name"), dst=("Team", "name"), rows=member_of),
            dict(rel="ON_CALL_FOR", src=("Person", "name"), dst=("Team", "name"), rows=on_call_for),
            dict(rel="MODIFIED", src=("Change", "id"), dst=("Service", "name"), rows=modified),
            dict(rel="FIRED_ON", src=("Alert", "id"), dst=("Service", "name"), rows=fired_on),
            dict(rel="PART_OF", src=("Alert", "id"), dst=("Incident", "id"), rows=part_of),
            dict(rel="AFFECTED", src=("Incident", "id"), dst=("Service", "name"), rows=affected),
            dict(rel="CAUSED_BY", src=("Incident", "id"), dst=("Change", "id"), rows=caused_by),
            dict(rel="RESOLVED", src=("Person", "name"), dst=("Incident", "id"), rows=resolved),
            dict(rel="FIXED_BY", src=("Incident", "id"), dst=("Playbook", "id"), rows=fixed_by),
            dict(rel="APPLIES_TO", src=("Playbook", "id"), dst=("Service", "name"), rows=applies_to),
        ],
    }
