// Alerts attached to an incident, with the service each fired on.
// params: incident
MATCH (a:Alert)-[:PART_OF]->(:Incident {id: $incident})
MATCH (a)-[:FIRED_ON]->(s:Service)
RETURN a.id AS alert, a.metric AS metric, a.severity AS severity, a.fired_at AS fired_at, s.name AS service
ORDER BY fired_at
