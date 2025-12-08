# Testing Guide

## Running Tests

### Run all tests once (CI mode)
```bash
npm test
```

### Run tests in watch mode (development)
```bash
npm run test:watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Structure

Tests are located in:
- `src/components/__tests__/` - Component tests
- `src/services/__tests__/` - Service tests

## Test Files

### Component Tests
- `AddGameCard.test.jsx` - Tests for AddGameCard component
- `AddGameModal.test.jsx` - Tests for AddGameModal component
- `GameCard.test.jsx` - Tests for GameCard component
- `Loading.test.jsx` - Tests for Loading component
- `ErrorBoundary.test.jsx` - Tests for ErrorBoundary component

### Service Tests
- `storage.test.js` - Tests for storage service (SessionStorage, DatabaseStorage)

## Writing Tests

### Example Component Test
```javascript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Example Service Test
```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { MyService } from '../MyService'

describe('MyService', () => {
  beforeEach(() => {
    // Setup before each test
  })

  it('does something', async () => {
    const result = await MyService.doSomething()
    expect(result).toBe(expected)
  })
})
```

## Test Configuration

Tests are configured in `vitest.config.js`:
- Environment: `jsdom` (for DOM testing)
- Setup file: `src/test/setup.js`
- Coverage provider: `v8`

## Coverage

Coverage reports are generated in:
- `coverage/` directory (after running `npm run test:coverage`)
- HTML report: `coverage/index.html`
- Text summary in terminal

## CI/CD Integration

For CI/CD pipelines, use:
```bash
npm test
```

This runs tests once and exits with the appropriate exit code.

