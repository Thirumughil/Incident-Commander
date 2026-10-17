# Incident Commander: Final Hackathon Engineering Report

**Event:** Graph Hacks: Context for AI Agents (WeMakeDevs x FalkorDB)  
**Participant:** Thiru Mughil Senthur R (Solo Student)  
**Problem Statement:** #5 Incident Commander  
**Tracks Entered:** Track 1 (Agents That Act on Connected Data), Track 2 (Agent Memory and Coordination), Track 3 (Company Brain)  
**Report Date:** Sat 17 Oct 2026 (Completed ahead of target deadline: Sun 18 Oct 9:00 PM IST)

---

## 1. Work Completed Phase by Phase (With Real Command Evidence)

### Phase 0: Backend Patch & Persistence Merge
- **Safety Backup:** Full backup of codebase created at `T:\Agent WMD 2\backup-before-patch` using robocopy excluding `.git`, `node_modules`, `__pycache__`.
- **Patch Application:** Merged `Backend\Patch A` (`queries/`, `src/ic/`) and `Backend\Patch B` (`scripts/`, `tests/`, `docker-compose.yml`, `requirements.txt`, root docs) over project root without overwriting `.env` or `src/ic/seed/`. Removed `Backend/` after validation.
- **Unit Testing:** Ran `python -m unittest discover -s tests`. All 55 tests passed offline.
- **Persistence:** Recreated `incident-commander-falkordb` container with `docker compose up -d` applying `REDIS_ARGS=--appendonly yes --appendfsync everysec`. Re-seeded both `acme` (40 services, 8 teams, 22 people, 60 changes, 63 alerts, 30 incidents, 15 playbooks) and `globex`. Verified persistence across `docker restart incident-commander-falkordb`: injected incident `INC-1792243031` survived intact.
- **Cypher Query Audit:** Ran `python scripts/check_queries.py --tenant acme`: all 21 read and write Cypher queries succeeded without errors.

### Phase 1: Diagnose & Fix Resolve Failure
- **Root Cause Identified:** 
  1. The previous ChatGPT API (`api.py`) contained a broad `except Exception:` block that caught all errors and returned `500 detail="Resolution failed"`, completely hiding the underlying stack trace.
  2. In default Swagger/OpenAPI requests, placeholder string inputs (`"playbook": "string"`, `"person": "string"`) caused `Learner` lookup failures.
  3. Missing append-only persistence in FalkorDB caused newly injected incidents to vanish if Docker restarted prior to an RDB snapshot.
- **Fix Implemented:** Replaced with modular `Service` architecture (`src/ic/service.py`) that logs full tracebacks and maps typed exceptions (`NotFound` -> 404, `BadRequest` -> 400, `Busy` -> 409, `Unavailable` -> 503). Pre-validated playbook applicability, person existence, and origin identification before any graph mutations. Added explicit unit tests in `tests/test_service.py`. Verified real HTTP calls via PowerShell `Invoke-RestMethod` and curl for valid resolve (200), duplicate resolve refusal (400), non-existent incident (404), and invalid person/playbook (400).

### Phase 2: End-to-End Live Verification
- **Scenario Execution:** Ran `inject_incident.py` and `run_pipeline.py --no-llm` against `tenant_acme`:
  - Incident: `INC-1792243382` (SEV1, 4 alerts on `checkout`, `cart`, `frontend`, `payment`).
  - Origin correctly identified as `currency` (caused by `CHG-LIVE-1792243382` lowering connection pool 50 -> 10).
  - Blast radius: 11 services within 4 hops (6 tier-1).
  - Episodic match: `INC-014` (fixed by `rollback-pool-config` in 11m).
  - Recommended fix: `rollback-pool-config` (`PB-04`), composite score 1.05.
  - Paged: `Priya Raman` (Senior SRE, payments).
- **Evidence Verification:** Every finding generated contains concrete `EVIDENCE` links to real `Service`, `Change`, `Alert`, `Incident`, `Playbook`, and `Person` nodes.
- **Idempotency:** Re-running pipeline with no open alerts returned `opened_count == 0` without orphan tasks or duplicate incidents.
- **Encoding Audit:** Scanned repository for UTF-8 corruption sequences (`â`, `Ã`, `\uFFFD`). Zero occurrences found.
- **Documentation:** Recorded findings in `docs/VERIFICATION.md`.

### Phase 3: Security, Robustness & Hygiene
- **Secret Hygiene:** Validated `.env` is ignored by `.gitignore` and `.env.example` contains placeholders. Verified `llm.py` only reads `ANTHROPIC_API_KEY` from environment variables without logging keys.
- **Tenant Validation:** Enforced strict regex pattern `^[a-z][a-z0-9_]{1,31}$` across `api.py` and `graph.py`. Requests to unknown tenants return 404 and never create orphan graphs.
- **Query Parameterization:** Confirmed all queries in `queries.py` and `tools.py` use parameterized Cypher parameters; zero raw string concatenation from user input.
- **Git Ignore:** Updated `.gitignore` to cover `.venv`, `node_modules`, `frontend/dist`, `__pycache__`, `*.zip`, and `.pytest_cache`.

### Phase 4: Rebuilt Dashboard on Real FalkorDB Graph
- **Eliminated Mock Graph:** Completely removed ChatGPT's hardcoded mock graph nodes and edges.
- **Cytoscape Topology:** Built interactive graph visualization in `frontend/src/App.tsx` and `frontend/src/App.css` driven directly from `GET /incidents/{id}?tenant=`:
  - Distinct styling for Origin (red glow, 4px border, `[ORIGIN]` label), Alerting services (orange/red), Blast Radius dependencies, and Suspect Change (purple diamond).
  - Added "Highlight Explain Path" button tracing shortest dependency paths from alerting nodes to origin.
  - Added zoom, fit, and centering controls.
- **Interactive "Why?" Evidence Panel:** Displays agent findings with confidence scores and Cypher queries. Clicking any evidence pill focuses and zooms to that node in Cytoscape.
- **Agent Coordination View:** Visualizes the `Task` timeline (Detector -> Analyzer -> Responder -> Learner) with status badges and graph hand-off reasons.
- **Memory View & Simulated Feedback:** Shows procedural playbook ranking table, episodic similar incidents, separate Recommended vs Executed cards, and a simulated operator feedback form.
- **Company Brain Tab (Track 3):** Renders Knowledge Single Points of Failure, PageRank centrality, and Betweenness chokepoints from `GET /knowledge`. Includes a slide-out **Service Profile Drawer** from `GET /services/{name}`.
- **Build & Playwright Verification:** `npm run build` passes with 0 errors. Authored `scripts/drive_ui.py` which drove headless Chromium through all UI flows and saved 7 screenshots to `docs/screenshots/`.

### Phase 5: Track 2 Proofs (Live Isolation, Concurrency, Coordination)
- Authored `scripts/prove_isolation.py` and executed against live DB:
  - **Isolation:** Proved injecting and resolving in `acme` creates 0 changes in `globex`; querying `globex` for `acme` nodes returns 404; unknown tenants return 404 without creating graphs.
  - **Concurrency:** Proved concurrent `/incidents/run` requests are protected by per-tenant locks (one 200 OK, one 409 Conflict).
  - **Coordination:** Printed the real graph-backed Task and Finding chain.
  - **Learning:** Captured live before/after score updates and double-resolve refusal (400 Bad Request).

### Phase 6: Documentation & AI Usage
- **README.md:** Rewritten with one-paragraph pitch, track mappings, Mermaid architecture diagram, data model with 4 memory tiers, 9 key Cypher queries with explanations, coordination description, copy-paste PowerShell setup, demo walkthrough, and proof numbers.
- **AI_USAGE.md:** Updated with full disclosures for Claude, ChatGPT, and Antigravity (Gemini 3.8 Flash).

### Phase 7: Author Walkthrough & Defense Guide
- Produced `docs/EXPLAIN.md`: A 20-minute guide explaining why FalkorDB was chosen, node/edge definitions, agent flow with Cypher snippets, Laplace formula worked example, tenant isolation mechanics, and 10 likely judge questions with concise answers.

### Phase 8: Demo Readiness
- Authored `scripts/reset_demo.py` with safety `--yes` guard for quick, clean demo resets.
- Authored `docs/DEMO_SCRIPT.md`: 3-minute timestamped script with exact clicks, narration, and on-screen metrics.
- Authored `docs/BLOG_OUTLINE.md` for post-hackathon sharing.

---

## 2. Root Cause of Resolve Failure & The Fix

| Factor | Root Cause | Implemented Solution |
| :--- | :--- | :--- |
| **Silent Exception Swallowing** | ChatGPT's old `api.py` had a blanket `except Exception: raise HTTPException(500, detail="Resolution failed")`, masking errors. | Rewrote API layer using `src/ic/service.py`, which logs complete stack traces and maps typed exceptions (`NotFound` 404, `BadRequest` 400, `Busy` 409). |
| **Missing Input Validation** | Default Swagger JSON bodies sent `"person": "string"` and `"playbook": "string"`, causing lookup errors in `Learner`. | Added explicit validation in `Learner.resolve()` that checks person existence and playbook applicability before writing to the graph. |
| **Missing Persistence** | FalkorDB was running with default Redis snapshotting; recent incidents vanished upon Docker restart before an RDB dump occurred. | Enabled Redis Append-Only File (`REDIS_ARGS=--appendonly yes --appendfsync everysec`) in `docker-compose.yml`, ensuring every write is immediately synced to disk. |
| **Idempotency Guard** | Resolving the same incident twice risked double-counting playbook win counters. | Added status check: if `incident.status == 'resolved'`, raises `ValueError` returning `400 Bad Request`, guaranteeing single-outcome integrity. |

---

## 3. Test Counts, Concurrency, and Learning Metrics

- **Offline Unit Tests:** 55 passed in 0.048s (`tests/test_generator.py`, `tests/test_agents.py`, `tests/test_queries.py`, `tests/test_service.py`).
- **Live Cypher Queries:** 21 queries checked and verified against live FalkorDB (`scripts/check_queries.py`).
- **Concurrency Result:** Concurrent pipeline triggers return `200 OK` (first caller) and `409 Conflict` (second caller).
- **Procedural Learning Shift (Real Run):**
  - **Before Resolve (`PB-04` on `currency`):** Wins: 3, Losses: 0 $\to \text{Score} = \frac{3+1}{3+0+2} = \mathbf{0.800}$ (Composite: 1.050 with $+0.25$ similarity boost).
  - **After Resolve (`PB-04` on `currency`):** Wins: 4, Losses: 0 $\to \text{Score} = \frac{4+1}{4+0+2} = \mathbf{0.833}$ (Composite: 1.083).
- **Episodic Recall Shift (Real Run):**
  - **Before Resolve:** Top similar incident was `INC-014` (Score: 4, Overlap: 2).
  - **After Resolve:** Top similar incident became the freshly resolved incident `INC-1792243382` (Score: 6, Overlap: 4).

---

## 4. Known Limitations & Unverified Items

1. **Synthetic Data:** All microservices, telemetry alerts, and engineer profiles are synthetically generated; the system is not connected to a live production Kubernetes cluster.
2. **Simulated Resolution:** The operator resolve form updates graph procedural memory; it does not execute a real Kubernetes rollback or deployment change.
3. **Optional LLM:** LLM integration via Anthropic Claude is optional and only formats human-readable status text. During testing, template generation was primarily used.

---

## 5. Submission Checklist (Rules Compliance)

| Rule / Requirement | Status | Verification Evidence |
| :--- | :---: | :--- |
| **FalkorDB as Primary Database** | **PASS** | Every decision (blast radius, root cause, playbooks, on-call, SPOF) is computed via Cypher in FalkorDB. |
| **Real Graph Work (No Mocking)** | **PASS** | Cytoscape dashboard renders from `GET /incidents/{id}`; all findings have real `EVIDENCE` edges. |
| **Post-Hackathon Start Date** | **PASS** | Normal git commit history from Oct 17 2026; no backdated history. |
| **Public or Synthetic Data Only** | **PASS** | 100% synthetic dataset generated by `src/ic/seed/generator.py`. |
| **AI-Use Disclosure (Rule 11)** | **PASS** | `AI_USAGE.md` updated with Claude, ChatGPT, and Antigravity (Gemini 3.8 Flash). |
| **Author Explainability (Rules 12 & 13)** | **PASS** | `docs/EXPLAIN.md` provides a 20-minute defense walkthrough and 10 judge Q&As. |
| **All 3 Tracks Addressed** | **PASS** | Named and documented in README, verification report, and dashboard. |
| **Local Setup Commands** | **PASS** | Tested PowerShell setup commands in README executed and verified. |
| **Demo Script & Video Placeholder** | **PASS** | `docs/DEMO_SCRIPT.md` created; video placeholder in README. |
| **Demo State Reset Tool** | **PASS** | `scripts/reset_demo.py` verified with `--yes` safety guard. |

---

## 6. Exact Manual Steps Left for the Author

1. **Reset Demo State:**
   ```powershell
   python scripts/reset_demo.py --tenant acme --yes
   ```
2. **Rehearse & Record 3-Minute Video:**
   - Follow the timestamped script in [docs/DEMO_SCRIPT.md](file:///T:/Agent%20WMD%202/incident-commander/docs/DEMO_SCRIPT.md).
   - Show: Dashboard $\to$ FalkorDB Browser (:3001) $\to$ Inject & Run $\to$ Cytoscape Topology $\to$ Why Evidence Panel $\to$ Resolve (0.800 -> 0.833) $\to$ Company Brain tab $\to$ Tenant isolation.
3. **Upload Video:**
   - Upload video to YouTube or Loom (unlisted or public).
4. **Update README Video Link:**
   - Paste the video URL into the placeholder in `README.md`.
   - Commit: `git commit -am "Add demo video link"`.
5. **Create Public GitHub Repo & Push:**
   - Create a new public repository on GitHub (e.g. `github.com/thirusenthur/incident-commander`).
   - Add remote and push:
     ```powershell
     git remote set-url origin https://github.com/<your-username>/incident-commander.git
     git push -u origin main
     ```
6. **Submit Hackathon Entry:**
   - Submit the public repository link and video link on the hackathon submission portal before **Sunday, October 18, 2026 at 9:00 PM IST** (hard close 11:59 PM IST).
