-- Normalize existing Project status values to lowercase
UPDATE "Project"
SET status = lower(status)
WHERE status IS NOT NULL
  AND status <> lower(status);
