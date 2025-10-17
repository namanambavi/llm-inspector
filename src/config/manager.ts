import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.llm-inspector');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<Config> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = await fs.promises.readFile(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    // If config doesn't exist or is invalid, return empty config
  }

  return {};
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      await fs.promises.mkdir(CONFIG_DIR, { recursive: true });
    }

    await fs.promises.writeFile(
      CONFIG_FILE,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

export async function getApiKey(): Promise<{ apiKey?: string; provider?: 'openrouter' | 'gemini' | 'openai' }> {
  // Check environment variables first (in order of preference)
  if (process.env.OPENROUTER_API_KEY) {
    return { apiKey: process.env.OPENROUTER_API_KEY, provider: 'openrouter' };
  }
  
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return { apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY, provider: 'gemini' };
  }
  
  if (process.env.OPENAI_API_KEY) {
    return { apiKey: process.env.OPENAI_API_KEY, provider: 'openai' };
  }

  // Check config file
  const config = await loadConfig();
  if (config.apiKey && config.apiProvider) {
    return { apiKey: config.apiKey, provider: config.apiProvider };
  }

  return {};
}

export async function setApiKey(apiKey: string, provider: 'openrouter' | 'gemini' | 'openai'): Promise<void> {
  const config = await loadConfig();
  config.apiKey = apiKey;
  config.apiProvider = provider;
  await saveConfig(config);
}

function readPasswordInput(): Promise<string> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const stdin = process.stdin;
    const stdout = process.stdout;

    // Mute output
    const mutableStdout = new Proxy(stdout, {
      get(target, prop) {
        if (prop === 'write') {
          return function(chunk: any) {
            // Only write asterisks for actual input, not for newlines
            if (chunk === '\n' || chunk === '\r\n') {
              return target.write(chunk);
            }
            // Don't show the actual characters
            return true;
          };
        }
        return (target as any)[prop];
      }
    });

    const rl = readline.createInterface({
      input: stdin,
      output: mutableStdout,
      terminal: true
    });

    rl.question('', (answer: string) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

export function promptForApiKey(): Promise<{ apiKey: string; provider: 'openrouter' | 'gemini' | 'openai' } | null> {
  return new Promise((resolve) => {
    console.log('\nAPI key not found.');
    console.log('\nSupported providers:');
    console.log('  1. OpenRouter (https://openrouter.ai/keys) - Free tier available');
    console.log('  2. Google Gemini (https://makersuite.google.com/app/apikey) - Free tier available');
    console.log('  3. OpenAI (https://platform.openai.com/api-keys)');
    console.log('\nNote: LLM verification is optional. You can skip this by using --no-llm flag.\n');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter provider number (1-3) or press Enter to skip: ', async (providerInput: string) => {
      if (providerInput.trim() === '') {
        rl.close();
        resolve(null);
        return;
      }

      const providerNum = parseInt(providerInput.trim());
      const providers: Array<'openrouter' | 'gemini' | 'openai'> = ['openrouter', 'gemini', 'openai'];
      
      if (providerNum < 1 || providerNum > 3) {
        console.log('Invalid selection. Skipping...');
        rl.close();
        resolve(null);
        return;
      }

      const provider = providers[providerNum - 1];
      const providerNames = {
        openrouter: 'OpenRouter',
        gemini: 'Google Gemini',
        openai: 'OpenAI'
      };

      rl.close();
      
      process.stdout.write(`\nEnter your ${providerNames[provider]} API key (hidden): `);
      
      const apiKey = await readPasswordInput();
      
      if (apiKey.trim()) {
        resolve({ apiKey: apiKey.trim(), provider });
      } else {
        console.log('No key entered. Skipping...');
        resolve(null);
      }
    });
  });
}
