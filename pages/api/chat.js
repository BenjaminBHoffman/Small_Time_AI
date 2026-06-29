export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, system } = req.body;

  // Convert message history from Anthropic format to Gemini format
  const contents = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system }],
        },
        contents,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  const data = await response.json();

  // Extract the reply text from Gemini's response format
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
    || "Sorry, I couldn't get a response. Please try again.";

  res.status(200).json({ reply });
}