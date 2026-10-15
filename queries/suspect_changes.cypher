// Recent changes to the service or anything it depends on, nearest first (one row per change).
// params: service, incident_start (epoch seconds)
MATCH (c:Change)-[:MODIFIED]->(s:Service)
WHERE c.at >= $incident_start - 7200
MATCH p = (affected:Service {name: $service})-[:DEPENDS_ON*0..3]->(s)
RETURN c.id AS change, c.kind AS kind, c.summary AS summary, c.at AS at,
       s.name AS changed_service, min(length(p)) AS distance
ORDER BY distance, at DESC
LIMIT 5
