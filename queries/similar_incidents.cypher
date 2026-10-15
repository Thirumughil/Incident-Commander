// Past incidents with the same origin as the suspected root cause. Score = how many of the
// currently alerting services they also hit, plus 2 if they were caused by a change.
// params: suspect (service name), alerting (list of service names)
MATCH (i:Incident {status: 'resolved'})-[:AFFECTED {role: 'origin'}]->(:Service {name: $suspect})
OPTIONAL MATCH (i)-[:AFFECTED]->(s:Service) WHERE s.name IN $alerting
WITH i, count(DISTINCT s) AS overlap
OPTIONAL MATCH (i)-[:CAUSED_BY]->(c:Change)
WITH i, overlap, count(c) AS change_caused
OPTIONAL MATCH (i)-[f:FIXED_BY]->(pb:Playbook) WHERE f.worked = true
RETURN i.id AS incident, i.title AS title, i.started_at AS started_at, overlap, change_caused,
       overlap + 2 * change_caused AS score, pb.id AS playbook_id, pb.name AS playbook, f.minutes AS minutes
ORDER BY score DESC, started_at DESC
LIMIT 5
