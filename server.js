import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── API Route ─────────────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  try {
    const { descriptions } = req.body;

    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return res.status(400).json({ error: 'Missing or empty descriptions array' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured on the server.' });
    }

    const systemPrompt = `You are an exceedingly harsh and cynical judge evaluating a user's project work logs.
You MUST output your response as perfectly formatted JSON matching this exact structure:
{
  "craziestPost": "From all the log entries, pick the single most wild or unexpected moment. Return ONLY the text from the 'What I did' field of that entry, verbatim. Do NOT include the Timestamp, Date Worked, Time Worked, Next Steps, or Reflection fields — just the raw 'What I did' text and nothing else.",
  "personalityType": "Use the rubric (North=leaders/fast-paced, South=team/caring, East=planners/detailed, West=risk-takers/visionary) to assign a 2-part type (e.g. North-West).",
  "personalityDescription": "A 1-sentence description of the personality type. Do not use em dashes.",
  "workEthicRanking": <integer 0-100. Evaluate the work ethic. Be exceedingly harsh and cynical. The vast majority of users should score below 50, regardless of how hard they claim to have worked.>,
  "roast": "Write exactly 5 to 6 words. Roast the user's project, implementation, or obvious mistakes. DO NOT insult their writing style or grammar."
}`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here are the user's work log entries:\n${JSON.stringify(descriptions)}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`DeepSeek API Error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    const output = data.choices[0].message.content;
    res.status(200).json(JSON.parse(output));

  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// ── Serve Vite build in production only ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.use((_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Kill the old process and try again:\n   lsof -ti :${PORT} | xargs kill -9`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});
