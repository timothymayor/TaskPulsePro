# TaskPulse Pro - High-Performance To-Do & Workflow Manager

TaskPulse Pro is a production-grade, secure, and blazing-fast task and workflow management application built with React 19, TypeScript, Tailwind CSS, and Vite. Designed following enterprise SaaS design principles and strict OWASP client-side security guidelines.

---

## 🚀 Key Highlights & Capabilities

- **Strict Zero-Pill & Anti-Slop Visual Hierarchy**: Clean typography, unboxed metadata with subtle typographic separators (`·`), single-elevation cards with hairline borders, and responsive desktop/mobile presence.
- **Comprehensive Task Lifecycle**:
  - Task creation with title, rich notes/description, category, priority (Low, Medium, High, Urgent), due dates, and estimated focus time.
  - Multi-step checklist subtasks with progress tracking.
  - Segmented filtering: *All*, *Today*, *Upcoming*, *Urgent*, and *Completed*.
  - Live debounced search with instant match highlighting.
  - Sorting by Due Date, Priority, Title, or Date Created.
  - Batch / Multi-selection actions: bulk complete, bulk delete, bulk priority change, and bulk category move.
  - Instant undo toast notification for accidental deletion.
  - Built-in Productivity Insights dashboard with category velocity and time allocations.
- **Power User Hotkeys**:
  - `N` : Create new task
  - `/` : Focus instant search
  - `Esc` : Close modals / clear search
  - `1-4` : Switch views (All, Today, Upcoming, Completed)
  - `?` : Open keyboard shortcuts reference

---

## 🛡️ Security Compliance Architecture

The codebase enforces robust client-side security controls matching OWASP Top 10 and CIS Benchmarks:

1. **Input Sanitization & Anti-XSS Engine (`src/utils/security.ts`)**:
   - Strips malicious `<script>`, `<iframe>`, `onerror=`, `onload=`, and `javascript:` URIs prior to state entry.
   - Enforces string length bounds (200 chars for titles, 1000 chars for notes) to protect against memory exhaustion.
2. **Prototype Pollution Protection**:
   - Defends against object constructor tampering (`__proto__`, `constructor`, `prototype`).
3. **Data Integrity & Dual-Mix Checksums**:
   - All exported backup files and storage records include deterministic checksums for tamper detection.
4. **Resilient Local Storage Fallbacks**:
   - Defensively catches JSON parse errors and corrupted payloads, gracefully falling back to validated demo data without crashing.
5. **Production Content Security Policy (`vercel.json` & `index.html`)**:
   - Enforces strict HTTP security headers:
     - `Content-Security-Policy`: Restricts scripts, styles, and fonts to trusted origins.
     - `X-Frame-Options: SAMEORIGIN`: Prevents clickjacking attacks.
     - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
     - `Strict-Transport-Security`: HSTS enabled for 2 years with preloading.
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Permissions-Policy`: Restricts camera, microphone, and geolocation access.

---

## ⚡ Performance Optimizations

- **React 19 Memoization**: Filtered datasets, computed statistics, and handlers are memoized with `useMemo` and `useCallback` to prevent unnecessary re-renders.
- **Instant Search Debounce**: High-frequency input changes query with smooth, zero-stutter performance.
- **Zero Layout Shifts (CLS: 0)**: Fixed aspect ratios and dimension allocations preserve viewport stability during data loading.
- **Asset Cache Optimization**: `vercel.json` configures `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`.

---

## 🚢 CI/CD & Deployment Instructions

### Option A: Deploy to GitHub & Automatic Vercel Git Integration (Recommended)

1. **Initialize and Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete production-ready TaskPulse Pro"
   git branch -M main
   git remote add origin https://github.com/<your-username>/TaskPulse-Pro.git
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your newly pushed GitHub repository.
   - Framework Preset: **Vite** (auto-detected).
   - Click **Deploy**. Vercel will automatically trigger production builds on every push to `main` and preview deployments on pull requests.

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login and Deploy**:
   ```bash
   vercel login
   vercel --prod
   ```

---

## 🧪 CI/CD Pipeline Workflow

The repository includes a ready-to-run GitHub Actions configuration in `.github/workflows/ci.yml`:
- **TypeScript Type Verification**: `npm run lint`
- **Security Vulnerability Audit**: `npm audit --audit-level=high`
- **Production Bundle Build**: `npm run build`
- **Artifact Integrity Verification**: Validates `dist/index.html` structure.

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start Vite dev server on port 3000
npm run dev

# Run TypeScript checks
npm run lint

# Build production bundle
npm run build
```
