// Example Node.js application with LLM calls for testing llm-inspector

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// OpenAI example
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateText() {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "user", content: "Hello, how are you?" }
    ],
  });

  return completion.choices[0].message.content;
}

// Anthropic example
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function claudeChat() {
  const message = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "Tell me a joke" }
    ],
  });

  return message.content;
}

// Direct API call example
async function directApiCall() {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello!' }]
    })
  });

  return response.json();
}

module.exports = { generateText, claudeChat, directApiCall };

