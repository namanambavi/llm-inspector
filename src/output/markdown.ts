import * as fs from 'fs';
import { LLMCall, ScanResult } from '../types';

export async function outputMarkdown(result: ScanResult, outputPath?: string): Promise<void> {
  const md = generateMarkdown(result);

  if (outputPath) {
    await fs.promises.writeFile(outputPath, md, 'utf-8');
    console.log(`Results written to ${outputPath}`);
  } else {
    console.log(md);
  }
}

function generateMarkdown(result: ScanResult): string {
  let md = `# LLM Inspector Report\n\n`;
  md += `**Scanned:** ${new Date(result.scannedAt).toLocaleString()}\n`;
  md += `**Directory:** \`${result.directory}\`\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total LLM Calls | ${result.summary.totalCalls} |\n`;
  md += `| Files with Calls | ${result.summary.fileCount} |\n`;
  md += `| Unique Providers | ${result.summary.uniqueProviders.length} |\n`;
  md += `| Unique Models | ${result.summary.uniqueModels.length} |\n\n`;

  // Provider breakdown
  if (result.summary.uniqueProviders.length > 0) {
    md += `## Providers Used\n\n`;
    const providerCounts = new Map<string, number>();
    result.calls.forEach(call => {
      providerCounts.set(call.provider, (providerCounts.get(call.provider) || 0) + 1);
    });

    md += `| Provider | Count |\n`;
    md += `|----------|-------|\n`;
    [...providerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([provider, count]) => {
        md += `| ${provider} | ${count} |\n`;
      });
    md += `\n`;
  }

  // Model breakdown
  if (result.summary.uniqueModels.length > 0) {
    md += `## Models Used\n\n`;
    const modelCounts = new Map<string, number>();
    result.calls.forEach(call => {
      if (call.model) {
        modelCounts.set(call.model, (modelCounts.get(call.model) || 0) + 1);
      }
    });

    md += `| Model | Count |\n`;
    md += `|-------|-------|\n`;
    [...modelCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([model, count]) => {
        md += `| ${model} | ${count} |\n`;
      });
    md += `\n`;
  }

  // Group calls by file
  md += `## Detected Calls by File\n\n`;
  const callsByFile = new Map<string, LLMCall[]>();
  result.calls.forEach(call => {
    if (!callsByFile.has(call.file)) {
      callsByFile.set(call.file, []);
    }
    callsByFile.get(call.file)!.push(call);
  });

  [...callsByFile.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([file, calls]) => {
      md += `### \`${file}\`\n\n`;
      md += `Found ${calls.length} call${calls.length === 1 ? '' : 's'}:\n\n`;

      calls.forEach((call, index) => {
        md += `#### ${index + 1}. Line ${call.line}\n\n`;
        md += `- **Provider:** ${call.provider}\n`;
        if (call.model) md += `- **Model:** ${call.model}\n`;
        if (call.endpoint) md += `- **Endpoint:** \`${call.endpoint}\`\n`;
        md += `- **Method:** ${call.method}\n`;
        md += `- **Confidence:** ${call.confidence}%\n\n`;
        md += `**Code:**\n\`\`\`\n${call.codeSnippet}\n\`\`\`\n\n`;
      });
    });

  return md;
}

