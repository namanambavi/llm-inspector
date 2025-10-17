import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { LLMCall, ScanOptions } from '../../types';
import { matchPattern, extractModelFromCode, LLM_PROVIDERS } from '../patterns';
import { getCodeSnippet } from '../index';
import { calculateConfidence } from '../../analyzer/confidence';

export async function parseJavaScript(
  content: string,
  filePath: string,
  options: ScanOptions
): Promise<LLMCall[]> {
  const calls: LLMCall[] = [];

  try {
    // Parse the file as JavaScript/TypeScript
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });

    // Track imports to understand context
    const imports = new Set<string>();

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        imports.add(source);
      },
      
      CallExpression(path) {
        const loc = path.node.loc;
        if (!loc) return;

        const line = loc.start.line;
        const column = loc.start.column;
        
        // Get surrounding code for context
        const snippet = getCodeSnippet(content, line - 1);
        
        // Check if this looks like an LLM call
        const matches = matchPattern(snippet, line);
        
        if (matches.length > 0) {
          const bestMatch = matches.reduce((prev, current) => 
            current.confidence > prev.confidence ? current : prev
          );
          
          const model = extractModelFromCode(snippet);
          const confidence = calculateConfidence(matches, imports, snippet);
          
          // Only report if confidence is above threshold
          if (confidence >= 40) {
            calls.push({
              file: filePath,
              line,
              column,
              provider: bestMatch.provider,
              model,
              confidence,
              codeSnippet: snippet,
              method: bestMatch.type === 'import' ? 'wrapper' : 
                      bestMatch.type === 'endpoint' ? 'http' : 'sdk',
            });
          }
        }
        
        // Check for fetch/axios calls to LLM endpoints
        const callee = path.node.callee;
        if (
          (callee.type === 'Identifier' && callee.name === 'fetch') ||
          (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            ['axios', 'http', 'https'].includes(callee.object.name))
        ) {
          // Check if URL contains LLM endpoint
          const args = path.node.arguments;
          if (args.length > 0 && args[0].type === 'StringLiteral') {
            const url = args[0].value;
            
            for (const provider of LLM_PROVIDERS) {
              if (
                provider.domains.some(domain => url.includes(domain)) ||
                provider.endpoints.some(endpoint => url.includes(endpoint))
              ) {
                const snippet = getCodeSnippet(content, line - 1);
                const model = extractModelFromCode(snippet);
                
                calls.push({
                  file: filePath,
                  line,
                  column,
                  provider: provider.name,
                  model,
                  endpoint: url,
                  confidence: 85,
                  codeSnippet: snippet,
                  method: 'http',
                });
                break;
              }
            }
          }
        }
      },
    });
  } catch (error) {
    // If parsing fails, fall back to pattern matching
    if (options.verbose) {
      console.log(`Failed to parse ${filePath}, using pattern matching`);
    }
    return parseGenericFallback(content, filePath);
  }

  return calls;
}

function parseGenericFallback(content: string, filePath: string): LLMCall[] {
  const calls: LLMCall[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const matches = matchPattern(line, index + 1);
    
    if (matches.length > 0) {
      const bestMatch = matches.reduce((prev, current) => 
        current.confidence > prev.confidence ? current : prev
      );
      
      if (bestMatch.confidence >= 70) {
        const snippet = getCodeSnippet(content, index);
        const model = extractModelFromCode(snippet);
        
        calls.push({
          file: filePath,
          line: index + 1,
          provider: bestMatch.provider,
          model,
          confidence: bestMatch.confidence,
          codeSnippet: snippet,
          method: bestMatch.type === 'endpoint' ? 'http' : 'sdk',
        });
      }
    }
  });

  return calls;
}

