// Responder records its decision on the incident so the Learner and the UI can read it.
// params: incident, playbook, person
MATCH (i:Incident {id: $incident})
SET i.recommended_playbook = $playbook, i.paged = $person
