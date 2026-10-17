# AI Assistant Disclosure

This project was built with AI coding assistance, disclosed as the Graph Hacks rules require (rule 11). The author reviews, runs and can explain every part (rules 12 and 13).

| Tool / Model | Used For |
| :--- | :--- |
| **Claude (Anthropic)** | Project planning, graph schema, synthetic data generator, initial Cypher query drafts, agent and tool layers, service layer scaffolding, and offline unit tests. |
| **ChatGPT (OpenAI)** | Initial FastAPI wrapper prototype, early frontend scaffolding, and initial Cypher query iterations. |
| **Antigravity (Google DeepMind / Gemini 3.8 Flash)** | Merged and verified backend patch; diagnosed and fixed incident resolution error handling; enabled Docker AOF persistence; completely rebuilt frontend dashboard on real FalkorDB graph data (Cytoscape topology, Why Evidence panel, coordination tasks, memory rankings, Company Brain tab, service profile drawer); authored automated Playwright verification suite (`scripts/drive_ui.py`) and captured live UI screenshots; created Track 2 live proofs (`scripts/prove_isolation.py`); and authored comprehensive documentation (`README.md`, `docs/EXPLAIN.md`, `docs/VERIFICATION.md`, `docs/DEMO_SCRIPT.md`). |

At runtime, the FalkorDB graph makes every single decision (root cause, blast radius, similar past incidents, playbook ranking, on-call assignment). An LLM is strictly optional and only rewrites human-readable status summaries from graph facts; without an API key, deterministic graph templates are used.

## How the Author Verified the Work

- Every Cypher query was verified against live FalkorDB (`scripts/check_queries.py`) with zero syntax or runtime errors.
- Offline test suite (`python -m unittest discover -s tests`) runs 55 offline unit tests covering the generator, queries, agents, service layer, and read models.
- End-to-end live pipeline verification (`docs/VERIFICATION.md`): injected incident scenario, grouped alerts with WCC, found suspect change and blast radius, matched `INC-014`, recommended `PB-04`, paged Priya Raman, and verified EVIDENCE links on every finding.
- Storage persistence verified: container restart (`docker restart incident-commander-falkordb`) retained all tenant data under AOF persistence.
- Track 2 proofs (`scripts/prove_isolation.py`): verified strict tenant isolation (`acme` vs `globex`), 409 concurrency lock on simultaneous runs, graph-backed task hand-offs, and double-resolve prevention.
- Automated Playwright browser run (`scripts/drive_ui.py`) verified the full UI flow in headless Chromium and captured 7 screenshots in `docs/screenshots/`.
