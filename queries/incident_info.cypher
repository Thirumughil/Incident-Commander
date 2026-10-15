// One incident's header fields and the agents' shared decisions so far.
// params: incident
MATCH (i:Incident {id: $incident})
RETURN i.id AS id, i.title AS title, i.status AS status, i.severity AS severity, i.started_at AS started_at,
       i.recommended_playbook AS recommended_playbook, i.paged AS paged, i.root_cause AS root_cause
