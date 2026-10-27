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
    const body = await req.json();
    const {
      mode,
      topic,
      difficulty = "Intermediate",
      book = "Beginner",
      chapter = "1",
      chapterTitle = "Grammar",
      grammarFocus = "",
      questionType = "fill_gap",
      count = 12,
    } = body;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY secret is not set in Supabase.");
    }

    // ============================================================
    // MODE 1: GRAMMAR RUSH QUESTION BANK BATCH GENERATION
    // ============================================================
    if (mode === "grammar_rush") {
      const batchCount = Math.min(20, Math.max(10, Number(count) || 12));

      const typeInstructions =
        questionType === "true_false_fix"
          ? `Generate ${batchCount} 'true_false_fix' questions:
- About 30% of the questions MUST be completely grammatically CORRECT sentences:
  - "sentence": the correct English sentence
  - "correct_sentence": identical to "sentence"
  - "error_word_index": null
  - "options": []
  - "correct_option": ""
- About 70% of the questions MUST contain EXACTLY ONE grammatical error:
  - "sentence": the sentence containing the single grammar error
  - "correct_sentence": the fixed sentence where only that one word is replaced
  - "error_word_index": 0-based integer index of the erroneous word when splitting "sentence" by spaces (e.g. in "She are my teacher.", words are ["She", "are", "my", "teacher."], so error_word_index is 1)
  - "options": array of 4 replacement word choices (including the exact correct replacement word)
  - "correct_option": the exact replacement word that fixes the error`
          : questionType === "fill_gap"
          ? `Generate ${batchCount} 'fill_gap' questions:
- "sentence": a sentence with exactly one blank represented as "___" (three underscores), e.g., "She ___ my English teacher."
- "correct_sentence": the full complete sentence with the blank filled in
- "error_word_index": null
- "options": array of 4 unambiguous option strings (1 correct + 3 plausible distractors)
- "correct_option": the exact string from "options" that correctly fills the blank`
          : `Generate ${batchCount} 'word_order' questions:
- "correct_sentence": a clear, natural sentence (5 to 9 words) testing the target grammar
- "options": array of the exact words/tokens of "correct_sentence" in SHUFFLED order (keep punctuation attached to the final word, e.g. "teacher.")
- "sentence": the shuffled words joined by " / "
- "error_word_index": null
- "correct_option": identical to "correct_sentence"`;

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are an expert ESL curriculum writer creating questions for a fast-paced mobile grammar game called "Grammar Rush".
Target Book Level: ${book}
Target Chapter: Chapter ${chapter} — ${chapterTitle}
Grammar Focus: ${grammarFocus || chapterTitle}
Question Type: ${questionType}

STRICT QUALITY RULES:
1. Every incorrect sentence in 'true_false_fix' MUST have EXACTLY ONE grammatical error — never two errors.
2. Every question MUST have an unambiguous correct answer — distractor options must be clearly grammatically incorrect in context.
3. Vocabulary and sentence length MUST be strictly appropriate for ${book} level students.
4. "explanation" MUST be a single concise line in simple, encouraging English explaining the grammar rule.

${typeInstructions}

Respond with valid JSON in this exact structure:
{
  "questions": [
    {
      "type": "${questionType}",
      "sentence": "...",
      "correct_sentence": "...",
      "error_word_index": null,
      "options": ["..."],
      "correct_option": "...",
      "explanation": "One-line simple English explanation."
    }
  ]
}`,
            },
            {
              role: "user",
              content: `Generate ${batchCount} ${questionType} questions for ${book} Chapter ${chapter} (${chapterTitle}: ${grammarFocus}).`,
            },
          ],
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`);
      }

      const completion = await openaiResponse.json();
      const rawContent = completion.choices[0].message.content;
      const parsed = JSON.parse(rawContent || '{"questions": []}');

      // Normalize and verify indices
      const normalizedQuestions = (parsed.questions || []).map((q: any) => {
        const type = questionType;
        let errorIdx: number | null =
          q.error_word_index !== null && q.error_word_index !== undefined
            ? Number(q.error_word_index)
            : null;

        // Verify error_word_index by comparing words of sentence and correct_sentence
        if (type === "true_false_fix" && q.sentence && q.correct_sentence) {
          if (q.sentence.trim() === q.correct_sentence.trim()) {
            errorIdx = null;
          } else {
            const w1 = String(q.sentence).trim().split(/\s+/);
            const w2 = String(q.correct_sentence).trim().split(/\s+/);
            if (w1.length === w2.length) {
              const diffIndex = w1.findIndex((word, idx) => word !== w2[idx]);
              if (diffIndex !== -1) {
                errorIdx = diffIndex;
              }
            }
          }
        }

        return {
          book,
          chapter: String(chapter),
          type,
          sentence: String(q.sentence || "").trim(),
          correct_sentence: String(q.correct_sentence || "").trim(),
          error_word_index: errorIdx,
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          correct_option: String(q.correct_option || "").trim(),
          explanation: String(q.explanation || "").replace(/\s+/g, " ").trim(),
          status: "draft",
        };
      });

      return new Response(
        JSON.stringify({ success: true, questions: normalizedQuestions }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================================
    // MODE 2: EXISTING PRINTABLE WORKSHEET GENERATOR (Unchanged behavior)
    // ============================================================
    if (!topic) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
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
Generate exactly 10 questions to make it a proper worksheet. Ensure valid JSON.`,
          },
          {
            role: "user",
            content: `Topic: ${topic}`,
          },
        ],
      }),
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
