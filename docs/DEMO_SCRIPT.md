# Incident Commander: 3-Minute Hackathon Demo Script

**Speaker:** Thiru Mughil Senthur R  
**Project:** Incident Commander (Graph Hacks: Context for AI Agents)  
**Duration:** Exactly 3 minutes (180 seconds)  
**Target Submission:** Sun 18 Oct 2026 (9:00 PM IST)

---

### Setup Before You Hit Record:
1. **Reset Demo State:**
   ```powershell
   python scripts/reset_demo.py --tenant acme --yes
   ```
2. **Three Browser Tabs Open Side by Side:**
   - **Tab 1:** Dashboard at `http://localhost:5173` (or `http://localhost:5173/?lite=1` to disable WebGL aurora if recording drops frames)
   - **Tab 2:** FalkorDB Browser at `http://localhost:3001`
   - **Tab 3:** Terminal ready for verification.
3. **Recording Performance Tip:** If your screen recorder drops frames due to GPU load from the WebGL shader background, open the dashboard with `http://localhost:5173/?lite=1`. This URL flag turns off the ambient Aurora WebGL shader and defaults to the crisp 2D planar graph.

---

### Video Script & Action Timeline

#### [0:00 - 0:15] The Problem with Real Numbers
- **On Screen:** Dashboard at `http://localhost:5173` with `tenant_acme` selected.
- **What to Say:**  
  *"When a production outage hits, on-call engineers are flooded with cascading alerts. In our live test run, a burst of 4 critical alerts across checkout, cart, frontend, and payment was clustered into 1 unified incident and analyzed in under 0.2 seconds. LLMs fail here because vector search can't traverse 4-hop network dependencies or check upstream changes. Incident Commander solves this by using FalkorDB as the shared graph brain for an autonomous multi-agent response team."*

---

#### [0:15 - 0:35] FalkorDB Browser: Live Cypher Traversal
- **On Screen:** Switch to Tab 2 (`http://localhost:3001`). Paste and run query from `queries/blast_radius.cypher`:
  ```cypher
  MATCH p = (impacted:Service)-[:DEPENDS_ON*1..4]->(origin:Service {name: 'currency'})
  RETURN impacted.name AS service, impacted.tier AS tier, min(length(p)) AS hops
  ORDER BY hops, tier, service
  ```
- **What to Say:**  
  *"Here in the FalkorDB Browser on port 3001, we run our live blast radius Cypher query. In just 1.46 milliseconds, FalkorDB traverses 4 hops of dependencies from currency, returning all 11 downstream impacted services and their criticality tiers. This connected graph context drives our entire agent pipeline."*

---

#### [0:35 - 1:05] Inject Failure Scenario & Run Agent Pipeline
- **On Screen:** Switch back to Tab 1 (`http://localhost:5173`).
- **Action 1:** Click **"Inject Demo Incident"**. Notice green banner: `Change on currency and 4 alerts`.
- **Action 2:** Click **"Run Agent Pipeline"**.
- **Action 3:** Click **"Highlight Explain Path"**.
- **What to Say:**  
  *"Let's inject a realistic failure scenario: an operator deployed a faulty connection pool configuration on `currency`, triggering cascading alerts downstream. Now I click 'Run Agent Pipeline'.*  
  *Detector clusters the alerts using Weakly Connected Components (`algo.WCC`). Analyzer traverses upstream dependencies, pinpoints `currency` as the root cause, and computes the 11-service blast radius. When I click 'Highlight Explain Path', Cytoscape traces the exact shortest dependency path from the alerting services directly to the origin."*

---

#### [1:05 - 1:30] Verifiable Evidence ("Why?" Panel) & Coordination Tasks
- **On Screen:** Click the **"Why?" Evidence Panel** tab, then **"Agent Coordination Tasks"**.
- **Action 1:** Point out confidence ratings (90% - 100%) and Cypher query citations.
- **Action 2:** Click the `currency` evidence pill—watch the graph view automatically focus and zoom to that node.
- **What to Say:**  
  *"Every decision is grounded with zero hallucination: notice every claim made by our agents is a `Finding` node with concrete `EVIDENCE` edges to real graph nodes. Clicking any evidence pill focuses that node on the topology.*  
  *Under 'Agent Coordination Tasks', notice our agents never call each other directly. Analyzer hands off its task to Responder in graph memory with reason: 'origin identified: currency'."*

---

#### [1:30 - 1:50] Episodic Memory: Why the Decoys Lose
- **On Screen:** Click **"Memory & Response"** tab. Scroll to **"EPISODIC MEMORY: PAST SIMILAR INCIDENT TWINS"**.
- **Action:** Point out `INC-014` at the top with `Score: 4 (2 overlap + 2 change)` vs decoy `INC-007` (Score: 1).
- **What to Say:**  
  *"Notice how our episodic graph memory ranks past incidents. A naive text search would get fooled by decoy INC-021, where checkout also broke, but FalkorDB knows INC-021 was a payment failure, not currency. And against decoy INC-007 on currency, INC-014 ranks first because it shares the same configuration change causality, scoring 4 versus 1 and boosting the right playbook."*

---

#### [1:50 - 2:20] Closed-Loop Learning (The Money Shot) & Failure Learning
- **On Screen:** On **"Memory & Response"** tab, show recommended playbook `rollback-pool-config` (`PB-04`) with base score `0.800` and paged SRE `Priya Raman`.
- **Action 1:** In the Simulated Resolution form, select `rollback-pool-config`, ensure `Worked` is checked, and click **"Record Simulated Resolution"**.
- **Action 2:** Highlight the green banner: `PB-04: 0.800 -> 0.833`.
- **What to Say:**  
  *"Now look at procedural memory. `rollback-pool-config` is recommended with a score of 0.800 calculated via Laplace smoothing $\frac{3+1}{3+0+2}$. When I confirm the fix worked and record resolution, Learner executes an atomic Cypher query updating wins $3 \to 4$.*  
  *Look at the score: it immediately jumped from **0.800 to 0.833**! The newly resolved incident becomes the top similar incident for any future outage on `currency`.*  
  *And it learns from failure too: if an operator records a failed playbook, Learner increments losses, immediately dropping that playbook's score and demoting it in future recommendations."*

---

#### [2:20 - 2:45] Company Brain (Track 3)
- **On Screen:** Click **"Company Brain (Track 3)"** in the top navigation bar.
- **Action 1:** Show Knowledge Single Points of Failure (SPOF), PageRank Centrality, and Topological Chokepoints.
- **Action 2:** Click **"Inspect"** on `order-service` or `currency` to slide out the **Service Profile Drawer**.
- **What to Say:**  
  *"For Track 3 (Company Brain), FalkorDB turns operational history into institutional memory. We see Knowledge Single Points of Failure where only 1 engineer has ever fixed an outage, and PageRank highlights our architectural bottlenecks. Clicking any service slides out the Service Profile Drawer showing owning teams, on-call schedules, experts, and dependency trees."*

---

#### [2:45 - 2:55] Multi-Tenant Graph Isolation Proof
- **On Screen:** In the header tenant selector, switch from `tenant_acme` to `tenant_globex`.
- **What to Say:**  
  *"Finally, for Track 2 isolation: switching to `tenant_globex` proves globex has zero open incidents and completely independent playbook scores. We also enforce regex validation and per-tenant concurrency locks."*

---

#### [2:55 - 3:00] Closing Summary
- **On Screen:** Return to `tenant_acme` dashboard showing the resolved incident and topology.
- **What to Say:**  
  *"Incident Commander demonstrates how connected graph context in FalkorDB empowers autonomous AI agents to detect, analyze, resolve, and learn from production incidents with zero hallucination. Thank you!"*

---

### Key Numbers to Verify On Screen During Your Recording:
- Burst: **4 alerts** on `checkout`, `cart`, `frontend`, `payment`
- Origin: **currency** (11 services in blast radius, 6 tier-1)
- Query Latency: **1.46 ms** (blast radius), **0.89 ms** (suspect changes), **2.06 ms** (similar incidents)
- Initial `PB-04` score: **0.800** (3 wins, 0 losses)
- Final `PB-04` score after resolve: **0.833** (4 wins, 0 losses)
- Paged Responder: **Priya Raman** (payments)
- Top past similar incident: **INC-014** (score: 4) $\to$ **Injected Incident** (score: 6)
