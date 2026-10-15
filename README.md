# Incident Commander

Agents that handle a production incident using a FalkorDB graph as their context layer:
blast radius from the dependency graph, recall of similar past incidents, a learned
ranking of fixes, who to page, and the graph path behind every answer.

Built for Graph Hacks: Context for AI Agents. Tracks entered: Agents That Act on Connected
Data, Agent Memory and Coordination, Company Brain. Status: work in progress.

## Quick start

Requirements: Docker, Python 3.11+.

```bash
docker compose up -d                       # FalkorDB on :6380, FalkorDB Browser on http://localhost:3001
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python scripts/seed.py --tenant acme --reset       # 40 services, 8 teams, 30 incidents, 15 playbooks
python scripts/seed.py --tenant globex --seed 2 --no-plant --reset   # a second, isolated tenant
python scripts/inject_incident.py --tenant acme    # fire the live demo scenario
python scripts/check_queries.py --tenant acme      # run every query and print results
python -m unittest discover -s tests -v            # offline tests, no database needed
```

## Run the agents

```bash
python scripts/inject_incident.py --tenant acme     # a bad config change on currency plus 4 alerts
python scripts/run_pipeline.py --tenant acme --no-llm
python scripts/run_pipeline.py --tenant acme --resolve INC-<id>   # Learner records the outcome
```

Detector, Analyzer, Responder and Learner never call each other. Each polls the graph for
its own `Task` nodes, does its work with the queries in `queries/`, and records every claim as a
`Finding` with `EVIDENCE` edges to the nodes it relied on. Set `ANTHROPIC_API_KEY` (and
`pip install anthropic`) to have a model rewrite the status update; without it a template is used.

## Data model

One graph per tenant (`tenant_<id>`) in a single FalkorDB instance.

Nodes: `Service`, `Team`, `Person`, `Change`, `Alert`, `Incident`, `Playbook`, `Agent`, `Task`, `Finding`.

| Relationship | Pattern | Properties |
| --- | --- | --- |
| `DEPENDS_ON` | `(Service)->(Service)` | `kind`, `criticality` |
| `OWNS` | `(Team)->(Service)` | |
| `MEMBER_OF` | `(Person)->(Team)` | |
| `ON_CALL_FOR` | `(Person)->(Team)` | `starts_at`, `ends_at` |
| `MODIFIED` | `(Change)->(Service)` | |
| `FIRED_ON` | `(Alert)->(Service)` | |
| `PART_OF` | `(Alert)->(Incident)` | |
| `RELATED_TO` | `(Alert)->(Alert)` | |
| `AFFECTED` | `(Incident)->(Service)` | `role` (origin, impacted) |
| `CAUSED_BY` | `(Incident)->(Change)` | |
| `RESOLVED` | `(Person)->(Incident)` | `minutes` |
| `FIXED_BY` | `(Incident)->(Playbook)` | `worked`, `minutes` |
| `APPLIES_TO` | `(Playbook)->(Service)` | |
| `ASSIGNED`, `FOR` | `(Task)->(Agent)`, `(Task)->(Incident)` | |
| `HANDED_OFF_TO` | `(Task)->(Agent)` | `at`, `reason` |
| `PRODUCED`, `ABOUT` | `(Agent)->(Finding)`, `(Finding)->(Incident)` | |
| `EVIDENCE` | `(Finding)->(any node)` | |

Memory types: semantic = services, teams, people; episodic = incidents, alerts, changes;
procedural = playbooks with `successes` and `failures` counters that change after every
incident; coordination = tasks, findings, handoffs.

## Queries

Every query the product runs is a file in [`queries/`](queries/), loaded by `src/ic/queries.py`.
Algorithms used: PageRank, shortest path, betweenness, weakly connected components.

## Data

All data is synthetic. Service names follow the public OpenTelemetry demo application;
everything else is invented. See `src/ic/seed/`.
