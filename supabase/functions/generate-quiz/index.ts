import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { topic, difficulty = "Intermediate" } = await req.json();

    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY secret is not set in Supabase.");
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an expert English teacher creating printable worksheets for students.
Create a quiz/worksheet about the topic provided by the user. The difficulty level should be ${difficulty}.
Respond with a JSON object containing a 'questions' array.
The JSON object must have this structure:
{
  "questions": [
    {
      "question_text": "The question string (if fill in the blank, use ____ for the blank)",
      "type": "multiple-choice" or "fill-in-the-blank",
      "options": ["Option A", "Option B", "Option C"] (ONLY if multiple-choice, otherwise null),
      "correct_answer": "The exact correct answer"
    }
  ]
}
Generate exactly 10 questions to make it a proper worksheet. Ensure valid JSON.`
          },
          {
            role: "user",
            content: `Topic: ${topic}`
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`);
    }

    const completion = await openaiResponse.json();
    const quizResponse = completion.choices[0].message.content;
    const parsedQuiz = JSON.parse(quizResponse || '{"questions": []}');

    return new Response(JSON.stringify({ success: true, questions: parsedQuiz.questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
