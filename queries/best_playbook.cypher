// Playbooks for a service ranked by smoothed success rate, so 1-for-1 does not beat 9-for-10.
// params: service
MATCH (pb:Playbook)-[:APPLIES_TO]->(:Service {name: $service})
RETURN pb.id AS playbook_id, pb.name AS name, pb.successes AS wins, pb.failures AS losses,
       toFloat(pb.successes + 1) / (pb.successes + pb.failures + 2) AS score
ORDER BY score DESC, name
