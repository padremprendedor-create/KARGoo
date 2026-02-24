# Implementation Plan - Dark Mode Fix for New Trip Flow

## Problem
The user reported that the Dark Mode is not applied correctly in the "New Trip Data Entry Flow" (Steps 1, 2, and 3). Specifically, hardcoded colors like `white` backgrounds and dark text hex codes are causing legibility issues (e.g., light text on light background) and inconsistent theming.

## Objective
Update `NewTripFlow.jsx` to fully support Dark Mode by replacing hardcoded color values with the appropriate CSS variables defined in `index.css`.

## Proposed Changes

### `src/pages/NewTripFlow.jsx`

1.  **Global Page Styles**:
    -   Replace page background `#F9FAFB` with `var(--bg-light)`.
    -   Replace text color `#111827` (headings) with `var(--text-dark)`.
    -   Replace text color `#374151` (secondary text) with `var(--text-medium)`.
    -   Replace text color `#6B7280` (muted text) with `var(--text-light)` or `var(--text-medium)`.

2.  **Header Component**:
    -   Update background to `var(--bg-card)` or `var(--bg-light)`.
    -   Update text colors.

3.  **Step 1: Vehicle Registration**:
    -   Update container backgrounds (e.g., input wrappers) from `'white'` to `'var(--bg-card)'`.
    -   Update input text color to `var(--text-dark)`.
    -   Update icon colors to use variables where appropriate.
    -   Update Camera Button background to `var(--bg-light)` or `var(--bg-card)` with proper border color `var(--border-light)`.

4.  **Step 2: Route Selection**:
    -   Ensure `Card` components receive the correct background style. Currently, some use `style={{ background: 'white' }}` which forces white in dark mode. Change to `var(--bg-card)`.
    -   Update text colors inside cards to use `var(--text-dark)`/`var(--text-medium)`.

5.  **Step 3: Trip Summary (The reported issue)**:
    -   The main summary card has `style={{ background: 'white', ... }}`. Change this to `style={{ background: 'var(--bg-card)', ... }}`.
    -   Verify text inside uses appropriate Tailwind classes or variables. The class `text-gray-900` should automatically switch to light color in dark mode via `index.css`.
    -   Ensure the outer container background is compliant.

6.  **Progress Stepper**:
    -   Update the inactive step color `#E5E7EB` to `var(--border-light)` or `var(--bg-light)` to ensure visibility in dark mode.

## Verification
-   After applying changes, the user should be able to see the "New Trip" flow in Dark Mode with:
    -   Dark backgrounds.
    -   Light text.
    -   Readable inputs.
