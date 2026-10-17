"""Automated UI walkthrough with Playwright for Incident Commander.

Captures live screenshots to docs/screenshots/:
1. 1_dashboard_overview.png
2. 2_incident_graph_3d.png
3. 2b_incident_graph_fullscreen.png
4. 3_why_evidence_panel.png
5. 4_coordination_tasks.png
6. 5_learning_resolved_score.png
7. 6_company_brain_knowledge.png
8. 7_service_profile_drawer.png
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
            log("Launching Chromium browser...")
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            page.on("console", lambda msg: log(f"BROWSER [{msg.type}]: {msg.text}"))
            page.on("pageerror", lambda err: log(f"BROWSER PAGEERROR: {err}"))

            # 1. Load Operations Overview
            log("1. Navigating to http://127.0.0.1:5173/#/overview ...")
            page.goto("http://127.0.0.1:5173/#/overview")
            page.wait_for_selector(".global-header", timeout=15000)
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "1_dashboard_overview.png"))
            log("Saved 1_dashboard_overview.png")

            # 1b. Test Header Incident Animated Accordion Flyout
            log("1b. Testing Header Incident Animated Accordion Flyout...")
            inc_trigger = page.locator(".incident-accordion-trigger")
            if inc_trigger.is_visible():
                inc_trigger.click()
                time.sleep(1.5)
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "1b_header_incident_accordion.png"))
                log("Saved 1b_header_incident_accordion.png")
                # Close flyout
                page.locator(".flyout-close-btn").first.click()
                time.sleep(0.5)

            # 1c. Test Header Tenant Animated Accordion Flyout
            log("1c. Testing Header Tenant Animated Accordion Flyout...")
            tenant_trigger = page.locator(".tenant-accordion-trigger")
            if tenant_trigger.is_visible():
                tenant_trigger.click()
                time.sleep(1.5)
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "1c_header_tenant_accordion.png"))
                log("Saved 1c_header_tenant_accordion.png")
                # Close flyout
                page.locator(".flyout-close-btn").first.click()
                time.sleep(0.5)

            # 2. Progressive 3D Motion Incident Graph
            log("2. Navigating to http://127.0.0.1:5173/#/graph ...")
            page.goto("http://127.0.0.1:5173/#/graph")
            page.wait_for_selector(".topology-viewer-container", timeout=15000)
            time.sleep(2)
            # Toggle explain path amber glow
            explain_btn = page.locator("button:has-text('Highlight Explain Path')")
            if explain_btn.is_visible():
                explain_btn.click()
                time.sleep(1)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "2_incident_graph_3d.png"))
            log("Saved 2_incident_graph_3d.png")

            # 3. Test Fullscreen Mode
            log("3. Testing Fit & Expand Fullscreen mode...")
            fullscreen_btn = page.locator("button:has-text('Fit & Expand to Full Screen')")
            if fullscreen_btn.is_visible():
                fullscreen_btn.click()
                time.sleep(1.5)
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "2b_incident_graph_fullscreen.png"))
                log("Saved 2b_incident_graph_fullscreen.png")
                # Exit fullscreen
                exit_btn = page.locator("button:has-text('Exit Fullscreen')")
                if exit_btn.is_visible():
                    exit_btn.click()
                    time.sleep(1)

            # 3b. Test Interactive 3D Digital Twin (Google model-viewer mode)
            log("3b. Testing Interactive 3D Digital Twin mode...")
            twin_btn = page.locator("button:has-text('Interactive 3D Twin')")
            if twin_btn.is_visible():
                twin_btn.click()
                time.sleep(2)
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "2d_incident_graph_twin.png"))
                log("Saved 2d_incident_graph_twin.png")

            # 3c. Test 2D Planar Layout mode
            log("3c. Switching to 2D Planar Layout...")
            planar_btn = page.locator("button:has-text('2D Planar Layout')")
            if planar_btn.is_visible():
                planar_btn.click()
                time.sleep(2)
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "2c_incident_graph_2d.png"))
                log("Saved 2c_incident_graph_2d.png")

            # 4. "Why?" Evidence Panel
            log("4. Navigating to http://127.0.0.1:5173/#/why ...")
            page.goto("http://127.0.0.1:5173/#/why")
            page.wait_for_selector(".why-page-container", timeout=15000)
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "3_why_evidence_panel.png"))
            log("Saved 3_why_evidence_panel.png")

            # 5. Agent Coordination Tasks
            log("5. Navigating to http://127.0.0.1:5173/#/coordination ...")
            page.goto("http://127.0.0.1:5173/#/coordination")
            page.wait_for_selector(".coordination-page-container", timeout=15000)
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "4_coordination_tasks.png"))
            log("Saved 4_coordination_tasks.png")

            # 6. Memory & Response (Continuous Learning)
            log("6. Navigating to http://127.0.0.1:5173/#/memory ...")
            page.goto("http://127.0.0.1:5173/#/memory")
            page.wait_for_selector(".memory-page-container", timeout=15000)
            time.sleep(2)
            # Submit resolution feedback if form is open
            submit_btn = page.locator(".submit-resolve-btn")
            if submit_btn.is_visible() and submit_btn.is_enabled():
                log("Submitting operator feedback...")
                submit_btn.click()
                time.sleep(3)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "5_learning_resolved_score.png"))
            log("Saved 5_learning_resolved_score.png")

            # 7. Company Brain (Track 3)
            log("7. Navigating to http://127.0.0.1:5173/#/brain ...")
            page.goto("http://127.0.0.1:5173/#/brain")
            page.wait_for_selector(".brain-page-container", timeout=15000)
            time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "6_company_brain_knowledge.png"))
            log("Saved 6_company_brain_knowledge.png")

            # 8. Open Service Profile Drawer
            log("8. Clicking a service node to open Service Profile Drawer ...")
            service_item = page.locator(".brain-service-item.clickable").first
            if service_item.is_visible():
                service_item.click()
                page.wait_for_selector(".drawer-panel", timeout=10000)
                time.sleep(2)
            page.screenshot(path=os.path.join(SCREENSHOTS_DIR, "7_service_profile_drawer.png"))
            log("Saved 7_service_profile_drawer.png")

            browser.close()
            log("SUCCESS: All UI walkthrough steps passed and screenshots saved!")
    except Exception as exc:
        log(f"FAILED: {exc}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run()
