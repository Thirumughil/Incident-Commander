// How an incident was fixed and by whom (resolved incidents). A failed first fix and a working second fix both appear.
// params: incident
MATCH (i:Incident {id: $incident})
OPTIONAL MATCH (i)-[f:FIXED_BY]->(pb:Playbook)
OPTIONAL MATCH (p:Person)-[r:RESOLVED]->(i)
RETURN pb.id AS playbook_id, pb.name AS playbook, f.worked AS worked, f.minutes AS minutes, p.name AS resolver
