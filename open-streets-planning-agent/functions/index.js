'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const OpenAI = require('openai');

initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

const INSTRUCTIONS = `You are the Open Streets Planning Assistant for a Columbia GSAPP classroom prototype about NYC Open Streets.

Your role is narrow: help residents, students, and community organizers turn a hypothetical street idea into a cautious first-draft concept. Discuss possible public-space uses, schedules, accessible pickup and drop-off, local deliveries, emergency access, staffing, barriers, storage, cleaning, outreach, and trade-offs.

Rules:
- Do not claim to represent NYC DOT, approve an application, or give legal advice.
- Do not invent site-specific facts, current program status, regulations, or community support.
- Ask for a general block type or cross streets only when useful; discourage precise home addresses and personal information.
- Treat polls and chatbot responses as partial input, not representative community consent.
- Clearly distinguish suggestions from requirements that need verification.
- Keep replies practical and readable: usually 120–220 words, with a brief heading and compact bullets when useful.
- When the user gives enough detail, produce a first-draft plan with: purpose, schedule, access, operations, outreach, and open questions.
- When detail is missing, make a modest assumption and state it rather than interrogating the user with many questions.`;

function cleanText(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function cleanHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-8).map((item) => ({
    role: item && item.role === 'assistant' ? 'assistant' : 'user',
    content: cleanText(item && item.content, 1200)
  })).filter((item) => item.content);
}

exports.openStreetsAgent = onCall(
  {
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 60,
    memory: '256MiB',
    maxInstances: 10,
    cors: true
  },
  async (request) => {
    const message = cleanText(request.data && request.data.message, 600);
    const sessionId = cleanText(request.data && request.data.sessionId, 100).replace(/[^a-zA-Z0-9_-]/g, '');
    const history = cleanHistory(request.data && request.data.history);

    if (!message) throw new HttpsError('invalid-argument', 'A message is required.');
    if (!sessionId) throw new HttpsError('invalid-argument', 'A valid session ID is required.');

    try {
      const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
      const response = await client.responses.create({
        model: MODEL,
        instructions: INSTRUCTIONS,
        input: history.concat({ role: 'user', content: message }),
        max_output_tokens: 650,
        store: false
      });

      const reply = cleanText(response.output_text, 5000);
      if (!reply) throw new Error('OpenAI returned an empty response.');

      await getDatabase().ref(`openStreetsAgent/conversations/${sessionId}`).push({
        userMessage: message,
        assistantReply: reply,
        model: MODEL,
        createdAt: Date.now()
      });

      return { reply };
    } catch (error) {
      console.error('Open Streets agent error:', error);
      throw new HttpsError('internal', 'The planning agent could not generate a response.');
    }
  }
);
