
-- Update payment_schedules table to allow decimal percentages
ALTER TABLE payment_schedules 
ALTER COLUMN percentage TYPE NUMERIC(5,2);

-- Add a comment to document the change
COMMENT ON COLUMN payment_schedules.percentage IS 'Percentage as decimal (e.g., 33.33 for 33.33%)';
