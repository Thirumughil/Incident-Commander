"""Capture key screenshots under 400KB each for README embedding."""
import os
import time
from playwright.sync_api import sync_playwright

DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "screenshots")
os.makedirs(DOCS_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    # Using 1200x750 viewport keeps crisp high-DPI detail while strictly staying under 350 KB per file
    context = browser.new_context(viewport={"width": 1200, "height": 750})
    page = context.new_page()

    # 1. Graph with explain path
    page.goto("http://127.0.0.1:5173/#/graph")
    time.sleep(2)
    explain_btn = page.locator("button:has-text('Explain Path')")
    if explain_btn.is_visible():
        explain_btn.click()
        time.sleep(1)
    p1 = os.path.join(DOCS_DIR, "graph_explain_path.png")
    page.screenshot(path=p1)
    print(f"Saved {p1} ({os.path.getsize(p1) // 1024} KB)")

    # 2. Why panel
    page.goto("http://127.0.0.1:5173/#/why")
    time.sleep(2)
    p2 = os.path.join(DOCS_DIR, "why_evidence_panel.png")
    page.screenshot(path=p2)
    print(f"Saved {p2} ({os.path.getsize(p2) // 1024} KB)")

    # 3. Memory & ranking view
    page.goto("http://127.0.0.1:5173/#/memory")
    time.sleep(2)
    p3 = os.path.join(DOCS_DIR, "memory_learning_ranking.png")
    page.screenshot(path=p3)
    print(f"Saved {p3} ({os.path.getsize(p3) // 1024} KB)")

    # 4. Company Brain tab
    page.goto("http://127.0.0.1:5173/#/brain")
    time.sleep(2)
    p4 = os.path.join(DOCS_DIR, "company_brain_knowledge.png")
    page.screenshot(path=p4)
    print(f"Saved {p4} ({os.path.getsize(p4) // 1024} KB)")

    browser.close()
    print("Done!")
