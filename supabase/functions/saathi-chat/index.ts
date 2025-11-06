import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Environment Variables
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_BASE_URL = Deno.env.get("OPENAI_API_BASE_URL") || "https://api.openai.com/v1"; // Default to OpenAI
const SUPABASE_URL = "https://emqrbkbshlfzxnxdeooz.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, eventId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid messages format. Expected an array of messages.");
    }

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing in environment variables.");
    }

    // Initialize Supabase client (optional if you use Supabase)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Custom system prompt
    const systemPrompt = `
You are Saathi (meaning "companion" in Hindi), an expert AI assistant for the Innovex hackathon platform.
You are friendly, knowledgeable, and helpful in guiding users about event registration, team formation, submissions, judging, and community features.
Always respond clearly, concisely, and politely.
`;

    // 🔄 Call OpenRouter or OpenAI (same format)
    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // OpenRouter supports this or you can use "mistralai/mistral-7b-instruct"
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "No response generated.";

    return new Response(
      JSON.stringify({ response: assistantMessage }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error: any) {
    console.error("Error in saathi-chat:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
