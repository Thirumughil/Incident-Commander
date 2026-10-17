# Incident Commander: Author's 20-Minute Walkthrough & Defense Guide

This document is prepared for **Thiru Mughil Senthur R** for the **Graph Hacks: Context for AI Agents** hackathon. It walks through the complete architecture, data model, multi-agent lifecycle, mathematical formulas, and 10 judge Q&As in plain English.

---

## 1. Why a Graph Database (FalkorDB)?

In production incident response, traditional relational tables or flat vector databases fail for three critical reasons:
1. **Multi-Hop Dependency Traversal:** When a service like `checkout` alerts, the root cause is rarely `checkout` itself; it is an upstream dependency 2 or 3 hops away (e.g. `currency`). In relational databases, recursive JOINs across arbitrary depth are slow and complex. In FalkorDB, `MATCH (impacted:Service)-[:DEPENDS_ON*1..4]->(origin)` executes in single-digit milliseconds.
2. **Context Beyond Semantic Similarity:** Vector databases can find past incidents with similar text descriptions, but they cannot tell you if two services actually share a network dependency, if a database pool config was changed 20 minutes prior, or who is currently on call for the owning team. FalkorDB combines topology, temporal events, and team rosters in a single graph.
3. **Graph-Native Algorithms:** FalkorDB provides built-in graph algorithms:
   - **Weakly Connected Components (`algo.WCC`)** to group cascading alerts into incidents without manual heuristic rules.
   - **PageRank (`algo.pageRank`)** to measure service dependency centrality.
   - **Betweenness Centrality (`algo.betweenness`)** to locate architectural bridge chokepoints.

---

## 2. What Each Node and Edge Means

The graph stores four tiers of memory in a single unified schema:

### Semantic Memory (Static Topology & Org Structure)
- `(:Service)`: Microservices in the architecture. Properties: `name`, `tier` (1: critical, 2: core, 3: internal), `slo_ms`.
- `(:Team)`: Engineering teams. Properties: `name`, `slack_channel`.
- `(:Person)`: Engineers. Properties: `name`, `role`, `oncall_now` (boolean).
- `[:DEPENDS_ON]`: Directed dependency `(A)-[:DEPENDS_ON]->(B)` means A calls B.
- `[:OWNS]`: `(Team)-[:OWNS]->(Service)`.
- `[:MEMBER_OF]`: `(Person)-[:MEMBER_OF]->(Team)`.
- `[:ON_CALL_FOR]`: `(Person)-[:ON_CALL_FOR]->(Team)`.

### Episodic Memory (Events & Incident History)
- `(:Alert)`: Telemetry alert. Properties: `id`, `metric`, `severity`, `fired_at`, `status`.
- `(:Change)`: Deployments and config updates. Properties: `id`, `kind`, `summary`, `at`.
- `(:Incident)`: Clustered outage event. Properties: `id`, `status` (`open`/`resolved`), `severity`, `started_at`, `resolved_at`.
- `[:FIRED_ON]`: `(Alert)-[:FIRED_ON]->(Service)`.
- `[:PART_OF]`: `(Alert)-[:PART_OF]->(Incident)`.
- `[:MODIFIED]`: `(Change)-[:MODIFIED]->(Service)`.
- `[:AFFECTED {role}]`: `(Incident)-[:AFFECTED {role: 'origin'}]->(Service)` marks the root-cause service.
- `[:CAUSED_BY]`: `(Incident)-[:CAUSED_BY]->(Change)`.

### Procedural Memory (Playbooks & Learned Ranking)
- `(:Playbook)`: Remediation action (e.g. `rollback-pool-config`, `restart-pods`). Properties: `id`, `name`, `successes` (wins), `failures` (losses).
- `[:APPLIES_TO]`: `(Playbook)-[:APPLIES_TO]->(Service)` defines which fixes are valid for which services.
- `[:FIXED_BY {worked, minutes}]`: `(Incident)-[:FIXED_BY]->(Playbook)` records the actual historical remediation outcome.

### Coordination Memory (Agent Tasks & Audit Trail)
- `(:Task)`: Decoupled workflow hand-off. Properties: `task` (ID), `agent`, `kind`, `status` (`open`, `handed_off`, `done`, `failed`).
- `(:Finding)`: Claim made by an agent. Properties: `id`, `agent`, `claim`, `confidence`, `query`.
- `[:EVIDENCE]`: `(Finding)-[:EVIDENCE]->(Node)` links claims directly to the graph entities they were derived from.

---

## 3. How an Incident Flows Through the 4 Agents (Step by Step)

### Step 1: Detector Agent
1. **Links Related Alerts:** Runs Cypher to draw `[:RELATED_TO]` edges between open alerts firing within 5 minutes on services within 2 dependency hops:
   ```cypher
   MATCH (a1:Alert), (a2:Alert)
   WHERE a1.status = 'open' AND a2.status = 'open' AND id(a1) < id(a2)
     AND abs(a1.fired_at - a2.fired_at) <= 300
   MATCH (s1:Service)<-[:FIRED_ON]-(a1), (s2:Service)<-[:FIRED_ON]-(a2)
   MATCH p = (s1)-[:DEPENDS_ON*0..2]-(s2)
   MERGE (a1)-[:RELATED_TO]-(a2)
   ```
2. **Clusters with WCC:** Runs `algo.WCC` over `RELATED_TO`. Each connected component of alerts becomes one `Incident`.
3. **Creates Incident & Task:** Creates `(:Incident)`, sets alert status to `'grouped'`, and creates an `analyze` `Task` for Analyzer.

### Step 2: Analyzer Agent
1. **Finds Suspect Changes:** For each alerting service, queries recent `Change` events deployed up to 3 hops upstream within 2 hours (`queries/suspect_changes.cypher`).
2. **Picks Root Cause:** If a change reaches the most alerting services, that changed service is chosen as the origin. (If no changes exist, falls back to common upstream dependencies).
3. **Calculates Blast Radius:** Traverses reverse dependencies up to 4 hops (`queries/blast_radius.cypher`).
4. **Calculates Explain Path:** Finds `shortestPath((alerting)-[:DEPENDS_ON*]->(origin))`.
5. **Episodic Recall:** Finds similar past incidents (`queries/similar_incidents.cypher`) sharing the same origin and alerting services.
6. **Records Findings with Evidence:** Writes `Finding` nodes with `EVIDENCE` edges to concrete service, alert, and change nodes.
7. **Hands Off:** Marks its task `handed_off` to `Responder` with reason: `"origin identified: currency"`.

### Step 3: Responder Agent
1. **Ranks Playbooks:** Calls `queries/best_playbook.cypher` for the origin service.
2. **Applies Similarity Boost:** Adds bonus $(0.25 \times \min(score, 4)/4)$ if a past similar incident was resolved quickly by this playbook.
3. **Pages On-Call Engineer:** Queries `queries/who_to_page.cypher` to find on-call engineers for the team owning the origin service, prioritizing prior fixes.
4. **Drafts Status Update:** Composes human-readable status text from graph facts (or passes to LLM if configured).
5. **Marks Task Done:** Records recommendation finding and completes its task.

### Step 4: Learner Agent
1. **Executed on Human Resolution:** Operator confirms what playbook was applied, whether it worked, and resolution minutes.
2. **Atomic Outcome Write:** Executes `queries/record_outcome.cypher`, atomically updating:
   - `Playbook.successes` (+1 if worked) or `Playbook.failures` (+1 if failed)
   - `Incident.status = 'resolved'`
   - `(Incident)-[:FIXED_BY {worked, minutes}]->(Playbook)`
   - `(Person)-[:RESOLVED {minutes}]->(Incident)`
3. **Validates Pre-Conditions:** Checks that the incident exists, is open, has an origin, uses a valid playbook, and names a valid person—preventing double counting or dirty state.

---

## 4. How Learning Works: The Formula with a Worked Example

Procedural memory scoring uses **Laplace Smoothing** (rule of succession) to calculate playbook confidence:

$$\text{Score} = \frac{\text{Wins} + 1}{\text{Wins} + \text{Losses} + 2}$$

### Why Laplace Smoothing?
A naive success rate $\frac{\text{Wins}}{\text{Total}}$ gives a playbook with 1 win and 0 losses a 100% score (1.00), which would beat a playbook with 19 wins and 1 loss (95%). Laplace smoothing regularizes the score toward an uninformative prior of 0.5 when data is sparse.

### Worked Example:
- **Before Resolution on `currency` (`PB-04`):**
  - Wins = 3, Losses = 0
  - $\text{Score} = \frac{3 + 1}{3 + 0 + 2} = \frac{4}{5} = \mathbf{0.800}$
  - Similar incident `INC-014` gives bonus $+0.25$, yielding Composite Score $= \mathbf{1.050}$.
- **Simulated Resolution (`worked = True`, 15 min):**
  - Learner executes atomic query. Wins increments $3 \to 4$, Losses remains $0$.
- **After Resolution on `currency` (`PB-04`):**
  - Wins = 4, Losses = 0
  - $\text{Score} = \frac{4 + 1}{4 + 0 + 2} = \frac{5}{6} = \mathbf{0.833}$
- **Episodic Recall Shift:**
  - The freshly resolved incident now has `overlap = 4`, `change_caused = 1`, and score $= 6$, immediately overtaking `INC-014` (score 4) as the top similar incident for any future outage on `currency`.

---

## 5. How Tenant Isolation Works

- **Separate Graphs per Tenant:** Every tenant's data lives in its own dedicated FalkorDB graph named `tenant_<id>` (e.g. `tenant_acme`, `tenant_globex`).
- **Strict Regex Validation:** Tenant names are validated with `^[a-z][a-z0-9_]{1,31}$`. Invalid names are rejected with 400 Bad Request.
- **No Creation on Typo:** If a user requests `GET /incidents?tenant=acne`, the system queries existing graphs. Because `tenant_acne` does not exist, it returns 404 Not Found rather than dynamically creating an empty graph.
- **Proof:** Verified in `scripts/prove_isolation.py`: actions on `acme` produce zero changes in `globex`, and querying `globex` for `acme` nodes returns 404.

---

## 6. Ten Likely Judge Questions & Clear Answers

#### Q1: "Why did you build this on a graph instead of using an LLM with vector search over incident postmortems?"
> **Answer:** Vector search only matches semantic text similarity. It cannot traverse a 4-hop service dependency tree, correlate timestamps against recent deployments, check who is currently on-call for a specific team, or run topological algorithms like PageRank. FalkorDB gives agents structured, connected ground truth.

#### Q2: "Rule 3 requires that the graph does real work. Where is the proof that answers aren't canned?"
> **Answer:** Every claim made by every agent is recorded as a `Finding` node in FalkorDB with `EVIDENCE` edges pointing to real `Service`, `Alert`, and `Change` node IDs. Furthermore, the dashboard Cytoscape graph is rendered purely from `GET /incidents/{id}`, which queries `subgraph_edges` in FalkorDB. There are zero mock graphs or hard-coded responses.

#### Q3: "How do your agents coordinate?"
> **Answer:** Detector, Analyzer, Responder, and Learner never communicate directly or invoke each other's functions. Coordination is recorded entirely as `Task` nodes in FalkorDB. When Analyzer identifies the origin, it writes findings and updates the task status to `handed_off` targeting Responder. This completely decouples agents and creates an immutable audit log.

#### Q4: "What happens if two operators click 'Run Pipeline' or 'Resolve' at the exact same moment?"
> **Answer:** The service layer implements per-tenant locks. Simultaneous `/incidents/run` calls result in one proceeding and the second receiving `409 Conflict` ("pipeline run already in progress"). For resolution, the Learner inspects `incident.status`: if already resolved, it refuses the second request with `400 Bad Request` to prevent double-counting playbook win counters.

#### Q5: "How does the agent know which person to page?"
> **Answer:** We traverse `(:Service)<-[:OWNS]-(:Team)<-[:ON_CALL_FOR]-(:Person)`. We filter for `p.oncall_now = true` and count how many times that person has previously resolved an incident on that specific service (`MATCH (p)-[:RESOLVED]->(:Incident)-[:AFFECTED]->(s)`), ensuring the most experienced available engineer is paged.

#### Q6: "Why did you use Laplace smoothing instead of simple win percentages for playbooks?"
> **Answer:** A simple ratio $\frac{wins}{total}$ gives a playbook with 1 win and 0 losses a perfect 1.00 score, unfairly ranking it above a tested playbook with 19 wins and 1 loss (0.95). Laplace smoothing $\frac{w+1}{w+l+2}$ gives the 1-0 playbook $0.667$ and the 19-1 playbook $0.909$, correctly favoring battle-tested solutions.

#### Q7: "What is the Company Brain feature and how does it fit Track 3?"
> **Answer:** Company Brain turns operational exhaust into institutional intelligence. It identifies Knowledge Single Points of Failure—services where only one person in the company has ever resolved an outage—and calculates PageRank and Betweenness Centrality over dependencies to pinpoint architectural bottlenecks before they fail.

#### Q8: "Is an LLM required to run this?"
> **Answer:** No. FalkorDB and pure Cypher reasoning make every decision: root cause, blast radius, similarity, playbooks, and paging. An LLM is strictly optional and only polishes the final status text. If no API key is provided, the system falls back seamlessly to deterministic graph templates.

#### Q9: "How is data persistence handled?"
> **Answer:** FalkorDB runs with Redis Append-Only File persistence (`REDIS_ARGS=--appendonly yes --appendfsync everysec`). Injected and resolved incidents survive container restarts, proven by restarting `incident-commander-falkordb` and verifying state retention.

#### Q10: "Is any real production infrastructure modified when an operator resolves an incident?"
> **Answer:** No. All demo data and topologies are synthetic. Resolution records feedback into FalkorDB's procedural memory to demonstrate machine learning from outcomes; it is clearly marked as a simulated environment with no destructive real-world side effects.
