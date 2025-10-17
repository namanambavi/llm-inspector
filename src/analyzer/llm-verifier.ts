import { LLMVerificationRequest, LLMVerificationResult } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function verifyWithLLM(
  request: LLMVerificationRequest,
  apiKey: string,
  provider: 'openrouter' | 'gemini' | 'openai' = 'openrouter'
): Promise<LLMVerificationResult> {
  const prompt = `Analyze this code snippet and determine if it contains an LLM (Large Language Model) API call.

Code from ${request.file}:${request.line}:
\`\`\`
${request.codeSnippet}
\`\`\`

Respond with a JSON object (no markdown formatting) containing:
{
  "isLLMCall": true/false,
  "provider": "provider name" (if applicable, e.g., "OpenAI", "Anthropic", "Google AI"),
  "model": "model name" (if identifiable, e.g., "gpt-4", "claude-3-opus"),
  "confidence": number between 0-100
}

Only respond with the JSON object, nothing else.`;

  try {
    switch (provider) {
      case 'openrouter':
        return await verifyWithOpenRouter(prompt, apiKey);
      case 'gemini':
        return await verifyWithGemini(prompt, apiKey);
      case 'openai':
        return await verifyWithOpenAI(prompt, apiKey);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    // If verification fails, return uncertain result
    return {
      isLLMCall: false,
      confidence: 0,
    };
  }
}

async function verifyWithOpenRouter(prompt: string, apiKey: string): Promise<LLMVerificationResult> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/llm-inspector',
      'X-Title': 'LLM Inspector CLI',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from LLM');
  }

  return parseVerificationResponse(content);
}

async function verifyWithGemini(prompt: string, apiKey: string): Promise<LLMVerificationResult> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('No response from Gemini');
  }

  return parseVerificationResponse(content);
}

async function verifyWithOpenAI(prompt: string, apiKey: string): Promise<LLMVerificationResult> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return parseVerificationResponse(content);
}

function parseVerificationResponse(content: string): LLMVerificationResult {
  // Parse the JSON response
  const result = JSON.parse(content.trim());

  return {
    isLLMCall: result.isLLMCall || false,
    provider: result.provider,
    model: result.model,
    confidence: result.confidence || 50,
  };
}

export async function batchVerify(
  requests: LLMVerificationRequest[],
  apiKey: string,
  provider: 'openrouter' | 'gemini' | 'openai' = 'openrouter',
  batchSize: number = 5
): Promise<Map<string, LLMVerificationResult>> {
  const results = new Map<string, LLMVerificationResult>();

  // Process in batches to avoid rate limits
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(req => verifyWithLLM(req, apiKey, provider))
    );

    batch.forEach((req, index) => {
      const key = `${req.file}:${req.line}`;
      results.set(key, batchResults[index]);
    });

    // Add delay between batches to respect rate limits
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
