import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the user from the authorization header
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    const systemMessage = {
      role: "system",
      content: `You are 'Native Buddy', a friendly and encouraging native English teacher chatting with a student.
Your goals:
1. Keep the conversation engaging, fun, and natural.
2. If the student makes a grammatical error, politely correct them in a supportive way before answering their message.
3. Keep your responses relatively concise (1-3 sentences) to match a chat format.
4. Adapt your language level to be understandable for English learners.
5. Ask follow-up questions to keep the conversation flowing.`,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for speed and cost efficiency
      messages: [systemMessage, ...messages],
    });

    const reply = completion.choices[0].message;

    // Save the student's message and the assistant's reply to the database
    // We expect the last message in the array to be the user's newest message.
    const userMessage = messages[messages.length - 1];

    if (userMessage.role === "user") {
      await supabaseClient.from("chat_messages").insert([
        { student_id: user.id, role: "user", content: userMessage.content },
        { student_id: user.id, role: "assistant", content: reply.content },
      ]);
    }

    return new Response(JSON.stringify(reply), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
