# LLM Inspector

A CLI tool that scans codebases to detect and catalog LLM (Large Language Model) API calls. Works with any programming language and detects calls to OpenAI, Anthropic, Google AI, Cohere, and other LLM providers.

## Features

- **Multi-language support**: Scans JavaScript, TypeScript, Python, and other languages
- **Comprehensive detection**: Finds direct API calls, SDK usage, and wrapper frameworks (LangChain, LlamaIndex, etc.)
- **Hybrid approach**: Uses pattern matching with optional AI verification for accuracy
- **Multiple output formats**: JSON, Markdown, or interactive terminal UI
- **Privacy-first**: Never scans .env files or other sensitive data
- **Scalable**: Efficiently handles large codebases with 100,000+ files

## Installation

### Global installation (recommended)

```bash
npm install -g llm-inspector
```

### Using npx (no installation)

```bash
npx llm-inspector [directory]
```

## Usage

### Basic usage

Scan the current directory:
```bash
llm-inspector
```

Scan a specific directory:
```bash
llm-inspector /path/to/your/project
```

### Options

```
llm-inspector [directory] [options]

Options:
  -o, --output <format>      Output format: json, markdown, or interactive (default: interactive)
  -k, --api-key <key>        API key for LLM verification
  -p, --provider <provider>  API provider: openrouter, gemini, or openai (default: openrouter)
  --no-llm                   Skip LLM verification, use pattern matching only
  -v, --verbose              Show detailed scanning progress
  -f, --output-file <path>   Write output to file instead of stdout
  --max-workers <number>     Maximum parallel file processors (default: 10)
  -V, --version              Output the version number
  -h, --help                 Display help for command
```

### Examples

**Interactive mode (default)**
```bash
llm-inspector ./my-project
```

**Export as JSON**
```bash
llm-inspector ./my-project --output json --output-file report.json
```

**Export as Markdown**
```bash
llm-inspector ./my-project --output markdown --output-file report.md
```

**Skip LLM verification (faster, pattern matching only)**
```bash
llm-inspector ./my-project --no-llm
```

**Verbose output**
```bash
llm-inspector ./my-project --verbose
```

## Output Formats

### Interactive

Beautiful terminal UI with summary statistics and a table of all detected calls.

### JSON

Structured JSON output perfect for automation and integration:

```json
{
  "scannedAt": "2025-10-17T...",
  "directory": "/path/to/project",
  "summary": {
    "totalCalls": 15,
    "uniqueModels": ["gpt-4", "claude-3-opus"],
    "uniqueProviders": ["OpenAI", "Anthropic"],
    "fileCount": 8
  },
  "calls": [...]
}
```

### Markdown

Human-readable report with:
- Summary statistics
- Provider and model breakdowns
- Detailed call listings grouped by file
- Code snippets for each detected call

## Supported Providers

- **OpenAI** (GPT-4, GPT-3.5, etc.)
- **Anthropic** (Claude)
- **Google AI** (Gemini, PaLM)
- **Cohere**
- **Hugging Face**
- **OpenRouter**
- **Replicate**
- **Together AI**
- **Azure OpenAI**

Plus support for wrapper frameworks:
- **LangChain**
- **LlamaIndex**
- **Haystack**

## How It Works

1. **Pattern Matching**: Scans source files for known LLM API patterns, SDK imports, and endpoints
2. **Confidence Scoring**: Assigns confidence scores based on multiple factors
3. **LLM Verification** (optional): For uncertain cases, uses an LLM (Gemini 2.0 Flash, GPT-4o-mini, etc.) to verify if code actually contains LLM calls
4. **Results**: Aggregates and presents findings in your chosen format

## Security & Privacy

- **Never scans sensitive files**: Automatically excludes `.env`, `.env.*`, and other credential files
- **Respects .gitignore**: Skips `node_modules`, `venv`, and other ignored directories
- **No content capture**: Only analyzes code patterns, never exposes your actual data
- **API key security**: Stores API keys locally in `~/.llm-inspector/config.json`

## LLM Verification

For cases where the tool is uncertain (confidence 40-80%), you can optionally use LLM verification to improve accuracy.

### Automatic API Key Detection

The tool automatically detects API keys in this order:

1. **Environment Variables** (checked in order):
   - `OPENROUTER_API_KEY` → uses OpenRouter
   - `GEMINI_API_KEY` or `GOOGLE_API_KEY` → uses Google Gemini
   - `OPENAI_API_KEY` → uses OpenAI

2. **Config File**: `~/.llm-inspector/config.json`

3. **Interactive Prompt**: If no key found, prompts you to select a provider and enter key

### Setup Options

**Option 1: Environment Variable (Recommended)**
```bash
# OpenRouter (free tier available)
export OPENROUTER_API_KEY="your_key"

# Google Gemini (free tier available)
export GEMINI_API_KEY="your_key"

# OpenAI
export OPENAI_API_KEY="your_key"
```

**Option 2: Command Line**
```bash
llm-inspector --api-key your_key --provider openrouter
llm-inspector --api-key your_key --provider gemini
llm-inspector --api-key your_key --provider openai
```

**Option 3: Interactive Prompt**
Just run the tool and it will prompt you if no key is found.

### Get Free API Keys

- **OpenRouter**: https://openrouter.ai/keys (free tier, uses Gemini 2.0 Flash)
- **Google Gemini**: https://makersuite.google.com/app/apikey (free tier)
- **OpenAI**: https://platform.openai.com/api-keys (paid)

### Skip Verification

If you prefer not to use AI verification:
```bash
llm-inspector --no-llm
```

This uses only pattern matching, which is still highly accurate for most cases.

## Development

### Build from source

```bash
git clone https://github.com/yourusername/llm-inspector.git
cd llm-inspector
npm install
npm run build
npm link
```

### Run in development mode

```bash
npm run dev  # Watches for changes
node dist/cli.js /path/to/test/project
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

