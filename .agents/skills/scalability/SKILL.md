---
name: scalability_and_resilience
description: Guidelines and patterns for building a scalable, resilient, and maintainable application in KARGoo. Automatically active when reviewing architecture, adding new features, or troubleshooting complex flows.
---

# Scalability & Resilience Guidelines

These guidelines ensure the KARGoo application scales healthily, remains resilient under failure, and is easy to maintain as the codebase and user base grow. Keep these principles in mind when developing new features or refactoring existing ones.

## 1. Non-Blocking Secondary Operations (Graceful Degradation)

When implementing a feature, identify the **primary action** (critical path) and **secondary actions** (non-critical tasks like logging, analytics, or non-essential notifications).

- **Rule:** Secondary actions must never block or crash the primary action.
- **Pattern:** Use `await` for the primary action with a strict `try/catch`. 
- **Implementation:** For secondary actions (like writing to `driver_interactions`), catch the error independently and log it (e.g., `console.warn`) without throwing it up to the main try/catch block.

```javascript
// ✅ GOOD: Secondary action failure does not block the primary operation
try {
    // 1. Primary Action (Critical)
    const { error: mainError } = await supabase.from('core_table').insert(data);
    if (mainError) throw mainError;

    // 2. Secondary Action (Non-Critical Logging)
    const { error: logError } = await supabase.from('interaction_logs').insert(logData);
    if (logError) {
        // Only warn. The core action was successful. Do not throw.
        console.warn('Silent log failure:', logError.message);
    }

    alert('Operación principal exitosa');
} catch (err) {
    // Only handles real, critical failures
    alert('Error en la operación principal');
}
```

## 2. Decoupled Error Handling

Errors should be isolated by domain so the user gets specific, helpful feedback, and the system knows exactly what layer failed.

- **Rule:** Differentiate between Storage errors, Database constraints, and Authentication errors before surfacing them.
- **Pattern:** Handle errors immediately after the specific `.upload()` or `.insert()` call, throwing domain-specific Error objects or messages.

## 3. Predictable UI State & Optimistic Updates

The UI should behave predictably based on local state before or immediately after server acknowledgement, preventing redundant network requests.

- **Rule:** Disable interactive elements (buttons, forms) immediately upon successful completion or during processing (`loading` states) to prevent double-submissions.
- **Pattern:** Depend on boolean flags derived from the server state or updated via local callbacks.
- **Example:** Once an upload succeeds, immediately set a local flag (`setActionDone(true)`) to disable the submit button, even before re-fetching the entire dataset.

## 4. Front-end Validation as a First Line of Defense

Always validate preconditions locally before hitting the backend (Supabase). This protects the database from unnecessary load and provides instant feedback to the user.

- **Rule:** Never attempt an authenticated request if the user session is missing.
- **Implementation:**
  ```javascript
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuario no autenticado");
  ```

## 5. Database Defaults and Triggers over Client Logic

When dealing with relational integrity or default states (like creating a profile on signup, or setting timestamps), push the logic to the Database layer (PostgreSQL) rather than relying on the client applications to always do the right thing.

- **Rule:** Use Postgres triggers (e.g., `ON INSERT TO auth.users`) for critical infrastructural constraints.
- **Benefit:** If a user is created via the admin dashboard, mobile app, or web app, the database constraint protects the integrity uniformly.

## 6. Unit Testing the User Flow

Tests should verify how the user interacts with the app, not how the code is implemented internally.

- **Rule:** Write tests mapping precisely to user behaviors (e.g., "Clicking X disables Y") and ensure "unhappy paths" (errors, API failures) are covered extensively using `vitest` and `@testing-library/react`.
- **Reference:** See the `vitest_unit_testing` skill for implementation details.
