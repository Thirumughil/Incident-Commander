// params: limit
MATCH (i:Incident)
OPTIONAL MATCH (i)-[:AFFECTED {role: 'origin'}]->(s:Service)
OPTIONAL MATCH (a:Alert)-[:PART_OF]->(i)
RETURN
    i.id AS id,
    i.title AS title,
    i.status AS status,
    i.severity AS severity,
    i.started_at AS started_at,
    i.recommended_playbook AS recommended_playbook,
    i.paged AS paged,
    i.root_cause AS root_cause,
    coalesce(s.name, '') AS origin,
    count(DISTINCT a) AS alert_count
ORDER BY i.started_at DESC
LIMIT $limit