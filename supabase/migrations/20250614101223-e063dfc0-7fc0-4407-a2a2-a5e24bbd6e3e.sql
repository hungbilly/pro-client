
-- Clean up duplicate subscription records for info@billyhung.com
-- Keep only the most recent record per user
DELETE FROM user_subscriptions 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM user_subscriptions 
  ORDER BY user_id, created_at DESC
);

-- Update any active subscriptions that have expired to inactive status
UPDATE user_subscriptions 
SET status = 'inactive', 
    updated_at = now()
WHERE status = 'active' 
  AND current_period_end < now();
