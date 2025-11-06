import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Helper to safely read environment variables
const getEnv = (key: string): string | undefined =>
  (typeof Deno !== "undefined" && Deno?.env?.get?.(key)) ||
  (typeof process !== "undefined" && process?.env?.[key]);

const SUPABASE_URL = getEnv("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = getEnv("RESEND_API_KEY")!;
const APP_BASE_URL = getEnv("APP_BASE_URL") || "http://localhost:8080";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

interface InvitationRequest {
  emails: string[];
  eventTitle: string;
  eventId: string;
}

// --- Use Web Crypto API to generate secure token ---
function generateToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const buildInviteEmail = (eventTitle: string, link: string) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #333;">Judge Invitation</h1>
  <p>You have been invited to judge the event <strong>${eventTitle}</strong>.</p>
  <a href="${link}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
  <p style="font-size: 12px; color: #888;">Or copy and paste this link into your browser:</p>
  <p style="word-break: break-all; font-size: 12px; color: #888;">${link}</p>
</div>
`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- AUTH CHECK ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: corsHeaders });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const parts = token.split(".");
    if (parts.length < 2) return new Response(JSON.stringify({ error: "Invalid JWT" }), { status: 401, headers: corsHeaders });

    const decodeBase64Url = (b64url: string) => {
      let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      return JSON.parse(atob(b64));
    };
    const payload = decodeBase64Url(parts[1]);
    const userId = payload?.sub;
    if (!userId) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    // --- PARSE BODY ---
    const { emails, eventTitle, eventId }: InvitationRequest = await req.json();
    if (!emails || emails.length === 0 || !eventId || !eventTitle)
      return new Response(JSON.stringify({ error: "Missing emails, eventId, or eventTitle" }), { status: 400, headers: corsHeaders });

    // --- ADMIN CHECK (COMMENTED OUT) ---
    /*
    const { data: eventRole, error: roleError } = await supabase
      .from("event_roles")
      .select("role")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!eventRole) return new Response(JSON.stringify({ error: "Forbidden: Must be admin" }), { status: 403, headers: corsHeaders });
    */

    // --- CREATE INVITES ---
    const inviteTokens: Record<string, string> = {};

    for (const email of emails) {
      // Check existing pending invitation
      const { data: existing } = await supabase
        .from("event_invitations")
        .select("token, status")
        .eq("event_id", eventId)
        .eq("invited_email", email)
        .maybeSingle();

      if (existing && existing.status === "pending" && existing.token) {
        inviteTokens[email] = existing.token;
        continue;
      }

      // Generate secure token
      const token = generateToken(32);

      // Insert new invitation
      const { data: inserted, error: insertError } = await supabase
        .from("event_invitations")
        .insert([{ event_id: eventId, invited_email: email, invited_by: userId, role: "judge", token }])
        .select("token")
        .maybeSingle();

      if (insertError) {
        console.error("Failed to insert invitation for", email, insertError);
        continue;
      }

      inviteTokens[email] = inserted?.token ?? token;
    }

    // --- SEND EMAILS ---
    const baseUrl = APP_BASE_URL.replace(/\/$/, "");
    const emailPromises = emails.map(async (email) => {
      const token = inviteTokens[email];
      const link = `${baseUrl}/judge-access?token=${encodeURIComponent(token)}`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Hackathon Platform <onboarding@resend.dev>",
          to: [email],
          subject: `You're invited to judge: ${eventTitle}`,
          html: buildInviteEmail(eventTitle, link),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        throw new Error(`Failed to send email to ${email}: ${res.status} ${text}`);
      }
      return await res.json().catch(() => ({ ok: true }));
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");

    return new Response(JSON.stringify({ success: true, sent: successful, failed: failed }), { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in invitation function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
