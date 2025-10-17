import { ScanResult } from '../types';
import chalk from 'chalk';

export function outputInteractive(result: ScanResult): void {
  // For simpler implementation without JSX compilation issues,
  // we'll use console output with chalk for formatting
  
  console.log(chalk.bold.underline('\nLLM Inspector Results\n'));
  
  console.log(`${chalk.gray('Scanned:')} ${new Date(result.scannedAt).toLocaleString()}`);
  console.log(`${chalk.gray('Directory:')} ${result.directory}\n`);
  
  console.log(chalk.bold('Summary:'));
  console.log(`  Total Calls: ${chalk.cyan(result.summary.totalCalls)}`);
  console.log(`  Files with Calls: ${chalk.cyan(result.summary.fileCount)}`);
  console.log(`  Unique Providers: ${chalk.cyan(result.summary.uniqueProviders.join(', '))}`);
  console.log(`  Unique Models: ${chalk.cyan(result.summary.uniqueModels.join(', ') || 'None detected')}\n`);
  
  if (result.calls.length > 0) {
    console.log(chalk.bold('Detected LLM Calls:\n'));
    
    // Create a formatted table
    const tableData = result.calls.map((call, index) => {
      const shortFile = call.file.length > 50 ? '...' + call.file.slice(-47) : call.file;
      return {
        '#': (index + 1).toString(),
        'File': shortFile,
        'Line': call.line.toString(),
        'Provider': call.provider,
        'Model': call.model || 'N/A',
        'Confidence': `${call.confidence}%`,
        'Method': call.method,
      };
    });
    
    // Simple table formatting
    console.log(chalk.gray('─'.repeat(120)));
    console.log(
      chalk.bold('#'.padEnd(5)) +
      chalk.bold('File'.padEnd(52)) +
      chalk.bold('Line'.padEnd(8)) +
      chalk.bold('Provider'.padEnd(18)) +
      chalk.bold('Model'.padEnd(25)) +
      chalk.bold('Conf'.padEnd(8)) +
      chalk.bold('Method')
    );
    console.log(chalk.gray('─'.repeat(120)));
    
    tableData.forEach(row => {
      console.log(
        row['#'].padEnd(5) +
        row['File'].padEnd(52) +
        row['Line'].padEnd(8) +
        row['Provider'].padEnd(18) +
        row['Model'].padEnd(25) +
        chalk.cyan(row['Confidence']).padEnd(8 + 9) + // +9 for ANSI codes
        row['Method']
      );
    });
    
    console.log(chalk.gray('─'.repeat(120)));
  } else {
    console.log(chalk.yellow('\nNo LLM calls detected in this codebase.'));
  }
  
  console.log(chalk.gray('\nTip: Use --output json or --output markdown for exportable formats\n'));
}

