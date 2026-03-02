---
name: vitest_unit_testing
description: Skill for writing and running unit tests using Vitest and React Testing Library in KARGoo.
---

# Vitest Unit Testing Skill

This skill contains guidelines and best practices for writing and executing unit tests in the KARGoo project using Vitest.

## 1. Commands for Running Tests

To execute tests via the command line, use the following commands:
- **Run all tests once:** `npm run test -- --run`
- **Run tests in watch mode:** `npm run test`
- **Run tests for a specific file:** `npm run test -- [filename] --run`
- **Open visual test UI dashboard:** `npm run test:ui`

## 2. Guidelines for Writing Tests

All test files must reside alongside the component or utility they are testing, matching its filename plus the `.test.jsx` or `.test.js` suffix.

### Boilerplate Imports
Always import testing utilities correctly:
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
```

### Component Testing (React Testing Library)
- **Render component**: `render(<MyComponent {...props} />)`
- **Query elements**: Prefer `screen.getByText()`, `screen.getByRole()`, `screen.getByPlaceholderText()`, or `screen.getByTestId()`.
- **Interactions**: Use `fireEvent.click()`, `fireEvent.change()`, etc., to mock user interactions.
- **Mock Functions**: When testing callbacks like `onClick` or `onSubmit`, always mock them using `const mockFn = vi.fn();`.

### Useful Assertions (`@testing-library/jest-dom`)
Since `setup.js` imports jest-dom matchers, you have access to helpful DOM assertions:
- `.toBeInTheDocument()`: Verifies if an element is present in the DOM.
- `.toBeDisabled()`: Verifies if an input/button is disabled.
- `.toHaveClass('_className_')`: Verifies if an element has a specific class.
- `.toHaveBeenCalledTimes(1)`: Verifies if a mocked function was executed a specific number of times.

## 3. Best Practices & KARGoo Context

- **Test Behavior, Not Implementation**: Focus tests on the expected outcomes from the user perspective (e.g., clicking a button shows a modal) rather than testing internal React states.
- **Edge Cases**: Ensure to always include test cases for the "unhappy paths", such as when data is empty, or a button is disabled.
- **KARGoo specifics**: When testing components reliant on `supabaseClient`, consider mocking the `supabase` import if making specific db network requests is not desired, utilizing `vi.mock('../../supabaseClient')`.
