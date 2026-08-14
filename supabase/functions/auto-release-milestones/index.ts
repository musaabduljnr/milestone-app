import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // 1. Find eligible milestones: SUBMITTED status and submitted_at <= NOW() - 72 hours
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    // We select milestones that match:
    // status = 'SUBMITTED'
    // submitted_at <= seventyTwoHoursAgo
    const { data: milestones, error: selectError } = await supabase
      .from('milestones')
      .select('id, title, project_id')
      .eq('status', 'SUBMITTED')
      .lte('submitted_at', seventyTwoHoursAgo);

    if (selectError) {
      throw selectError;
    }

    const processed = [];
    const errors = [];

    // Loop through each milestone and invoke the atomic release function
    for (const m of (milestones || [])) {
      // Check if there is an active open dispute for this milestone before release
      const { data: dispute } = await supabase
        .from('disputes')
        .select('id')
        .eq('milestone_id', m.id)
        .eq('status', 'OPEN')
        .maybeSingle();

      if (dispute) {
        // Skip release if milestone is disputed
        continue;
      }

      // Invoke RPC release function as system (p_is_auto_release = true)
      const { error: rpcError } = await supabase.rpc('release_milestone_payment', {
        p_milestone_id: m.id,
        p_is_auto_release: true
      });

      if (rpcError) {
        console.error(`Failed to auto-release milestone ${m.id} (${m.title}):`, rpcError);
        errors.push({ id: m.id, title: m.title, error: rpcError.message });
      } else {
        console.log(`Successfully auto-released milestone ${m.id} (${m.title})`);
        processed.push({ id: m.id, title: m.title });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-release run finished.`,
        processed_count: processed.length,
        failed_count: errors.length,
        processed,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error('Auto-release handler error:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
