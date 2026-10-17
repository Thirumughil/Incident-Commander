// A service with its owning team.
// params: service
MATCH (s:Service {name: $service})
OPTIONAL MATCH (t:Team)-[:OWNS]->(s)
RETURN s.name AS service, s.tier AS tier, s.language AS language, s.slo_ms AS slo_ms,
       t.name AS team, t.slack_channel AS channel
