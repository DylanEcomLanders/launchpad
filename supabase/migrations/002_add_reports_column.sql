-- Add reports column to client_portals
ALTER TABLE client_portals ADD COLUMN IF NOT EXISTS reports jsonb DEFAULT '[]'::jsonb;
