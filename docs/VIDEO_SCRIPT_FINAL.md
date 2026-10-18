# Incident Commander: Final 3-Minute Demo Video Script

**Author & Presenter:** Thiru Mughil Senthur R  
**Project:** Incident Commander (Graph Hacks: Context for AI Agents — WeMakeDevs &times; FalkorDB)  
**Target Duration:** 2:50 – 3:10 (Target pace: ~130 words per minute | Script word count: 385 words)  
**Submission Date:** Sunday, October 18, 2026  

---

## 1. Before You Hit Record (Pre-Flight Checklist)

Complete these 10 steps before opening OBS, Loom, or your screen recorder:

1. **Verify FalkorDB container is running:**
   ```powershell
   docker ps --filter "name=incident-commander-falkordb"
   ```
   *Expected:* Container running with ports `0.0.0.0:6380->6379/tcp` and `0.0.0.0:3001->3000/tcp`.

2. **Start the FastAPI backend service (Terminal 1):**
   ```powershell
   python -m uvicorn src.ic.api:app --host 127.0.0.1 --port 8000
   ```
   *Verify:* Opening `http://127.0.0.1:8000/health` in a browser returns `{"status":"ok","falkordb":"connected"}`.

3. **Start the React Vite frontend (Terminal 2):**
   ```powershell
   cd frontend
   npm run dev -- --host 127.0.0.1 --port 5173
   ```

4. **Reset demo tenant to pristine baseline (run yourself in Terminal 3):**
   ```powershell
   python scripts\reset_demo.py --tenant acme --yes
   ```
   *Verification:* Script outputs `[SUCCESS] Tenant 'acme' demo state reset cleanly!` with 30 seeded incidents.

5. **Open Tab 1 — Incident Commander Dashboard:**
   - URL: `http://localhost:5173/?lite=1`
   - *Note:* The `?lite=1` flag disables heavy background WebGL shaders to guarantee a silky-smooth 60 fps recording.
   - Verify header shows: `TENANT: ACME (Primary)` and health badges `API 8000` & `FalkorDB :6380`.

6. **Open Tab 2 — FalkorDB Native Browser:**
   - URL: `http://localhost:3001`
   - In the database / graph selector at the top, select graph: `tenant_acme`.

7. **Open Tab 3 — Public GitHub Repository:**
   - URL: `https://github.com/Thirumughil/Incident-Commander` (or local `README.md`).

8. **Have the FalkorDB Cypher query copied to your clipboard or notepad:**
   ```cypher
   MATCH (s:Service {name: 'currency'})<-[:OWNS]-(t:Team)<-[:ON_CALL_FOR]-(p:Person) WHERE p.oncall_now = true OPTIONAL MATCH (p)-[r:RESOLVED]->(:Incident)-[:AFFECTED]->(s) RETURN p.name AS person, p.role AS role, t.name AS team, t.slack_channel AS channel, count(r) AS prior_fixes ORDER BY prior_fixes DESC
   ```

9. **Display & Zoom Settings:**
   - Set browser zoom to 100% (press `Ctrl + 0`).
   - Hide browser bookmarks bar (`Ctrl + Shift + B`) for clean viewport framing.

10. **Audio & Environment:**
    - Close Slack, Discord, WhatsApp, and email. Turn on Windows Focus Assist / Do Not Disturb.
    - Test microphone audio levels. Speak at a calm, conversational, authoritative pace.

---

## 2. The Script Table

| Time | What Is on Screen | Exact Click(s) (Real UI Labels) | Exact Words to Say (Full Sentences) | Value to See on Screen |
| :--- | :--- | :--- | :--- | :--- |
| **0:00 – 0:15** | Tab 1: Dashboard (`http://localhost:5173/?lite=1`), `Operations Feed` view. | None (mouse hovers over KPI card `ACTIVE INCIDENTS`). | "Hi, I'm Thiru Mughil Senthur R, presenting **Incident Commander**—an autonomous incident response team whose shared brain is a FalkorDB knowledge graph. When cascading alerts strike checkout and payment, traditional LLMs fail because vectors cannot traverse topology to find the upstream root cause." | Header shows `TENANT: ACME (Primary)` and active badges `API 8000` / `FalkorDB :6380`. |
| **0:15 – 0:40** | Tab 2: FalkorDB Browser (`http://localhost:3001`). Graph `tenant_acme` active. | Click query input bar. Paste Cypher query. Click **Run Query** (or press `Ctrl+Enter`). | "FalkorDB is central to our system. Here in the FalkorDB Browser on graph `tenant_acme`, I'll run our read-only query from `queries/who_to_page.cypher`. In one hop, it traverses from `currency` to its owning team, identifies on-call engineer Priya Raman, and counts her prior fixes. Our agents make every operational decision through live Cypher graph traversals." | Table shows: `person: Priya Raman`, `role: Senior SRE`, `team: payments`, `channel: #team-payments`, `prior_fixes: 1`. |
| **0:40 – 1:10** | Tab 1: Switch back to Dashboard (`Operations Feed`). | 1. Click button **1. Inject Demo Failure** (or Header **Inject Demo**).<br/>2. Wait 1s, click button **2. Run Agent Pipeline** (or Header **Run Agents**). | "Back on the dashboard, let's inject a demo incident into our synthetic data. A faulty pool config on `currency` fires four cascading alerts. Clicking 'Run Agent Pipeline', Detector clusters the alerts using Cypher Weakly Connected Components into incident `INC-1792243382`, then coordinates Analyzer through graph memory tasks." | **[VERIFY ON SCREEN]** Banner confirms injection. New incident appears in feed: `INC-1792243382` (SEV1, Origin: `currency`, Change: `CHG-LIVE-...`, 4 Alerts). |
| **1:10 – 1:50** | Tab 1: Incident Graph view, then Why Evidence Panel. | 1. In header floating pill bar, click **Incident Graph**.<br/>2. Click button **Highlight Explain Path**.<br/>3. In header pill bar, click **"Why?" Evidence**.<br/>4. Click evidence pill `currency`. | "In the Incident Graph, Cytoscape renders our live FalkorDB topology. Clicking 'Highlight Explain Path' traces the shortest dependency path to `currency`. In the 'Why?' Evidence Panel, every claim cites verified Cypher queries: `suspect_changes.cypher` identified the pool reduction change, and `blast_radius.cypher` mapped all eleven downstream services—with zero hallucination." | Amber shortest explain path lights up on graph. Why panel displays 100% confidence findings citing `CHG-LIVE-1792243382` and `currency`. |
| **1:50 – 2:10** | Tab 1: Memory & Response view. | In header pill bar, click **Memory & Response**. Scroll to section `EPISODIC MEMORY: PAST SIMILAR INCIDENT TWINS`. | "Under Memory and Response, Responder queried `similar_incidents.cypher`. Past incident `INC-014` ranks first because it shares origin `currency` and a configuration cause. Notice how decoys lose: `INC-021` had similar checkout symptoms but was filtered out because its root cause was `payment`. And `INC-007` scored lower with no config change." | `INC-014` ranked #1 (Score: 4, Overlap: 2). `INC-007` lower (Score: 1). Decoy `INC-021` excluded. Recommended: `rollback-pool-config` (`PB-04`). |
| **2:10 – 2:35** | Tab 1: Memory Page, right column form (`Simulate Operator Feedback`). | 1. In form, verify `Executed Playbook:` is `PB-04 — rollback-pool-config`.<br/>2. Verify radio button `Worked (+1 Win)` is selected.<br/>3. Click button **Submit Resolution Feedback**. | "Now for closed-loop learning. Playbook `rollback-pool-config` is recommended with a Laplace-smoothed score of 0.800. In this simulated resolution, the operator confirms it worked. Clicking 'Submit Resolution Feedback', Learner runs an atomic Cypher query updating procedural memory. The score immediately jumps from 0.800 to 0.833, training our graph for future outages." | Green banner appears: `Playbook PB-04 (Worked): Empirical score adjusted from 0.800 -> 0.833`. Score table updates live. |
| **2:35 – 2:50** | Tab 1: Company Brain view. | In header pill bar, click **Company Brain**. Click service tile `currency` or `order-service` to open drawer. | "For Track 3, Company Brain, `knowledge_spof.cypher` surfaces Single Points of Failure where only one engineer has ever fixed an outage, while PageRank highlights core dependency hubs. Clicking any service inspects its live profile and dependency hierarchy." | 3 columns: `KNOWLEDGE SPOFs`, `MOST DEPENDED-ON`, `TOPOLOGICAL CHOKEPOINTS`. Slide-out `ServiceProfileDrawer` opens. |
| **2:50 – 3:00** | Tab 3: GitHub repository page (`Thirumughil/Incident-Commander`). | Switch to Tab 3 in browser. | "Incident Commander enters all three tracks: Agents That Act on Connected Data, Agent Memory and Coordination, and Company Brain. Built with AI assistance from Claude, ChatGPT, and Antigravity—fully verified by me. Code is public on GitHub. Thank you!" | Public repository view with clean README, architecture schema, and MIT License. |

---

## 3. The FalkorDB Browser Query

- **Query Source File:** `queries/who_to_page.cypher`
- **FalkorDB Graph Target:** `tenant_acme` (select from the database dropdown at top of `http://localhost:3001`)
- **Safety Guarantee:** 100% Read-Only (no `CREATE`, `MERGE`, `SET`, or `DELETE`)

### Cypher Query to Paste:
```cypher
MATCH (s:Service {name: 'currency'})<-[:OWNS]-(t:Team)<-[:ON_CALL_FOR]-(p:Person)
WHERE p.oncall_now = true
OPTIONAL MATCH (p)-[r:RESOLVED]->(:Incident)-[:AFFECTED]->(s)
RETURN p.name AS person, p.role AS role, t.name AS team, t.slack_channel AS channel, count(r) AS prior_fixes
ORDER BY prior_fixes DESC
```

### One-Sentence Plain English Explanation:
> *"This query traverses from the failing microservice to its owning team, finds currently on-call engineers, and ranks them by how many past outages they have personally resolved on that service—grounding the Responder agent's paging decision in verifiable graph expertise."*

*(Alternative zero-parameter query from `queries/knowledge_spof.cypher`:)*
```cypher
MATCH (s:Service)
OPTIONAL MATCH (p:Person)-[:RESOLVED]->(:Incident)-[:AFFECTED]->(s)
WITH s, count(DISTINCT p) AS people_who_fixed_it
WHERE people_who_fixed_it = 1
RETURN s.name AS service, s.tier AS tier, people_who_fixed_it
ORDER BY tier, service
```

---

## 4. The "Graph Does the Work" Lines

Keep this quick reference sheet visible during recording to name the exact Cypher query files behind each decision:

| Operational Decision | Cypher Query File | One-Line Plain Explanation |
| :--- | :--- | :--- |
| **1. Alert Grouping** | `queries/group_alerts_wcc.cypher` | Clusters simultaneous alerts on topologically proximate services into one incident using Weakly Connected Components. |
| **2. Root Cause Localization** | `queries/suspect_changes.cypher` | Traverses upstream dependency hops to correlate recent deployments or pool config changes on origin services within 2 hours. |
| **3. Blast Radius Assessment** | `queries/blast_radius.cypher` | Traverses transitive downstream `[:DEPENDS_ON*1..4]` edges to calculate all 11 impacted services and architectural tiers. |
| **4. Decoy Elimination** | `queries/similar_incidents.cypher` | Filters out superficial symptom decoys (`INC-021`) by matching suspected origin, and causally weights config changes over cache flushes. |
| **5. Playbook Recommendation** | `queries/best_playbook.cypher` | Evaluates historical resolution outcomes over `APPLIES_TO` edges using Laplace smoothing $(s+1)/(s+f+2)$. |
| **6. On-Call Expert Paging** | `queries/who_to_page.cypher` | Traverses `(:Service)<-[:OWNS]-(:Team)<-[:ON_CALL_FOR]-(:Person)` and ranks on-call staff by historical `[:RESOLVED]` count. |
| **7. Closed-Loop Learning** | `queries/record_outcome.cypher` | Atomically increments playbook win/loss counters directly in graph memory upon human operator resolution confirmation. |

---

## 5. Full Narration Only (Teleprompter Block)

Read this continuous text aloud from your second monitor or prompter window. Time markers indicate pacing:

```text
[0:00]
Hi, I'm Thiru Mughil Senthur R, presenting Incident Commander—an autonomous incident response team whose shared brain is a FalkorDB knowledge graph. When cascading alerts strike checkout and payment, traditional LLMs fail because vectors cannot traverse topology to find the upstream root cause.

[0:15]
FalkorDB is central to our system. Here in the FalkorDB Browser on graph tenant_acme, I'll run our read-only query from queries/who_to_page.cypher. In one hop, it traverses from currency to its owning team, identifies on-call engineer Priya Raman, and counts her prior fixes. Our agents make every operational decision through live Cypher graph traversals.

[0:40]
Back on the dashboard, let's inject a demo incident into our synthetic data. A faulty pool config on currency fires four cascading alerts. Clicking 'Run Agent Pipeline', Detector clusters the alerts using Cypher Weakly Connected Components into incident INC-1792243382, then coordinates Analyzer through graph memory tasks.

[1:10]
In the Incident Graph, Cytoscape renders our live FalkorDB topology. Clicking 'Highlight Explain Path' traces the shortest dependency path to currency. In the 'Why?' Evidence Panel, every claim cites verified Cypher queries: suspect_changes.cypher identified the pool reduction change, and blast_radius.cypher mapped all eleven downstream services—with zero hallucination.

[1:50]
Under Memory and Response, Responder queried similar_incidents.cypher. Past incident INC-014 ranks first because it shares origin currency and a configuration cause. Notice how decoys lose: INC-021 had similar checkout symptoms but was filtered out because its root cause was payment. And INC-007 scored lower with no config change.

[2:10]
Now for closed-loop learning. Playbook rollback-pool-config is recommended with a Laplace-smoothed score of 0.800. In this simulated resolution, the operator confirms it worked. Clicking 'Submit Resolution Feedback', Learner runs an atomic Cypher query updating procedural memory. The score immediately jumps from 0.800 to 0.833, training our graph for future outages.

[2:35]
For Track 3, Company Brain, knowledge_spof.cypher surfaces Single Points of Failure where only one engineer has ever fixed an outage, while PageRank highlights core dependency hubs. Clicking any service inspects its live profile and dependency hierarchy.

[2:50]
Incident Commander enters all three tracks: Agents That Act on Connected Data, Agent Memory and Coordination, and Company Brain. Built with AI assistance from Claude, ChatGPT, and Antigravity—fully verified by me. Code is public on GitHub. Thank you!
[3:00]
```

---

## 6. If Something Goes Wrong (Quick Recovery Lines)

1. **FastAPI backend not responding / "API Offline" badge:**
   - *Fix:* Check Terminal 1. Restart: `python -m uvicorn src.ic.api:app --host 127.0.0.1 --port 8000`. Wait 2 seconds for the green `API 8000` badge.
2. **Inject button shows no new incident in feed:**
   - *Fix:* Ensure you are on `Operations Feed` and filter is set to `All` or `Open`. Click the Header Refresh button (circular arrow icon).
3. **FalkorDB Browser shows "Graph does not exist" or empty nodes:**
   - *Fix:* Look at the database/graph dropdown at top left of `http://localhost:3001` and ensure `tenant_acme` (not empty or `default`) is selected.
4. **Wrong tenant selected in UI:**
   - *Fix:* Click the `TENANT:` pill in the top header. In the flyout accordion, click `Switch to ACME`.
5. **Score banner does not appear after resolve:**
   - *Fix:* In the feedback form, make sure `Executed Playbook:` has `PB-04 — rollback-pool-config` selected, `Worked (+1 Win)` is highlighted, and click `Submit Resolution Feedback`.
6. **Video running too long (> 3:10):**
   - *Fix:* Do not pause between browser tab switches. Keep your speech smooth and steady at ~130 wpm following the teleprompter block. You do not need to read every single number on screen; the judges can see them.

---

## 7. After Recording (Publishing & Link Insertion)

1. **Video Upload:**
   - Upload the MP4 video to YouTube as **Unlisted** or **Public** (or Loom / Vimeo).
   - *Crucial Check:* Copy the video URL and open it in an **Incognito / Private browser window** to ensure anyone can view it without logging into your account.
2. **Paste Link into README.md:**
   - Open `README.md` and find line 368 (`## Demo Video`).
   - Replace:
     ```markdown
     - **Video Link:** [DEMO VIDEO LINK PLACEHOLDER - To be recorded by author using docs/DEMO_SCRIPT.md]
     ```
     with your live link:
     ```markdown
     - **Video Link:** [Watch the 3-Minute Walkthrough on YouTube](https://youtu.be/YOUR_VIDEO_ID)
     ```
3. **Confirm GitHub CI Badge & Commit:**
   - The CI badge at line 3 of `README.md` is already configured to `Thirumughil/Incident-Commander`.
   - Commit your README link update:
     ```powershell
     git commit -am "docs: add final recorded demo video link"
     git push origin main
     ```

---

## 8. Values to Verify During Rehearsal

Every metric and ID below is derived from our verified deterministic baseline (`docs/VERIFICATION.md`):

| Metric / ID Spoken or Shown | Recorded Source | What to Verify on Screen During Rehearsal |
| :--- | :--- | :--- |
| **`INC-1792243382`** | `docs/VERIFICATION.md` §1 | **[VERIFY ON SCREEN]** Incident ID generated upon clicking Inject Demo Failure. (Matches synthetic seed formula). |
| **`CHG-LIVE-...`** | `docs/VERIFICATION.md` §1 | **[VERIFY ON SCREEN]** Suspect configuration change ID on `currency` displayed in Spotlight and Context Chips. |
| **4 Firing Alerts** | `docs/VERIFICATION.md` §1 | 4 alerts on `checkout`, `cart`, `frontend`, `payment`. |
| **11 Services in Blast Radius** | `docs/VERIFICATION.md` §1 | Context chip on Graph Page shows `11 services / 15 edges` (or similar dependent count). |
| **`INC-014` Score: 4 (or 3)** | `docs/VERIFICATION.md` §1, 3 | Similar twins table: `INC-014` ranks #1; decoy `INC-007` ranks #2 (Score: 1); `INC-021` filtered. |
| **`PB-04` Base Score: 0.800** | `docs/VERIFICATION.md` §3 | Formula: $(3+1)/(3+0+2) = 4/5 = 0.800$. Displayed in Playbook table. |
| **`PB-04` Resolved Score: 0.833** | `docs/VERIFICATION.md` §3 | Formula: $(4+1)/(4+0+2) = 5/6 = 0.833$. Displayed in green learning success banner after submit. |
| **Priya Raman (Senior SRE)** | `docs/VERIFICATION.md` §1 | On-call engineer paged for team `payments` (`#team-payments`), with 1 prior fix on `currency`. |
