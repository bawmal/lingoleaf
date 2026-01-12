-- Add subscription fields to plants table
-- Run this in your Supabase SQL Editor

-- Add subscription tracking columns
ALTER TABLE plants ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE plants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE plants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS subscription_ended_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_plants_stripe_customer_id ON plants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_plants_stripe_subscription_id ON plants(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_plants_subscription_status ON plants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_plants_email ON plants(email);

-- Update existing plants to have trial_started_at set to their created_at date
UPDATE plants SET trial_started_at = created_at WHERE trial_started_at IS NULL;
