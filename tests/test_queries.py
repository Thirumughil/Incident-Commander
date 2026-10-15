import os
import re
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from ic import queries  # noqa: E402
from ic.schema import NODE_LABELS, REL_TYPES  # noqa: E402


class QueryFileTests(unittest.TestCase):
    def test_all_queries_load_and_have_no_comments(self):
        names = queries.available()
        self.assertGreaterEqual(len(names), 19)
        for name in names:
            text = queries.load(name)
            self.assertTrue(text, name)
            self.assertNotIn("//", text, name)

    def test_documented_params_match_used_params(self):
        for name in queries.available():
            raw = (queries.QUERY_DIR / f"{name}.cypher").read_text()
            m = re.search(r"^// params: (.*)$", raw, re.M)
            self.assertIsNotNone(m, f"{name} has no params line")
            declared = {p.split()[0] for p in m.group(1).split(",") if p.strip() and p.strip() != "none"}
            used = set(re.findall(r"\$([a-z_]+)", queries.load(name)))
            self.assertEqual(declared, used, name)


    def test_suspect_changes_excludes_changes_after_incident_start(self):
        raw = (queries.QUERY_DIR / "suspect_changes.cypher").read_text()
        self.assertRegex(raw, r"c\.at\s*<=\s*\$incident_start")


    def test_only_known_labels_and_relationships(self):
        for name in queries.available():
            text = queries.load(name)
            for label in re.findall(r"\(\w*:([A-Z][A-Za-z]+)", text):
                self.assertIn(label, NODE_LABELS, f"{name}: {label}")
            for rel in re.findall(r"\[\w*:([A-Z_]+)", text):
                self.assertIn(rel, REL_TYPES, f"{name}: {rel}")

    def test_unknown_query(self):
        with self.assertRaises(KeyError):
            queries.load("nope")


if __name__ == "__main__":
    unittest.main()
