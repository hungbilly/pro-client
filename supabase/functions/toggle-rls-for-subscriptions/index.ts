
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 200,
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { enable_rls } = await req.json()
    
    // Execute SQL to enable or disable RLS
    const sql = enable_rls 
      ? 'ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;'
      : 'ALTER TABLE public.user_subscriptions DISABLE ROW LEVEL SECURITY;'
    
    const { error } = await supabaseClient.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('Error executing SQL to toggle RLS:', error)
      // If the exec_sql function doesn't exist, we can't toggle RLS this way
      throw new Error(`Could not toggle RLS: ${error.message}. Make sure you have the required permissions and the exec_sql function exists.`)
    }

    return new Response(
      JSON.stringify({ success: true, rls_enabled: enable_rls }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error toggling RLS:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
