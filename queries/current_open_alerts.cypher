// Open alerts and the service each fired on.
// params: none
MATCH (a:Alert {status: 'open'})-[:FIRED_ON]->(s:Service)
RETURN a.id AS alert, a.metric AS metric, a.severity AS severity, a.fired_at AS fired_at, s.name AS service
ORDER BY fired_at
