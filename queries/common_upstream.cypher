// Fallback root-cause candidates: services that the most alerting services depend on, nearest first.
// params: alerting (list of service names)
MATCH (a:Service) WHERE a.name IN $alerting
MATCH p = (a)-[:DEPENDS_ON*0..3]->(u:Service)
WITH a, u, min(length(p)) AS d
WITH u, count(a) AS reached, sum(d) AS total_distance
RETURN u.name AS service, u.tier AS tier, reached, total_distance
ORDER BY reached DESC, total_distance ASC, tier ASC, service
LIMIT 5
