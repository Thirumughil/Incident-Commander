# AI assistant disclosure

This project was built with AI coding assistance, disclosed as the Graph Hacks rules require
(rule 11). The author reviews, runs and can explain every part (rules 12 and 13).

| Tool | Used for |
| --- | --- |
| Claude (Anthropic) | Project planning, graph schema, synthetic data generator, Cypher query drafts, the four agents and tool layer, API service layer, offline tests, scaffolding and documentation |
| ChatGPT (OpenAI) | The first FastAPI wrapper (`src/ic/api.py`), the React dashboard under `frontend/`, API troubleshooting, and the development work logs |

At runtime the graph makes every decision (blast radius, origin, similar incidents, playbook
ranking, who to page). A language model is optional and only rewrites the final status update
from recorded facts; without an API key a template is used.

## How the author verified the work

- Every Cypher query was run against a real FalkorDB instance (`scripts/check_queries.py`) and fixed where FalkorDB rejected it.
- The learning loop was checked on a live instance: after a resolved incident the playbook score moved (0.800 to 0.833) and the closest past incident changed.
- Offline tests (`python -m unittest discover -s tests`) cover the generator, queries, agents, service layer and read models.

Update this file as the project grows: note any new tool and what it was used for.
