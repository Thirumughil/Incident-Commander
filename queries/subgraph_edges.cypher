// Dependency edges among a set of services, for drawing the incident graph.
// params: names
MATCH (a:Service)-[d:DEPENDS_ON]->(b:Service)
WHERE a.name IN $names AND b.name IN $names
RETURN a.name AS source, b.name AS target, d.kind AS kind, d.criticality AS criticality
