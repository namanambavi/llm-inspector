import { PatternMatch } from '../types';

export function calculateConfidence(
  matches: PatternMatch[],
  imports: Set<string>,
  codeSnippet: string
): number {
  if (matches.length === 0) return 0;

  let baseConfidence = matches[0].confidence;

  // Boost confidence if we have multiple types of matches
  const matchTypes = new Set(matches.map(m => m.type));
  if (matchTypes.size > 1) {
    baseConfidence += 10;
  }

  // Boost if relevant imports are present
  const relevantImports = ['openai', 'anthropic', 'google', 'cohere', 'langchain'];
  const hasRelevantImport = Array.from(imports).some(imp =>
    relevantImports.some(rel => imp.toLowerCase().includes(rel))
  );
  
  if (hasRelevantImport) {
    baseConfidence += 15;
  }

  // Boost if we see explicit model names
  const modelPatterns = [
    /gpt-4/i,
    /gpt-3\.5/i,
    /claude/i,
    /gemini/i,
    /command/i,
  ];
  
  if (modelPatterns.some(pattern => pattern.test(codeSnippet))) {
    baseConfidence += 10;
  }

  // Boost if we see API key patterns (but never the actual keys)
  if (
    codeSnippet.includes('API_KEY') ||
    codeSnippet.includes('api_key') ||
    codeSnippet.includes('apiKey')
  ) {
    baseConfidence += 5;
  }

  // Cap at 100
  return Math.min(100, baseConfidence);
}

export function needsLLMVerification(confidence: number): boolean {
  // Only use LLM for uncertain cases
  return confidence >= 40 && confidence < 80;
}

