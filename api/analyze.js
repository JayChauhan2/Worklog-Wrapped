export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { descriptions } = req.body;
    
    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return res.status(400).json({ error: 'Missing or empty descriptions array' });
    }

    // Construct the prompt with strict JSON instructions for DeepSeek
    const systemPrompt = `You are an exceedingly harsh and cynical judge evaluating a user's project work logs.
You MUST output your response as perfectly formatted JSON matching this exact structure:
{
  "craziestPost": "Select one single entry from the provided logs. You MUST return it verbatim. Do not alter the user's wording under any circumstances.",
  "personalityType": "Use the rubric (North=leaders/fast-paced, South=team/caring, East=planners/detailed, West=risk-takers/visionary) to assign a 2-part type (e.g. North-West).",
  "personalityDescription": "A 1-sentence description of the personality type. Do not use em dashes.",
  "workEthicRanking": <integer 0-100. Evaluate the work ethic. Be exceedingly harsh and cynical. The vast majority of users should score below 50, regardless of how hard they claim to have worked.>,
  "roast": "Write exactly 5 to 6 words. Roast the user's project, implementation, or obvious mistakes. DO NOT insult their writing style or grammar."
}`;

    // Call the DeepSeek API using native fetch
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
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
}
