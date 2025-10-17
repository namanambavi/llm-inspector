import { LLMCall, ScanOptions } from '../../types';
import { matchPattern, extractModelFromCode, LLM_PROVIDERS } from '../patterns';
import { getCodeSnippet } from '../index';
import { calculateConfidence } from '../../analyzer/confidence';

export async function parsePython(
  content: string,
  filePath: string,
  options: ScanOptions
): Promise<LLMCall[]> {
  const calls: LLMCall[] = [];
  const lines = content.split('\n');
  const imports = new Set<string>();

  // First pass: collect imports
  lines.forEach(line => {
    if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
      const match = line.match(/(?:import|from)\s+([a-zA-Z0-9_\.]+)/);
      if (match) {
        imports.add(match[1]);
      }
    }
  });

  // Second pass: find LLM calls
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const matches = matchPattern(line, lineNumber);

    if (matches.length > 0) {
      const snippet = getCodeSnippet(content, index);
      const confidence = calculateConfidence(matches, imports, snippet);

      if (confidence >= 40) {
        const bestMatch = matches.reduce((prev, current) =>
          current.confidence > prev.confidence ? current : prev
        );

        const model = extractModelFromCode(snippet);

        calls.push({
          file: filePath,
          line: lineNumber,
          provider: bestMatch.provider,
          model,
          confidence,
          codeSnippet: snippet,
          method: bestMatch.type === 'import' ? 'wrapper' :
                  bestMatch.type === 'endpoint' ? 'http' : 'sdk',
        });
      }
    }

    // Check for requests library calls to LLM endpoints
    if (line.includes('requests.post') || line.includes('requests.get') ||
        line.includes('httpx.post') || line.includes('aiohttp')) {
      
      // Look for URL in the next few lines
      const contextLines = lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 5));
      const context = contextLines.join('\n');

      for (const provider of LLM_PROVIDERS) {
        if (
          provider.domains.some(domain => context.includes(domain)) ||
          provider.endpoints.some(endpoint => context.includes(endpoint))
        ) {
          const snippet = getCodeSnippet(content, index);
          const model = extractModelFromCode(snippet);

          calls.push({
            file: filePath,
            line: lineNumber,
            provider: provider.name,
            model,
            confidence: 80,
            codeSnippet: snippet,
            method: 'http',
          });
          break;
        }
      }
    }
  });

  return calls;
}

