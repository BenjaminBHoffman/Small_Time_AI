const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

async function callGemini(model, contents, system, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1000 },
      }),
    }
  );

  const data = await response.json();
  return { response, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, system } = req.body;

  const contents = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const apiKey = process.env.GEMINI_API_KEY;

  // Try each model in order until one works
  for (const model of MODELS) {
    const { response, data } = await callGemini(model, contents, system, apiKey);

    if (response.ok) {
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't get a response. Please try again.";
      return res.status(200).json({ reply });
    }

    const code = data.error?.code;

    // Only fall through to next model on capacity/availability errors
    if (code === 503 || code === 429) {
      console.warn(`Model ${model} unavailable (${code}), trying next...`);
      continue;
    }

    // Any other error (auth, bad request, etc.) — stop and return it
    console.error(`Gemini error on ${model}:`, JSON.stringify(data, null, 2));
    return res.status(response.status).json({
      reply: `API error: ${data.error?.message || 'Unknown error'}`,
    });
  }

  // All models failed
  return res.status(503).json({
    reply: "Our AI assistant is experiencing high demand right now. Please try again in a moment!",
  });
}