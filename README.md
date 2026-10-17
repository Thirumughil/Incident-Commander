# Incident Commander

Agents that handle a production incident using a FalkorDB graph as their context layer:
blast radius from the dependency graph, recall of similar past incidents, a learned
ranking of fixes, who to page, and the graph path behind every answer.

Built for Graph Hacks: Context for AI Agents. Tracks entered: Agents That Act on Connected
Data, Agent Memory and Coordination, Company Brain. Status: work in progress.

## Quick start

Requirements: Docker, Python 3.11+, Node 20+ (for the dashboard).

```bash
docker compose up -d            # FalkorDB on :6380, FalkorDB Browser on http://localhost:3001
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env            # Windows: Copy-Item .env.example .env

python scripts/seed.py --tenant acme --reset                          # 40 services, 8 teams, 30 incidents, 15 playbooks
python scripts/seed.py --tenant globex --seed 2 --no-plant --reset    # a second, isolated tenant
python scripts/check_queries.py --tenant acme                         # run every query against the database

python -m uvicorn src.ic.api:app --host 127.0.0.1 --port 8000         # API, docs at http://127.0.0.1:8000/docs
cd frontend && npm install && npm run dev                             # dashboard at http://localhost:5173
python -m unittest discover -s tests -v                               # offline tests, no database needed
```

All demo data is synthetic and regenerated from a seed, so after any database reset just run the two
`seed.py` commands again. The compose file turns on append-only persistence so data survives restarts.

## Run the agents

From the dashboard, or from the command line:

```bash
python scripts/inject_incident.py --tenant acme     # a bad config change on currency plus 4 alerts
python scripts/run_pipeline.py --tenant acme --no-llm
python scripts/run_pipeline.py --tenant acme --resolve INC-<id>   # Learner records the outcome
python scripts/repro_resolve.py --tenant acme --list              # try a resolve on a throwaway copy
```

Detector, Analyzer, Responder and Learner never call each other. Each polls the graph for
its own `Task` nodes, does its work with the queries in `queries/`, and records every claim as a
`Finding` with `EVIDENCE` edges to the nodes it relied on. Set `ANTHROPIC_API_KEY` (and
`pip install anthropic`) to have a model rewrite the status update; without it a template is used.

Recommending a playbook is not executing it: the system only records what an operator confirms.
The demo environment is synthetic, so no real rollback is performed.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /health`, `GET /tenants` | status and tenant graphs |
| `GET /incidents?tenant=` | incident feed read from the graph |
| `GET /incidents/{id}?tenant=` | graph nodes and edges, findings with evidence, tasks, memory, outcome |
| `GET /knowledge?tenant=` | knowledge single points of failure, PageRank, betweenness |
| `GET /services/{name}?tenant=` | owner, experts, past incidents, on call |
| `POST /incidents/run` | run Detector, Analyzer, Responder (one run per tenant at a time) |
| `POST /incidents/{id}/resolve` | Learner: record the outcome so playbook ranking learns |
| `POST /demo/inject` | demo only: write a bad change plus an alert burst |

Every request names a tenant and is answered from that tenant's own graph. Unexpected errors are
logged with their traceback in the API terminal.

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
