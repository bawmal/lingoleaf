-- Add trial_expiry_notified column to plants table
-- Run this in Supabase SQL Editor

ALTER TABLE plants 
ADD COLUMN IF NOT EXISTS trial_expiry_notified BOOLEAN DEFAULT NULL;

-- Create index for efficient querying of expired trials
CREATE INDEX IF NOT EXISTS idx_plants_trial_expiry 
ON plants(trial_started_at, subscription_status, trial_expiry_notified);
