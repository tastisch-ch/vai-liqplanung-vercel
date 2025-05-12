-- Supabase seed file
-- This will insert some sample data for testing if the tables are empty

-- Only insert if no profiles exist yet
INSERT INTO profiles (id, name, role, read_only)
SELECT 
  auth.uid() as id,
  'Test User' as name,
  'admin' as role,
  false as read_only
FROM auth.users
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());

-- Create user settings if none exist
INSERT INTO user_settings (user_id, start_balance, primary_color, secondary_color, background_color) 
SELECT 
  auth.uid() as user_id,
  10000 as start_balance,
  '#4A90E2' as primary_color,
  '#111' as secondary_color,
  '#FFFFFF' as background_color
FROM auth.users 
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM user_settings WHERE user_id = auth.uid());

-- Only insert sample buchungen if none exist yet
INSERT INTO buchungen (id, date, details, amount, direction, user_id, created_at)
SELECT 
  gen_random_uuid() as id,
  (CURRENT_DATE - (RANDOM() * 60)::INTEGER) as date,
  'Sample transaction ' || seq as details,
  (RANDOM() * 1000)::NUMERIC(10,2) as amount,
  CASE WHEN RANDOM() > 0.5 THEN 'Incoming' ELSE 'Outgoing' END as direction,
  auth.uid() as user_id,
  NOW() as created_at
FROM generate_series(1, 10) as seq
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM buchungen WHERE user_id = auth.uid());

-- Only insert sample fixed costs if none exist yet
INSERT INTO fixkosten (id, name, betrag, rhythmus, start, user_id, created_at)
SELECT 
  gen_random_uuid() as id,
  'Fixed Cost ' || seq as name,
  (RANDOM() * 500 + 100)::NUMERIC(10,2) as betrag,
  (ARRAY['monatlich', 'quartalsweise', 'halbjährlich', 'jährlich'])[1 + (RANDOM() * 3)::INTEGER] as rhythmus,
  (CURRENT_DATE - (RANDOM() * 30)::INTEGER) as start,
  auth.uid() as user_id,
  NOW() as created_at
FROM generate_series(1, 5) as seq
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM fixkosten WHERE user_id = auth.uid());

-- Only insert sample simulations if none exist yet
INSERT INTO simulationen (id, name, details, date, amount, direction, recurring, interval, user_id, created_at)
SELECT 
  gen_random_uuid() as id,
  'Simulation ' || seq as name,
  'Test simulation ' || seq as details,
  (CURRENT_DATE + (RANDOM() * 90)::INTEGER) as date,
  (RANDOM() * 2000 + 500)::NUMERIC(10,2) as amount,
  CASE WHEN RANDOM() > 0.5 THEN 'Incoming' ELSE 'Outgoing' END as direction,
  CASE WHEN RANDOM() > 0.5 THEN TRUE ELSE FALSE END as recurring,
  CASE WHEN RANDOM() > 0.3 THEN 'monthly' WHEN RANDOM() > 0.7 THEN 'quarterly' ELSE 'yearly' END as interval,
  auth.uid() as user_id,
  NOW() as created_at
FROM generate_series(1, 5) as seq
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM simulationen WHERE user_id = auth.uid()); 