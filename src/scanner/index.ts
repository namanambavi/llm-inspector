import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { LLMCall, ScanOptions } from '../types';
import { parseJavaScript } from './parsers/javascript';
import { parsePython } from './parsers/python';
import { parseGeneric } from './parsers/generic';

// Security: Files and directories to ALWAYS exclude
const SECURITY_EXCLUSIONS = [
  '**/.env',
  '**/.env.*',
  '**/node_modules/**',
  '**/.git/**',
  '**/venv/**',
  '**/env/**',
  '**/__pycache__/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/.DS_Store',
];

const SOURCE_FILE_PATTERNS = [
  '**/*.js',
  '**/*.jsx',
  '**/*.ts',
  '**/*.tsx',
  '**/*.py',
  '**/*.java',
  '**/*.go',
  '**/*.rs',
  '**/*.rb',
  '**/*.php',
  '**/*.swift',
  '**/*.kt',
  '**/*.scala',
];

export async function scanDirectory(options: ScanOptions): Promise<LLMCall[]> {
  const allCalls: LLMCall[] = [];
  
  // Find all source files, excluding sensitive directories
  const files = await fg(SOURCE_FILE_PATTERNS, {
    cwd: options.directory,
    absolute: true,
    ignore: SECURITY_EXCLUSIONS,
    dot: false, // Don't include hidden files
  });

  if (options.verbose) {
    console.log(`Found ${files.length} files to scan`);
  }

  // Process files in batches for scalability
  const batchSize = options.maxWorkers || 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(file => scanFile(file, options))
    );
    
    for (const result of batchResults) {
      allCalls.push(...result);
    }

    if (options.verbose && i + batchSize < files.length) {
      console.log(`Processed ${Math.min(i + batchSize, files.length)} / ${files.length} files`);
    }
  }

  return allCalls;
}

async function scanFile(filePath: string, options: ScanOptions): Promise<LLMCall[]> {
  try {
    // Security check: Double-check we're not reading sensitive files
    if (isSensitiveFile(filePath)) {
      return [];
    }

    // Check file size - skip very large files (>5MB)
    const stats = await fs.promises.stat(filePath);
    if (stats.size > 5 * 1024 * 1024) {
      if (options.verbose) {
        console.log(`Skipping large file: ${filePath}`);
      }
      return [];
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath);
    const relativePath = path.relative(options.directory, filePath);

    let calls: LLMCall[] = [];

    // Route to appropriate parser based on file extension
    switch (ext) {
      case '.js':
      case '.jsx':
      case '.ts':
      case '.tsx':
        calls = await parseJavaScript(content, relativePath, options);
        break;
      case '.py':
        calls = await parsePython(content, relativePath, options);
        break;
      default:
        calls = await parseGeneric(content, relativePath, options);
        break;
    }

    return calls;
  } catch (error) {
    // Silently skip files we can't read (permissions, binary files, etc.)
    if (options.verbose) {
      console.log(`Error scanning ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return [];
  }
}

function isSensitiveFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  const normalized = filePath.replace(/\\/g, '/');
  
  // Check for .env files
  if (basename.startsWith('.env')) {
    return true;
  }
  
  // Check for common sensitive file patterns
  const sensitivePatterns = [
    '/node_modules/',
    '/.git/',
    '/venv/',
    '/env/',
    '/__pycache__/',
    '.key',
    '.pem',
    '.cert',
    'secrets',
    'credentials',
  ];
  
  return sensitivePatterns.some(pattern => normalized.includes(pattern));
}

export function getCodeSnippet(content: string, line: number, contextLines: number = 3): string {
  const lines = content.split('\n');
  const startLine = Math.max(0, line - contextLines);
  const endLine = Math.min(lines.length, line + contextLines + 1);
  
  return lines.slice(startLine, endLine).join('\n');
}

