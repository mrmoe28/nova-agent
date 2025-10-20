-- Create ProjectStatus enum type
CREATE TYPE "ProjectStatus" AS ENUM ('intake', 'analysis', 'sizing', 'bom', 'plan', 'review', 'complete');

-- Convert existing status column to use the enum
-- First normalize any existing values to lowercase
UPDATE "Project"
SET status = lower(status)
WHERE status IS NOT NULL;

-- Alter the column to use the enum type
ALTER TABLE "Project" 
ALTER COLUMN "status" TYPE "ProjectStatus" 
USING status::"ProjectStatus";
