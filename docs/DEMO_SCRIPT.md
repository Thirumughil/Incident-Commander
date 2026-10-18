# Incident Commander: 3-Minute Hackathon Demo Script

**Speaker:** Thiru Mughil Senthur R  
**Project:** Incident Commander (Graph Hacks: Context for AI Agents)  
**Duration:** 3 minutes (180 seconds)  
**Target Submission:** Sun 18 Oct 2026

---

### Setup Before You Hit Record:
1. Reset the demo state:
   ```powershell
   python scripts/reset_demo.py --tenant acme --yes
   ```
2. Have three browser tabs open side by side:
   - **Tab 1:** Dashboard at `http://localhost:5173`
   - **Tab 2:** FalkorDB Browser at `http://localhost:3001`
   - **Tab 3:** Terminal ready for isolation verification.

---

### Video Script & Action Timeline

#### [0:00 - 0:20] The Problem & The Pitch
- **On Screen:** Dashboard at `http://localhost:5173`. Show the dark theme UI with `tenant_acme` selected.
- **What to Say:**  
  *"Hi everyone, I'm Thiru Mughil Senthur R, and this is **Incident Commander**—an autonomous incident response agent team whose shared brain is a FalkorDB knowledge graph. In production incidents, LLMs fail because vector search can't traverse 4-hop network dependencies, check upstream configuration changes, or know who is on call. In our architecture, the FalkorDB graph makes every operational decision, and agents coordinate purely through graph memory."*

---

#### [0:20 - 0:40] The Graph in FalkorDB Browser (Port 3001)
- **On Screen:** Switch to Tab 2 (`http://localhost:3001`). Run query:
  ```cypher
  MATCH (s:Service)-[:DEPENDS_ON]->(dep:Service) RETURN s, dep LIMIT 25
  ```
- **What to Say:**  
  *"Here in the FalkorDB Browser on port 3001, you can see our live semantic and episodic memory: 40 microservices, dependency relationships, teams, historical incidents, and past playbooks. We maintain strict tenant isolation with one graph per tenant, such as `tenant_acme` and `tenant_globex`."*

---

#### [0:40 - 1:10] Inject Failure Scenario & Run Agent Pipeline
- **On Screen:** Switch back to Dashboard (`http://localhost:5173`).
- **Action 1:** Click **"Inject Demo Incident"**.
- **Action 2:** Show the green notification: `Injected synthetic failure scenario: Change on currency and 4 alerts`.
- **Action 3:** Click **"Run Agent Pipeline"**.
- **What to Say:**  
  *"Let's inject a realistic production failure scenario: an operator deployed a database connection pool reduction change on `currency`, triggering cascading alerts on `checkout`, `cart`, `frontend`, and `payment`. Now I click 'Run Agent Pipeline'.*  
  *Detector immediately clusters the alerts using Weakly Connected Components (`algo.WCC`). Analyzer inspects upstream changes, pinpoints `currency` as the root cause, and computes the 11-service blast radius. Cytoscape renders the live topology directly from FalkorDB. Let's click 'Highlight Explain Path' to see the exact shortest path from the alerts to the origin."*

---

#### [1:10 - 1:40] Verifiable Evidence ("Why?" Panel) & Coordination Tasks
- **On Screen:** Click the **"Why?" Evidence Panel** tab.
- **Action 1:** Point out the findings emitted by Detector, Analyzer, and Responder with confidence ratings (90% - 100%) and Cypher queries.
- **Action 2:** Click the `currency` or `CHG-LIVE-...` evidence tag—watch the graph view automatically focus and zoom to that node!
- **Action 3:** Click **"Agent Coordination Tasks"**.
- **What to Say:**  
  *"Rule 3 requires real graph work: notice every claim made by the agents is a `Finding` node with concrete `EVIDENCE` links pointing to real graph nodes. Clicking any evidence tag automatically highlights that exact node on the topology.*  
  *Under 'Agent Coordination Tasks', notice our agents never call each other directly. Analyzer hands off its task to Responder in graph memory with reason: 'origin identified: currency'."*

---

#### [1:40 - 2:00] Episodic Memory: Why the Decoys Lose
- **On Screen:** Click **"Memory & Response"** tab. Scroll to **"EPISODIC MEMORY: PAST SIMILAR INCIDENT TWINS"**.
- **Action:** Point out `INC-014` at the top with `Score: 4 (2 overlap + 2 change)` vs decoy `INC-007` (Score: 1).
- **What to Say:**  
  *"Notice how our episodic graph memory ranks past incidents. A naive text search would get fooled by decoy INC-021, where checkout also broke, but FalkorDB knows INC-021 was a payment failure, not currency. And against decoy INC-007 on currency, INC-014 ranks first because it shares the same configuration change causality, scoring 4 versus 1 and boosting the right playbook."*

---

#### [2:00 - 2:30] Closed-Loop Learning (The Money Shot)
- **On Screen:** On **"Memory & Response"** tab, look at **"LAPLACE-SMOOTHED PLAYBOOK RANKINGS"** and the resolution form.
- **Action 1:** Point out the recommended playbook `rollback-pool-config` (`PB-04`) with base score `0.800` (3 wins, 0 losses) and $+0.25$ similarity boost from past incident `INC-014`.
- **Action 2:** Show the On-Call Responder paged: `Priya Raman`.
- **Action 3:** In the Simulated Resolution form, select `rollback-pool-config`, ensure `Worked` is checked, 15 minutes, and click **"Record Simulated Resolution"**.
- **Action 4:** Highlight the green banner that appears: `PB-04: 0.800 -> 0.833`.
- **What to Say:**  
  *"Now look at procedural memory. `rollback-pool-config` is recommended with a score of 0.800 calculated via Laplace smoothing $\frac{3+1}{3+0+2}$. When I confirm the fix worked and click 'Record Simulated Resolution', Learner executes an atomic Cypher query updating playbook wins $3 \to 4$.*  
  *Look at the score: it immediately jumped from **0.800 to 0.833**! Furthermore, the newly resolved incident now becomes the top similar incident for any future outage on `currency`. This is machine learning directly in graph memory."*

---

#### [2:20 - 2:40] Company Brain (Track 3)
- **On Screen:** Click **"Company Brain (Track 3)"** in the sidebar.
- **Action 1:** Show the 3 columns: Knowledge Single Points of Failure (SPOF), PageRank Depended-On Services, and Topological Chokepoints.
- **Action 2:** Click **"Inspect"** on `order-service` or `currency` to slide out the **Service Profile Drawer**.
- **What to Say:**  
  *"For Track 3 (Company Brain), FalkorDB analyzes our organizational memory. We see Knowledge Single Points of Failure where only 1 engineer has ever resolved an outage, and PageRank highlights our top foundational services. Clicking any service opens the Service Profile Drawer showing owning teams, on-call schedules, experts, and dependency trees."*

---

#### [2:40 - 2:50] Tenant Isolation Proof
- **On Screen:** In the top sidebar tenant selector, switch from `tenant_acme` to `tenant_globex`.
- **What to Say:**  
  *"Finally, for Track 2 isolation: switching to `tenant_globex` proves globex has zero open incidents and completely untouched playbook scores. We also enforce concurrency locks and regex validation against invalid tenant injections."*

---

#### [2:50 - 3:00] Close
- **On Screen:** Return to `tenant_acme` dashboard showing the resolved incident and graph.
- **What to Say:**  
  *"Incident Commander demonstrates how connected graph context in FalkorDB enables autonomous AI agents to detect, analyze, resolve, and learn from production incidents with zero hallucination. Thank you!"*

---

### Key Numbers to Verify On Screen During Your Recording:
- Initial `PB-04` score: **0.800** (3 wins, 0 losses)
- Final `PB-04` score after resolve: **0.833** (4 wins, 0 losses)
- Paged Responder: **Priya Raman** (payments)
- Top past similar incident: **INC-014** (before resolve) $\to$ **Injected Incident** (after resolve)
