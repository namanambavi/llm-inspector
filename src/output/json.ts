import * as fs from 'fs';
import * as path from 'path';
import { ScanResult } from '../types';

export async function outputJSON(result: ScanResult, outputPath?: string): Promise<void> {
  const json = JSON.stringify(result, null, 2);

  if (outputPath) {
    await fs.promises.writeFile(outputPath, json, 'utf-8');
    console.log(`Results written to ${outputPath}`);
  } else {
    console.log(json);
  }
}

export function formatJSONResult(
  directory: string,
  calls: any[]
): ScanResult {
  const uniqueModels = [...new Set(calls.map(c => c.model).filter(Boolean))];
  const uniqueProviders = [...new Set(calls.map(c => c.provider))];
  const uniqueFiles = [...new Set(calls.map(c => c.file))];

  return {
    scannedAt: new Date().toISOString(),
    directory,
    summary: {
      totalCalls: calls.length,
      uniqueModels,
      uniqueProviders,
      fileCount: uniqueFiles.length,
      filesScanned: uniqueFiles.length,
    },
    calls,
  };
}

