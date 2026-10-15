// Learner: one atomic write that updates the incident, the FIXED_BY edge and the playbook counters.
// params: incident, playbook, worked, minutes, now
MATCH (i:Incident {id: $incident}), (pb:Playbook {id: $playbook})
MERGE (i)-[f:FIXED_BY]->(pb)
SET f.worked = $worked, f.minutes = $minutes,
    pb.successes = pb.successes + CASE WHEN $worked THEN 1 ELSE 0 END,
    pb.failures = pb.failures + CASE WHEN $worked THEN 0 ELSE 1 END,
    i.status = CASE WHEN $worked THEN 'resolved' ELSE i.status END,
    i.resolved_at = CASE WHEN $worked THEN $now ELSE i.resolved_at END
