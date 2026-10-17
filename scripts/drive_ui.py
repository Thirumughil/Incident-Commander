"""Automated UI walkthrough with Playwright for Incident Commander.

Captures screenshots to docs/screenshots/:
1. 1_dashboard_overview.png
2. 2_incident_graph_explain.png
3. 3_why_evidence_panel.png
4. 4_coordination_tasks.png
5. 5_learning_resolved_score.png
6. 6_company_brain_knowledge.png
7. 7_service_profile_drawer.png
"""
import os
import sys
import time
import traceback
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def log(msg):
    print(msg, flush=True)

def run():
    log("Starting Playwright UI walkthrough...")
    try:
        with sync_playwright() as p:
            log("Launching headless Chromium...")
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            # 1. Load Dashboard
            log("1. Navigating to http://127.0.0.1:5173 ...")
            page.goto("http://127.0.0.1:5173")
            page.wait_for_selector(".brand", timeout=15000)
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "1_dashboard_overview.png"))
            log("Saved 1_dashboard_overview.png")

            # 2. Inject Demo Incident
            log("2. Clicking 'Inject Demo Incident' ...")
            page.locator("button:has-text('Inject Demo Incident')").click()
            page.wait_for_selector(".notice-box", timeout=10000)
            time.sleep(1)

            # 3. Run Agent Pipeline
            log("3. Clicking 'Run Agent Pipeline' ...")
            page.locator("button:has-text('Run Agent Pipeline')").click()
            time.sleep(3)
            page.wait_for_selector(".incident-card", timeout=15000)

            # 4. Highlight Explain Path on Cytoscape Graph
            log("4. Highlighting Explain Path on Graph ...")
            explain_btn = page.locator("button:has-text('Highlight Explain Path')")
            if explain_btn.is_visible():
                explain_btn.click()
                time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "2_incident_graph_explain.png"))
            log("Saved 2_incident_graph_explain.png")

            # 5. Open Why Evidence Panel
            log("5. Opening Evidence Panel ...")
            page.locator("button:has-text('Evidence Panel')").click()
            time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "3_why_evidence_panel.png"))
            log("Saved 3_why_evidence_panel.png")

            # 6. Click an Evidence tag to focus on graph
            log("6. Clicking evidence tag ...")
            pill = page.locator(".evidence-pill").first
            if pill.is_visible():
                pill.click()
                time.sleep(1)

            # 7. Agent Coordination View
            log("7. Viewing Agent Coordination Tasks ...")
            page.locator("button:has-text('Coordination Tasks')").click()
            time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "4_coordination_tasks.png"))
            log("Saved 4_coordination_tasks.png")

            # 8. Memory & Response View
            log("8. Navigating to Memory & Response ...")
            page.locator("button:has-text('Memory & Response')").click()
            time.sleep(1)

            log("9. Submitting simulated feedback resolution ...")
            resolve_btn = page.locator("button:has-text('Record Simulated Resolution')")
            if resolve_btn.is_visible() and resolve_btn.is_enabled():
                resolve_btn.click()
                time.sleep(3)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "5_learning_resolved_score.png"))
            log("Saved 5_learning_resolved_score.png")

            # 9. Open Company Brain (Track 3)
            log("10. Opening Company Brain ...")
            page.locator("button:has-text('Company Brain')").click()
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "6_company_brain_knowledge.png"))
            log("Saved 6_company_brain_knowledge.png")

            # 10. Open Service Profile Drawer
            log("11. Opening Service Profile Drawer ...")
            inspect_btn = page.locator("button:has-text('Inspect')").first
            if inspect_btn.is_visible():
                inspect_btn.click()
                time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "7_service_profile_drawer.png"))
            log("Saved 7_service_profile_drawer.png")

            browser.close()
            log("SUCCESS: All UI steps executed and 7 screenshots saved to docs/screenshots/!")
    except Exception as exc:
        log(f"FAILED: {exc}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run()
