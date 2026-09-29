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

---

## 4. API Testing & Validation Requirements (MANDATORY)

**Every API endpoint created must have automated test suites covering:**

1. **Happy Path Execution**:
   - Successful status code (`200 OK` or `201 Created`).
   - Expected data schema, types, and envelope matching `ApiResponse<T>`.

2. **Input Validation & Boundary Testing**:
   - Missing required fields rejection (`400 Bad Request`).
   - Invalid types, enum violations, and negative values.
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
