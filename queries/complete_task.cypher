// Mark a task finished.
// params: task, now
MATCH (t:Task {id: $task})
SET t.status = 'done', t.finished_at = $now
