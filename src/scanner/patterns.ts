import { PatternMatch } from '../types';

export interface ProviderPattern {
  name: string;
  imports: string[];
  apiCalls: string[];
  endpoints: string[];
  domains: string[];
  envVars: string[];
}

export const LLM_PROVIDERS: ProviderPattern[] = [
  {
    name: 'OpenAI',
    imports: ['openai', 'from openai import', 'import openai'],
    apiCalls: [
      'openai.chat.completions.create',
      'openai.completions.create',
      'OpenAI(',
      'createChatCompletion',
      'createCompletion',
    ],
    endpoints: ['/v1/chat/completions', '/v1/completions', '/v1/embeddings'],
    domains: ['api.openai.com', 'openai.azure.com'],
    envVars: ['OPENAI_API_KEY', 'OPENAI_API_BASE'],
  },
  {
    name: 'Anthropic',
    imports: ['@anthropic-ai/sdk', 'from anthropic import', 'import anthropic'],
    apiCalls: [
      'anthropic.messages.create',
      'anthropic.completions.create',
      'Anthropic(',
      'messages.create',
    ],
    endpoints: ['/v1/messages', '/v1/complete'],
    domains: ['api.anthropic.com'],
    envVars: ['ANTHROPIC_API_KEY'],
  },
  {
    name: 'Google AI',
    imports: [
      '@google/generative-ai',
      'from google.generativeai import',
      'import google.generativeai',
    ],
    apiCalls: [
      'GenerativeModel',
      'generateContent',
      'model.generateContent',
      'genai.GenerativeModel',
    ],
    endpoints: ['/v1/models', '/v1beta/models'],
    domains: ['generativelanguage.googleapis.com', 'aiplatform.googleapis.com'],
    envVars: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
  },
  {
    name: 'Cohere',
    imports: ['cohere', 'from cohere import', 'import cohere'],
    apiCalls: ['cohere.generate', 'cohere.chat', 'co.generate', 'co.chat'],
    endpoints: ['/v1/generate', '/v1/chat', '/v1/embed'],
    domains: ['api.cohere.ai', 'api.cohere.com'],
    envVars: ['COHERE_API_KEY'],
  },
  {
    name: 'Hugging Face',
    imports: ['@huggingface/inference', 'from huggingface_hub import', 'transformers'],
    apiCalls: ['HfInference', 'InferenceClient', 'pipeline(', 'from_pretrained'],
    endpoints: ['/models/', '/api/models/'],
    domains: ['api-inference.huggingface.co', 'huggingface.co'],
    envVars: ['HUGGINGFACE_API_KEY', 'HF_TOKEN'],
  },
  {
    name: 'OpenRouter',
    imports: ['openrouter'],
    apiCalls: ['openrouter.chat.completions', 'OpenRouter('],
    endpoints: ['/api/v1/chat/completions'],
    domains: ['openrouter.ai'],
    envVars: ['OPENROUTER_API_KEY'],
  },
  {
    name: 'Replicate',
    imports: ['replicate', 'from replicate import', 'import replicate'],
    apiCalls: ['replicate.run', 'replicate.predictions.create'],
    endpoints: ['/v1/predictions', '/v1/models'],
    domains: ['api.replicate.com'],
    envVars: ['REPLICATE_API_TOKEN'],
  },
  {
    name: 'Together AI',
    imports: ['together', 'from together import'],
    apiCalls: ['together.Complete', 'together.chat.completions'],
    endpoints: ['/inference', '/v1/chat/completions'],
    domains: ['api.together.xyz'],
    envVars: ['TOGETHER_API_KEY'],
  },
  {
    name: 'Azure OpenAI',
    imports: ['@azure/openai', 'azure.openai'],
    apiCalls: ['OpenAIClient', 'getChatCompletions', 'getCompletions'],
    endpoints: ['/openai/deployments/'],
    domains: ['.openai.azure.com'],
    envVars: ['AZURE_OPENAI_KEY', 'AZURE_OPENAI_ENDPOINT'],
  },
];

export const WRAPPER_PATTERNS = [
  {
    name: 'LangChain',
    imports: ['langchain', 'from langchain import', '@langchain/'],
    apiCalls: ['ChatOpenAI', 'OpenAI(', 'ChatAnthropic', 'invoke(', 'call('],
  },
  {
    name: 'LlamaIndex',
    imports: ['llama-index', 'llama_index', 'from llama_index'],
    apiCalls: ['LLMPredictor', 'ServiceContext', 'GPTVectorStoreIndex'],
  },
  {
    name: 'Haystack',
    imports: ['haystack', 'from haystack import'],
    apiCalls: ['PromptNode', 'OpenAIAnswerGenerator'],
  },
];

export function matchPattern(text: string, line: number): PatternMatch[] {
  const matches: PatternMatch[] = [];

  // Check for imports
  for (const provider of LLM_PROVIDERS) {
    for (const importPattern of provider.imports) {
      if (text.includes(importPattern)) {
        matches.push({
          pattern: importPattern,
          provider: provider.name,
          confidence: 70,
          type: 'import',
        });
      }
    }
  }

  // Check for API calls
  for (const provider of LLM_PROVIDERS) {
    for (const apiCall of provider.apiCalls) {
      if (text.includes(apiCall)) {
        matches.push({
          pattern: apiCall,
          provider: provider.name,
          confidence: 90,
          type: 'api_call',
        });
      }
    }
  }

  // Check for endpoints
  for (const provider of LLM_PROVIDERS) {
    for (const endpoint of provider.endpoints) {
      if (text.includes(endpoint)) {
        matches.push({
          pattern: endpoint,
          provider: provider.name,
          confidence: 85,
          type: 'endpoint',
        });
      }
    }
  }

  // Check for wrapper patterns
  for (const wrapper of WRAPPER_PATTERNS) {
    for (const importPattern of wrapper.imports) {
      if (text.includes(importPattern)) {
        matches.push({
          pattern: importPattern,
          provider: wrapper.name,
          confidence: 75,
          type: 'import',
        });
      }
    }
  }

  return matches;
}

export function extractModelFromCode(code: string): string | undefined {
  // Common model patterns
  const modelPatterns = [
    /model["\s:=]+["']([^"']+)["']/i,
    /["']model["']\s*:\s*["']([^"']+)["']/i,
    /(gpt-4[^"'\s]*|gpt-3\.5[^"'\s]*)/i,
    /(claude-[^"'\s]*)/i,
    /(gemini-[^"'\s]*)/i,
    /(command[^"'\s]*)/i,
  ];

  for (const pattern of modelPatterns) {
    const match = code.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

