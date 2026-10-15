// Analyzer: link an incident to the change it blames and store the cause text, so future similarity matching can use it.
// params: incident, change, root_cause
MATCH (i:Incident {id: $incident}), (c:Change {id: $change})
MERGE (i)-[:CAUSED_BY]->(c)
SET i.root_cause = $root_cause
