// People who resolved incidents on a service, most experienced first: who knows this system.
// params: service
MATCH (p:Person)-[r:RESOLVED]->(i:Incident)-[:AFFECTED]->(:Service {name: $service})
RETURN p.name AS person, p.role AS role, count(DISTINCT i) AS incidents, avg(r.minutes) AS avg_minutes
ORDER BY incidents DESC, person
LIMIT 5
