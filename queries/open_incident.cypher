// Detector step 3: open an incident and attach its alerts.
// params: incident, title, severity, now, alert_ids
CREATE (i:Incident {id: $incident, title: $title, status: 'open', severity: $severity, started_at: $now})
WITH i
MATCH (a:Alert) WHERE a.id IN $alert_ids
CREATE (a)-[:PART_OF]->(i)
SET a.status = 'grouped'
