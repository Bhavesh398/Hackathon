import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { token, user_id } = await req.json();

    if (!token || !user_id) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service key needed for RLS bypass
    );

    const { data, error } = await supabase.rpc("accept_invitation_by_token", {
      _token: token,
      _user_id: user_id,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
