# Testing Guide

This directory contains all tests for the Netra AI web application.

## Test Structure

```
tests/
├── integration/          # Integration tests with React Testing Library
│   ├── compliance-api.test.ts          # API route tests
│   └── compliance-components.test.tsx  # Component tests
├── e2e/                 # End-to-end tests with Playwright
│   └── admin-compliance.spec.ts        # Admin portal E2E tests
├── setup.ts             # Test environment setup
└── README.md            # This file
```

## Running Tests

### Integration Tests (Vitest + React Testing Library)

```bash
# Run all integration tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test tests/integration/compliance-api.test.ts
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e/admin-compliance.spec.ts

# Debug E2E tests
npx playwright test --debug
```

## Test Coverage

### Integration Tests Cover:

1. **API Routes** (`compliance-api.test.ts`)
   - Compliance Dashboard API
   - FDA APM API Proxy
   - IEC 62304 API Proxy
   - SOC 2 API Proxy
   - System Health API
   - Error handling and retries
   - Timeout handling

2. **Components** (`compliance-components.test.tsx`)
   - FDAApmChart component
   - TraceabilityMatrix component
   - SOC2ControlCard component
   - ComplianceAlert component
   - ComplianceScoreCard component
   - User interactions
   - State management

### E2E Tests Cover:

1. **Admin Compliance Dashboard** (`admin-compliance.spec.ts`)
   - Dashboard display
   - Navigation between pages
   - Score cards display
   - Recent alerts
   - Quick actions

2. **FDA APM Monitoring Page**
   - Model performance metrics
   - Time range filtering
   - Alert acknowledgment
   - Alert resolution
   - Report export

3. **IEC 62304 Traceability Page**
   - Traceability matrix display
   - Safety class filtering
   - Requirements search
   - Coverage statistics
   - CSV export
   - Requirement drill-down

4. **SOC 2 Evidence Management Page**
   - Controls display
   - Category filtering
   - Control statistics
   - Evidence collection
   - Control details
   - Report generation

5. **System Health Monitoring**
   - Service status display
   - System metrics
   - Auto-refresh

6. **Navigation and Routing**
   - Page navigation
   - Active navigation highlighting

7. **Error Handling**
   - API errors
   - Network timeouts
   - Request retries

## Writing Tests

### Integration Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '@/app/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should display dashboard', async ({ page }) => {
  await page.goto('/admin/compliance');
  
  await expect(page.locator('h1')).toContainText('Compliance Dashboard');
  await expect(page.locator('text=FDA APM')).toBeVisible();
});
```

## Best Practices

### Integration Tests

1. **Test User Behavior**: Focus on how users interact with components
2. **Mock External Dependencies**: Mock API calls, external services
3. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
4. **Test Accessibility**: Ensure components are accessible
5. **Keep Tests Fast**: Mock heavy operations, avoid real network calls

### E2E Tests

1. **Test Critical Paths**: Focus on most important user journeys
2. **Use Page Objects**: Create reusable page object patterns
3. **Mock External APIs**: Use route mocking for consistent tests
4. **Handle Async Operations**: Use proper waits and assertions
5. **Keep Tests Independent**: Each test should be able to run alone

## Debugging Tests

### Integration Tests

```bash
# Run tests in watch mode
npm run test:watch

# Run with verbose output
npm run test -- --reporter=verbose

# Run specific test
npm run test -- -t "should render correctly"
```

### E2E Tests

```bash
# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Run with UI mode (interactive)
npx playwright test --ui

# Generate test report
npx playwright show-report
```

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run integration tests
  run: npm run test:coverage

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Test Data

Test data is mocked in each test file. For consistent test data:

1. Use factories for creating test objects
2. Keep test data minimal and focused
3. Use realistic but anonymized data
4. Document any special test data requirements

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in test configuration
   - Check for unresolved promises
   - Ensure proper cleanup

2. **Flaky tests**
   - Add proper waits for async operations
   - Mock time-dependent operations
   - Ensure test isolation

3. **Import errors**
   - Check path aliases in config
   - Verify module resolution
   - Check for circular dependencies

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
