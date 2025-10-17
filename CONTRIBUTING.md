# Contributing to LLM Inspector

Thank you for your interest in contributing to LLM Inspector! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- TypeScript knowledge

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/llm-inspector.git
cd llm-inspector
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Link for local testing:
```bash
npm link
```

5. Test on example files:
```bash
llm-inspector examples --no-llm --verbose
```

## Project Structure

```
src/
├── cli.ts                    # Main CLI entry point
├── types.ts                  # TypeScript type definitions
├── scanner/
│   ├── index.ts             # Main scanner orchestrator
│   ├── patterns.ts          # LLM provider patterns
│   └── parsers/
│       ├── javascript.ts    # JS/TS parser
│       ├── python.ts        # Python parser
│       └── generic.ts       # Generic language parser
├── analyzer/
│   ├── confidence.ts        # Confidence scoring
│   └── llm-verifier.ts      # Optional LLM verification
├── output/
│   ├── json.ts              # JSON formatter
│   ├── markdown.ts          # Markdown formatter
│   └── interactive.ts       # Terminal UI
└── config/
    └── manager.ts           # Configuration management
```

## Adding New LLM Providers

To add support for a new LLM provider, edit `src/scanner/patterns.ts`:

```typescript
{
  name: 'NewProvider',
  imports: ['new-provider-sdk', 'from new_provider import'],
  apiCalls: ['NewProvider(', 'newProvider.generate'],
  endpoints: ['/v1/generate'],
  domains: ['api.newprovider.com'],
  envVars: ['NEW_PROVIDER_API_KEY'],
}
```

## Adding Language Support

To add a new language parser:

1. Create a new file in `src/scanner/parsers/`
2. Implement the parser function with signature:
```typescript
export async function parseLanguage(
  content: string,
  filePath: string,
  options: ScanOptions
): Promise<LLMCall[]>
```
3. Update `src/scanner/index.ts` to route to your parser based on file extension

## Code Style

- Use TypeScript strict mode
- Follow existing code formatting
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

## Testing

Before submitting a PR:

1. Test on multiple codebases
2. Test all output formats (json, markdown, interactive)
3. Test with and without LLM verification
4. Ensure no sensitive files are scanned

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Build and test: `npm run build`
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## Pull Request Guidelines

- Describe what changes you made and why
- Reference any related issues
- Include examples or screenshots if relevant
- Ensure the build passes
- Keep PRs focused on a single feature/fix

## Reporting Issues

When reporting issues, please include:

- LLM Inspector version
- Node.js version
- Operating system
- API provider used (if applicable)
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs

## Feature Requests

Feature requests are welcome! Please:

- Check if the feature already exists
- Describe the use case clearly
- Explain why this would be useful
- Provide examples if applicable

## Security

If you discover a security vulnerability, please email [security@example.com] instead of opening an issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue for questions or discussions about contributing.

