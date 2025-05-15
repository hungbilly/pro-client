
-- Add is_html column to email_history table
ALTER TABLE public.email_history ADD COLUMN IF NOT EXISTS is_html BOOLEAN DEFAULT FALSE;

-- Create function to check if a column exists
CREATE OR REPLACE FUNCTION public.check_column_exists(table_name text, column_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = check_column_exists.table_name
      AND column_name = check_column_exists.column_name
  ) INTO column_exists;
  
  RETURN jsonb_build_object('exists', column_exists);
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.check_column_exists TO service_role;
GRANT EXECUTE ON FUNCTION public.check_column_exists TO anon;
GRANT EXECUTE ON FUNCTION public.check_column_exists TO authenticated;
