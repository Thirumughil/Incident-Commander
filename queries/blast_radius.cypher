// Everything that depends on the failing service, nearest first.
// params: service
MATCH p = (impacted:Service)-[:DEPENDS_ON*1..4]->(origin:Service {name: $service})
RETURN impacted.name AS service, impacted.tier AS tier, min(length(p)) AS hops
ORDER BY hops, tier, service
