// What a service depends on and what depends on it.
// params: service
MATCH (s:Service {name: $service})
OPTIONAL MATCH (s)-[:DEPENDS_ON]->(u:Service)
WITH s, collect(DISTINCT u.name) AS depends_on
OPTIONAL MATCH (d:Service)-[:DEPENDS_ON]->(s)
RETURN depends_on, collect(DISTINCT d.name) AS dependents
