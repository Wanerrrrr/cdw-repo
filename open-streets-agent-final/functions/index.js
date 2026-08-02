'use strict';

const { onRequest } = require('firebase-functions/v2/https');

const SYSTEM_PROMPT = `You are an Open Streets Planning Assistant for a Columbia GSAPP classroom prototype about NYC Open Streets.

Help users turn a hypothetical street idea into a cautious first-draft concept. Discuss possible public-space uses, schedules, accessible pickup and drop-off, deliveries, emergency access, staffing, barriers, storage, cleaning, outreach, and trade-offs.

Rules:
- Do not claim to represent NYC DOT or approve an application.
- Do not invent site-specific facts, regulations, or community support.
- Treat chatbot responses as partial input, not representative community consent.
- Clearly distinguish suggestions from requirements that need verification.
- Keep responses practical and readable, usually 120–220 words.
- When enough detail is available, organize the response under purpose, schedule, access, operations, outreach, and open questions.`;

function cleanText(value, limit = 1200) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, limit);
}

function cleanHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-8).map((item) => ({
    role: item && item.role === 'assistant' ? 'assistant' : 'user',
    content: cleanText(item && item.content)
  })).filter((item) => item.content);
}

exports.openStreetsAgent = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    cors: true,
    timeoutSeconds: 60,
    memory: '256MiB',
    maxInstances: 3
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, service: 'openStreetsAgent' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    const apiKey = cleanText(process.env.OPENAI_API_KEY, 500);
    if (!apiKey || apiKey.includes('PASTE_')) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured in functions/.env.' });
    }

    const message = cleanText(req.body && req.body.message, 600);
    const history = cleanHistory(req.body && req.body.history);
    if (!message) {
      return res.status(400).json({ error: 'A message is required.' });
    }

    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.6
        })
      });

      const data = await openAIResponse.json().catch(() => ({}));
      if (!openAIResponse.ok) {
        console.error('OpenAI error:', openAIResponse.status, JSON.stringify(data));
        const messageText = data && data.error && data.error.message
          ? data.error.message
          : `OpenAI returned HTTP ${openAIResponse.status}.`;
        return res.status(openAIResponse.status === 429 ? 429 : 502).json({ error: messageText });
      }

      const reply = cleanText(
        data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content,
        5000
      );
      if (!reply) {
        return res.status(502).json({ error: 'OpenAI returned an empty response.' });
      }

      return res.status(200).json({ reply });
    } catch (error) {
      console.error('Planning agent error:', error);
      return res.status(500).json({ error: 'The planning agent could not generate a response.' });
    }
  }
);
