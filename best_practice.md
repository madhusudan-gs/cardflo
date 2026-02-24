# Cardflo Best Practices & AI Instructions

These rules are established to prevent recurring errors, improve code quality, and ensure safe deployment practices. The AI assistant should refer to these rules and follow them strictly.

## 1. Version Control & Deployment Safety
- **Avoid Global Commits:** Never use `git add .` or `git commit -a`. This prevents accidental commits of local test scripts, environment files, or unverified changes.
- **Explicit Staging:** Only explicitly `git add` the specific files that have been intentionally modified for the current task (e.g., `git add components/auth-screen.tsx`).
- **Disposable Scripts:** If temporary scripts (like `test_signup.ts`) are created to test database connections, API keys, or logic, they MUST be deleted immediately after use and never committed to the repository.

## 2. Infrastructure & Environment
- **Environment Variables:** Never hardcode sensitive keys (Supabase Service Role, Resend API key, Gemini API key) in the codebase. Always use environment variables.
- **Client-Side Safety:** Ensure no sensitive keys are prefixed with `NEXT_PUBLIC_` unless they are explicitly meant for client-side use (like the Supabase Anon Key).

## 3. Technology Stack & Styling
- **Styling:** Use raw, vanilla CSS for component styling unless otherwise explicitly requested. Avoid introducing heavy styling frameworks like TailwindCSS unless it's a pre-existing project dependency.
- **Frontend Framework:** Next.js (App Router).

## 4. Security
- **API Protection:** All new API routes (e.g., `/api/[feature]`) MUST validate the Supabase user session before executing any expensive logic or interacting with external APIs (like Gemini). Return `401 Unauthorized` if no valid session exists.
- **Data Access:** Rely on Supabase Row Level Security (RLS) for data protection. Ensure frontend code gracefully handles potential RLS rejection errors.

## 5. Feature Freeze & Change Approval Policy
- **No Unsolicited Changes:** Do NOT modify any existing code, configuration, or logic without explicit user approval — even if a potential improvement is identified.
- **Impact Assessment First:** Before making ANY change that could affect core user experience (camera capture flow, AI extraction quality, scanner behaviour, auth flow, payment flow), clearly explain the impact to the user and wait for explicit "go ahead" approval.
- **Bug Fixes Only:** During a feature freeze, only fix confirmed bugs that are actively breaking the app. Do not refactor, optimize, or "improve" anything proactively.
- **Scope Creep Prevention:** If a requested change has side-effects that touch other features (e.g., changing the leads query affects My Cards), explicitly flag this before proceeding.
