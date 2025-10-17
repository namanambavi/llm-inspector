import { LLMCall, ScanOptions } from '../../types';
import { matchPattern, extractModelFromCode, LLM_PROVIDERS } from '../patterns';
import { getCodeSnippet } from '../index';
import { calculateConfidence } from '../../analyzer/confidence';

export async function parseGeneric(
  content: string,
  filePath: string,
  options: ScanOptions
): Promise<LLMCall[]> {
  const calls: LLMCall[] = [];
  const lines = content.split('\n');
  const imports = new Set<string>();

  // Collect potential imports from any language
  lines.forEach(line => {
    const trimmed = line.trim();
    if (
      trimmed.includes('import ') ||
      trimmed.includes('require(') ||
      trimmed.includes('use ') ||
      trimmed.includes('include ')
    ) {
      // Extract potential package names
      const match = trimmed.match(/['"]([^'"]+)['"]/);
      if (match) {
        imports.add(match[1]);
      }
    }
  });

  // Find LLM-related patterns
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const matches = matchPattern(line, lineNumber);

    if (matches.length > 0) {
      const snippet = getCodeSnippet(content, index);
      const confidence = calculateConfidence(matches, imports, snippet);

      // Higher threshold for generic parser to reduce false positives
      if (confidence >= 60) {
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
          method: bestMatch.type === 'endpoint' ? 'http' : 'sdk',
        });
      }
    }

    // Look for HTTP calls to known LLM domains
    const httpPatterns = [
      /https?:\/\/[^\s'"]+/g,
    ];

    for (const pattern of httpPatterns) {
      const urlMatches = line.match(pattern);
      if (urlMatches) {
        for (const url of urlMatches) {
          for (const provider of LLM_PROVIDERS) {
            if (
              provider.domains.some(domain => url.includes(domain)) ||
              provider.endpoints.some(endpoint => url.includes(endpoint))
            ) {
              const snippet = getCodeSnippet(content, index);
              const model = extractModelFromCode(snippet);

              calls.push({
                file: filePath,
                line: lineNumber,
                provider: provider.name,
                model,
                endpoint: url,
                confidence: 75,
                codeSnippet: snippet,
                method: 'http',
              });
              break;
            }
          }
        }
      }
    }
  });

  return calls;
}

