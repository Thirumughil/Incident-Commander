// Mark a task failed and keep the reason, so an interrupted run never leaves a task looking open.
// params: task, now, error
MATCH (t:Task {id: $task})
SET t.status = 'failed', t.finished_at = $now, t.error = $error
