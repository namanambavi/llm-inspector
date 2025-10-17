export interface LLMCall {
  file: string;
  line: number;
  column?: number;
  provider: string;
  model?: string;
  endpoint?: string;
  confidence: number;
  codeSnippet: string;
  method: 'sdk' | 'http' | 'wrapper';
}

export interface ScanResult {
  scannedAt: string;
  directory: string;
  summary: {
    totalCalls: number;
    uniqueModels: string[];
    uniqueProviders: string[];
    fileCount: number;
    filesScanned: number;
  };
  calls: LLMCall[];
}

export interface PatternMatch {
  pattern: string;
  provider: string;
  confidence: number;
  type: 'import' | 'api_call' | 'endpoint' | 'env_var';
}

export interface ScanOptions {
  directory: string;
  outputFormat: 'json' | 'markdown' | 'interactive';
  apiKey?: string;
  apiProvider?: 'openrouter' | 'gemini' | 'openai';
  useLLM: boolean;
  verbose: boolean;
  maxWorkers?: number;
}

export interface Config {
  apiKey?: string;
  apiProvider?: 'openrouter' | 'gemini' | 'openai';
  defaultOutputFormat?: 'json' | 'markdown' | 'interactive';
}

export interface LLMVerificationRequest {
  codeSnippet: string;
  file: string;
  line: number;
}

export interface LLMVerificationResult {
  isLLMCall: boolean;
  provider?: string;
  model?: string;
  confidence: number;
}

