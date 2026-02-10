# Contributing to claude-sync

Thank you for your interest in contributing to claude-sync!

## Development Setup

1. Fork the repository
2. Clone your fork
   ```bash
   git clone https://github.com/your-username/claude-sync.git
   cd claude-sync
   ```
3. Install dependencies
   ```bash
   npm install
   ```
4. Create a feature branch
   ```bash
   git checkout -b feature/my-feature
   ```

## Running in Development

```bash
# Build TypeScript
npm run build

# Watch for changes
npm run dev

# Run the CLI directly
npm start -- --help

# Link for local testing
npm link
claude-sync --help
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Use async/await for asynchronous code
- Add JSDoc comments for exported functions
- Run `npm run build` before committing to check for errors

## Project Structure

```
src/
├── commands/       # CLI command implementations
├── core/           # Core business logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── index.ts        # Main entry point
```

## Submitting Changes

1. Update tests if applicable
2. Update documentation if needed
3. Ensure all tests pass
4. Commit your changes with a clear message
5. Push to your fork
6. Create a pull request

## Pull Request Guidelines

- Describe what your PR does
- Reference any related issues
- Include screenshots for UI changes if applicable
- Ensure CI passes

## Questions?

Feel free to open an issue with the "question" label.
