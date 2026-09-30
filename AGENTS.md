# AGENTS.md — Engineering Guidelines, Conventions & Testing Standards

This document establishes the binding architectural standards, coding conventions, security protocols, and testing requirements for all human and AI software engineers contributing to **TaskPulse Pro**.

---

## 1. Core Architecture & Design Philosophy

1. **Separation of Concerns**:
   - **Backend API (`server.ts`, `server/`)**: Pure RESTful API service mounted with Express, handling validation, sanitization, business logic, and data persistence.
   - **Frontend UI (`src/`)**: Component-driven SPA leveraging React 19, Tailwind CSS v4, and modern hooks. UI components must remain decoupled from HTTP transport.
   - **Utilities (`src/utils/`, `server/utils/`)**: Pure, side-effect-free helper functions for hashing, sanitization, date formatting, and schema validation.

2. **Universal Design Constitution & Anti-Slop Rules**:
   - **Zero-Pill Discipline**: Metadata (tags, dates, statuses, durations) must never be enclosed in rounded pill chips or candy capsules. Use clean, unboxed text separated by typographic dots (`·`).
   - **Top Bar Contract**: Exactly 3 zones: Brand mark (single text element), primary views navigation, and essential actions.
   - **Single-Elevation Depth**: Surfaces use subtle hairline borders (`border-neutral-200 dark:border-neutral-800`), avoiding nested cards.
   - **Tabular Numerals**: Every number, counter, timestamp, and percentage must enforce tabular figures (`tabular-nums font-mono`).
   - **No Hallucinated Clutter**: Prohibit fake version engines, decorative line-prefix comment syntax (`// 01 ARCHITECTURE`), or fabricated telemetry tickers.

---

## 2. Coding Rules & TypeScript Conventions

1. **TypeScript Strictness**:
   - No `any` types unless strictly bounded and guarded immediately.
   - All shared domain models must reside in `/src/types/` or `/server/types/` and be exported with standard TypeScript types/interfaces.
   - Explicit return types for public functions, API route handlers, and utility helpers.

2. **Standard API Response Format**:
   All API endpoints must return a standardized JSON envelope:
   ```typescript
   interface ApiResponse<T = unknown> {
     success: boolean;
     data?: T;
     error?: string;
     code?: string;
     timestamp: string;
   }
   ```

3. **HTTP Status Code Precision**:
   - `200 OK`: Successful read/update/delete.
   - `201 Created`: Resource successfully created.
   - `400 Bad Request`: Validation failure, missing required fields, or malformed JSON.
   - `404 Not Found`: Target resource does not exist.
   - `422 Unprocessable Entity`: Semantic validation failure.
   - `500 Internal Server Error`: Unhandled server exception (never leak stack traces in production).

---

## 3. Security Compliance Mandates

1. **Input Sanitization & XSS Neutralization**:
   - All string fields from requests (`body`, `query`, `params`) must pass through the sanitization engine before business logic.
   - Strip `<script>`, `<iframe>`, `javascript:`, `onerror=`, `onload=`, and dangerous HTML tags.
   - Enforce hard length limits:
     - Task Title: Max 200 characters.
     - Description / Notes: Max 1000 characters.
     - Subtask Title: Max 150 characters.
     - Tags: Max 10 tags, 30 characters each.

2. **Prototype Pollution Guard**:
   - Every incoming JSON object must be checked for forbidden keys: `__proto__`, `constructor`, `prototype`.
   - Never use `Object.assign()` or spread operators on untrusted objects without sanitization.

3. **Tamper-Proof Data Integrity**:
   - Backups, sync packages, and audit payloads must include cryptographic/dual-mix checksums to detect data alteration.

4. **HTTP Header Hardening**:
   - Production servers and CDN configurations (`vercel.json`) must enforce:
     - `Content-Security-Policy`
     - `X-Frame-Options: SAMEORIGIN`
     - `X-Content-Type-Options: nosniff`
     - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 4. API Testing & Validation Requirements (MANDATORY)

> **Golden Rule**: **Write tests for all the endpoints that you create and always validate that these endpoints are working.** Any commit or agent intervention that introduces or modifies an API route without matching passing automated tests is strictly non-compliant.

**Every API endpoint created must have automated test suites covering:**

1. **Happy Path Execution**:
   - Successful status code (`200 OK` or `201 Created`).
   - Expected data schema, types, and envelope matching `ApiResponse<T>`.

2. **Input Validation & Boundary Testing**:
   - Missing required fields rejection (`400 Bad Request`).
   - Invalid types, enum violations, and negative or out-of-range values.
   - String truncation or rejection for inputs exceeding maximum bounds.

3. **Security Fuzzing & Malicious Payload Neutralization**:
   - XSS injection attempts (`<script>`, `<img onerror>`, etc.) must be sanitized or stripped.
   - Prototype pollution payloads must be blocked without mutating JavaScript base objects.

4. **Idempotence & State Verification**:
   - Creating a resource must persist it in storage.
   - Deleting a non-existent resource must return `404 Not Found`.
   - Updating fields must only modify the targeted resource.

5. **Test Automation Command**:
   - All tests must run via `npm test` (`tsx --test tests/**/*.test.ts`).
   - CI/CD pipelines must halt if any test fails.

---

## 5. Error Handling & Resilience Protocols

1. **Graceful Degradation**:
   - Storage failures (e.g., localStorage quota exceeded, network disconnect) must never crash the UI; fallback to memory state and alert the user cleanly.
   - External API or backend errors must surface descriptive user-facing messages through non-blocking toast notifications.

2. **No Stack Trace Leaks**:
   - Unhandled exceptions must be caught by global Express error middleware (`server/app.ts`) and rendered as `{ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }` without leaking internal file paths or stack traces.

3. **Optimistic Updates with Rollback**:
   - Frontend state updates should be optimistic for immediate perceived speed, but must rollback to previous state if the corresponding API request fails.

---

## 6. Accessibility (a11y) & Interaction Contracts

1. **Keyboard Parity**:
   - Every action reachable via mouse must be accessible via keyboard (`Tab`, `Enter`, `Space`, `Escape`, and dedicated hotkeys).
   - Trap keyboard focus inside modals/dialogs when open, and restore focus to trigger element upon closing.

2. **Visual Affordances & Contrast**:
   - WCAG 2.1 AA contrast ratio minimums: `4.5:1` for regular text and `3:1` for large text or graphical elements.
   - Visible, distinct focus rings on all interactive elements (`focus-visible:ring-2`).
   - Never communicate critical semantic status by color alone—always pair with a descriptive text label or icon.

3. **Touch Targets**:
   - Interactive touch targets must meet a minimum hit area of `40x40px` (desktop) and `44x44px` (mobile).

---

## 7. Performance Budgets & Asset Optimization

1. **Interaction & Latency Budgets**:
   - Live search and filter queries must be debounced (100ms–200ms) to maintain a consistent 60fps frame rate.
   - Routine interaction feedback must settle within 200ms.

2. **Cumulative Layout Shift (CLS) = 0**:
   - Containers for dynamic content, lists, and skeleton loaders must define fixed or minimum dimensions to eliminate layout jumps during loading.

3. **Asset & Cache Discipline**:
   - Static bundles in `/assets/*` must serve immutable 1-year cache headers (`Cache-Control: public, max-age=31536000, immutable`).
   - Clean URLs and client-side routing fallback must be handled via `vercel.json` and Express static middlewares.

---

## 8. Secrets, Environment & Privacy Hygiene

1. **Zero Secret Leakage**:
   - Never commit sensitive API keys, database credentials, or tokens to version control.
   - All client-accessible environment variables must be prefixed with `VITE_`.
   - `.env.example` must contain only placeholder values and documentation.

2. **Client Data Portability & Privacy**:
   - Users must retain full ownership of their data: provide one-click export (JSON with integrity checksum) and safe import with schema validation.
   - Zero non-essential third-party telemetry, trackers, or hidden analytics pixels.

---

## 9. Git Hygiene & CI/CD Verification

1. **Conventional Commit Messages**:
   - Structure commit messages with standard prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`, `security:`.

2. **Pre-Push Validation Checklist**:
   Before merging or pushing changes, engineers/agents must run:
   - `npm run lint` — Zero TypeScript compilation or linting errors.
   - `npm test` — 100% automated test suite pass rate.
   - `npm run build` — Production Vite bundle compiles cleanly.
