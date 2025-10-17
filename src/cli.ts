#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import ora from 'ora';
import chalk from 'chalk';
import { scanDirectory } from './scanner';
import { ScanOptions, LLMCall } from './types';
import { getApiKey, setApiKey, promptForApiKey } from './config/manager';
import { needsLLMVerification } from './analyzer/confidence';
import { batchVerify } from './analyzer/llm-verifier';
import { formatJSONResult, outputJSON } from './output/json';
import { outputMarkdown } from './output/markdown';
import { outputInteractive } from './output/interactive';

const program = new Command();

program
  .name('llm-inspector')
  .description('Scan codebases to detect and catalog LLM API calls')
  .version('1.0.0')
  .argument('[directory]', 'Directory to scan', process.cwd())
  .option('-o, --output <format>', 'Output format: json, markdown, or interactive', 'interactive')
  .option('-k, --api-key <key>', 'API key for LLM verification')
  .option('-p, --provider <provider>', 'API provider: openrouter, gemini, or openai', 'openrouter')
  .option('--no-llm', 'Skip LLM verification, use pattern matching only')
  .option('-v, --verbose', 'Show detailed scanning progress', false)
  .option('-f, --output-file <path>', 'Write output to file instead of stdout')
  .option('--max-workers <number>', 'Maximum parallel file processors', '10')
  .action(async (directory: string, options) => {
    try {
      await runScan(directory, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

async function runScan(directory: string, cmdOptions: any) {
  const spinner = ora('Initializing scan...').start();

  // Validate directory
  const targetDir = path.resolve(directory);
  if (!fs.existsSync(targetDir)) {
    spinner.fail(`Directory not found: ${targetDir}`);
    process.exit(1);
  }

  if (!fs.statSync(targetDir).isDirectory()) {
    spinner.fail(`Not a directory: ${targetDir}`);
    process.exit(1);
  }

  spinner.text = 'Scanning codebase for LLM calls...';

  const scanOptions: ScanOptions = {
    directory: targetDir,
    outputFormat: cmdOptions.output,
    apiProvider: cmdOptions.provider,
    useLLM: cmdOptions.llm !== false,
    verbose: cmdOptions.verbose,
    maxWorkers: parseInt(cmdOptions.maxWorkers, 10),
  };

  // Scan files
  let calls: LLMCall[] = [];
  
  try {
    calls = await scanDirectory(scanOptions);
    spinner.succeed(`Scan complete. Found ${calls.length} potential LLM calls.`);
  } catch (error) {
    spinner.fail('Scan failed');
    throw error;
  }

  // LLM verification for uncertain cases
  if (scanOptions.useLLM && calls.length > 0) {
    const uncertainCalls = calls.filter(call => needsLLMVerification(call.confidence));

    if (uncertainCalls.length > 0) {
      spinner.start(`Verifying ${uncertainCalls.length} uncertain calls with LLM...`);

      // Get API key and provider
      let apiKey = cmdOptions.apiKey;
      let provider = cmdOptions.provider;

      if (!apiKey) {
        const keyData = await getApiKey();
        apiKey = keyData.apiKey;
        provider = keyData.provider || provider;
      }

      if (!apiKey) {
        spinner.stop();
        console.log('');
        const result = await promptForApiKey();

        if (result) {
          apiKey = result.apiKey;
          provider = result.provider;
          spinner.start('Saving API key...');
          await setApiKey(apiKey, provider);
          spinner.succeed('API key saved');
        } else {
          console.log(chalk.yellow('Skipping LLM verification. Results may be less accurate.'));
        }
      }

      if (apiKey) {
        try {
          spinner.start(`Verifying with ${provider} (this may take a moment)...`);
          
          const verificationRequests = uncertainCalls.map(call => ({
            file: call.file,
            line: call.line,
            codeSnippet: call.codeSnippet,
          }));

          const results = await batchVerify(verificationRequests, apiKey, provider as any);

          // Update calls with verification results
          calls = calls.map(call => {
            const key = `${call.file}:${call.line}`;
            const verification = results.get(key);

            if (verification && verification.isLLMCall) {
              return {
                ...call,
                confidence: Math.max(call.confidence, verification.confidence),
                provider: verification.provider || call.provider,
                model: verification.model || call.model,
              };
            } else if (verification && !verification.isLLMCall) {
              // Filter out false positives
              return null;
            }

            return call;
          }).filter(Boolean) as LLMCall[];

          spinner.succeed(`LLM verification complete`);
        } catch (error) {
          spinner.warn('LLM verification failed, proceeding with pattern matching only');
          if (cmdOptions.verbose) {
            console.log(chalk.dim(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        }
      }
    }
  }

  // Sort calls by file and line
  calls.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });

  // Generate result
  const result = formatJSONResult(targetDir, calls);

  // Output results
  console.log('');
  
  if (calls.length === 0) {
    console.log(chalk.yellow('No LLM calls detected in this codebase.'));
    return;
  }

  // Always show interactive first if it's the default
  if (scanOptions.outputFormat === 'interactive' && !cmdOptions.outputFile) {
    outputInteractive(result);
    
    // Ask if user wants to export
    const shouldExport = await promptForExport();
    if (shouldExport) {
      const { format, file } = shouldExport;
      console.log(`\nExporting as ${format}...`);
      
      if (format === 'json') {
        await outputJSON(result, file);
      } else if (format === 'markdown') {
        await outputMarkdown(result, file);
      }
    }
  } else {
    // Direct output as specified
    switch (scanOptions.outputFormat) {
      case 'json':
        await outputJSON(result, cmdOptions.outputFile);
        break;
      case 'markdown':
        await outputMarkdown(result, cmdOptions.outputFile);
        break;
      case 'interactive':
      default:
        if (cmdOptions.outputFile) {
          console.log(chalk.yellow('Warning: --output-file is ignored in interactive mode'));
        }
        outputInteractive(result);
        break;
    }
  }
}

async function promptForExport(): Promise<{ format: 'json' | 'markdown'; file: string } | null> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\nExport results? (j=json, m=markdown, n=no) [n]: ', (answer: string) => {
      const choice = answer.trim().toLowerCase();
      
      if (choice === 'j' || choice === 'json') {
        rl.question('Output filename [llm-report.json]: ', (filename: string) => {
          rl.close();
          resolve({
            format: 'json',
            file: filename.trim() || 'llm-report.json'
          });
        });
      } else if (choice === 'm' || choice === 'markdown') {
        rl.question('Output filename [llm-report.md]: ', (filename: string) => {
          rl.close();
          resolve({
            format: 'markdown',
            file: filename.trim() || 'llm-report.md'
          });
        });
      } else {
        rl.close();
        resolve(null);
      }
    });
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nScan interrupted by user');
  process.exit(0);
});

program.parse();

