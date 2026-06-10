# Scheduled HTTP Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable MVP for the scheduled HTTP request admin system described in `docs/superpowers/specs/2026-06-10-scheduled-http-runner-product-design.md`.

**Architecture:** Use one Cloudflare Worker for API routes, scheduled cron handling, queue consumption, and static React asset serving. Store tasks and logs in D1; use a Queue for manual and scheduled task execution; use a React/Vite admin UI for the backend-style management experience.

**Tech Stack:** TypeScript, Cloudflare Workers, Wrangler, D1, Queues, React, Vite, Vitest, Testing Library, lucide-react.

---

## File Structure

- Create `package.json`: project scripts and dependencies.
- Create `tsconfig.json`: shared TypeScript compiler settings.
- Create `vite.config.ts`: frontend build and test configuration.
- Create `wrangler.jsonc`: Worker entry, static assets, D1, Queue, cron trigger, observability.
- Create `.gitignore`: local build, dependencies, Wrangler state, secrets.
- Create `.dev.vars.example`: local admin token sample.
- Create `migrations/0001_init.sql`: D1 schema for `tasks` and `task_logs`.
- Create `src/worker/index.ts`: Worker `fetch`, `scheduled`, and `queue` handlers.
- Create `src/worker/env.ts`: Worker binding types.
- Create `src/worker/http.ts`: JSON responses, CORS-safe helpers, route parsing.
- Create `src/worker/auth.ts`: admin token verification.
- Create `src/worker/validation.ts`: task input validation, URL safety, JSON parsing.
- Create `src/worker/task-service.ts`: task CRUD and list/detail queries.
- Create `src/worker/log-service.ts`: log insert/list/detail queries.
- Create `src/worker/runner-service.ts`: execute HTTP task and write logs.
- Create `src/worker/scheduler-service.ts`: scan due tasks and enqueue them.
- Create `src/shared/types.ts`: API DTOs shared by Worker and React UI.
- Create `src/shared/constants.ts`: methods, statuses, sensitive header keys.
- Create `src/frontend/main.tsx`: React bootstrap.
- Create `src/frontend/App.tsx`: app state, routing, auth shell.
- Create `src/frontend/api.ts`: browser API client.
- Create `src/frontend/styles.css`: backend admin system styling.
- Create `src/frontend/components/*`: layout, badges, task form, header editor, dialogs.
- Create `src/frontend/pages/*`: login, tasks, task detail, logs, settings.
- Create `src/worker/*.test.ts`: unit tests for validation, auth, runner utilities.
- Create `src/frontend/*.test.tsx`: smoke tests for major UI states.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `wrangler.jsonc`
- Create: `.gitignore`
- Create: `.dev.vars.example`
- Create: `migrations/0001_init.sql`

- [ ] **Step 1: Create package and config files**

Add scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest",
    "worker:dev": "wrangler dev",
    "worker:types": "wrangler types",
    "worker:check": "wrangler check",
    "deploy": "wrangler deploy"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules` and `package-lock.json` are created.

- [ ] **Step 3: Add D1 migration**

Create `tasks` and `task_logs` tables matching the product spec, plus indexes for due task scanning and log lookup.

- [ ] **Step 4: Verify scaffold**

Run:

```bash
npm run build
```

Expected initially: build may fail until source files exist. After Task 6 it must pass.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts wrangler.jsonc .gitignore .dev.vars.example migrations/0001_init.sql
git commit -m "chore: scaffold scheduled HTTP runner"
```

## Task 2: Shared Types and Worker Utilities

**Files:**
- Create: `src/shared/constants.ts`
- Create: `src/shared/types.ts`
- Create: `src/worker/env.ts`
- Create: `src/worker/http.ts`
- Create: `src/worker/auth.ts`
- Create: `src/worker/validation.ts`
- Test: `src/worker/validation.test.ts`
- Test: `src/worker/auth.test.ts`

- [ ] **Step 1: Write validation tests**

Cover:

- allowed HTTP methods.
- valid `http://` and `https://` URLs.
- rejected localhost, loopback, private IPv4, and IPv6 loopback URLs.
- JSON body validation when `body_type = "json"`.
- sensitive header detection.

- [ ] **Step 2: Implement shared constants and DTOs**

Define `HttpMethod`, `TaskStatus`, `TriggerType`, `TaskSummary`, `TaskDetail`, `TaskLog`, `TaskInput`, and paginated response types.

- [ ] **Step 3: Implement API helpers**

`jsonResponse()` returns structured JSON with status codes. `readJson()` handles invalid JSON with a 400 response. `parsePath()` maps request URLs to route segments.

- [ ] **Step 4: Implement auth**

Use `Authorization: Bearer <token>` and constant-time comparison when `ADMIN_TOKEN` exists. Return 401 JSON when invalid.

- [ ] **Step 5: Run tests**

```bash
npm test -- src/worker/validation.test.ts src/worker/auth.test.ts
```

Expected: validation and auth tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared src/worker src/worker/*.test.ts
git commit -m "feat: add shared worker utilities"
```

## Task 3: Task and Log APIs

**Files:**
- Create: `src/worker/task-service.ts`
- Create: `src/worker/log-service.ts`
- Modify: `src/worker/index.ts`
- Test: `src/worker/task-service.test.ts`

- [ ] **Step 1: Implement task persistence helpers**

Implement:

- `listTasks(env, filters)`
- `getTask(env, id)`
- `createTask(env, input)`
- `updateTask(env, id, input)`
- `softDeleteTask(env, id)`
- `setTaskEnabled(env, id, enabled)`

- [ ] **Step 2: Implement log helpers**

Implement:

- `listLogs(env, filters)`
- `listTaskLogs(env, taskId, page, pageSize)`
- `getLog(env, id)`
- `insertTaskLog(env, data)`

- [ ] **Step 3: Implement API routes**

Routes:

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PATCH /api/tasks/:id/enabled`
- `GET /api/tasks/:id/logs`
- `GET /api/logs`
- `GET /api/logs/:id`
- `GET /api/health`

- [ ] **Step 4: Verify route behavior**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 5: Commit**

```bash
git add src/worker
git commit -m "feat: add task and log APIs"
```

## Task 4: Scheduler and Runner

**Files:**
- Create: `src/worker/runner-service.ts`
- Create: `src/worker/scheduler-service.ts`
- Modify: `src/worker/index.ts`
- Test: `src/worker/runner-service.test.ts`

- [ ] **Step 1: Implement task execution**

`runTaskById(env, taskId, triggerType)` loads the task, skips disabled cron runs, validates URL safety, sends the HTTP request with timeout, captures status, duration, response headers, response body preview, and error message.

- [ ] **Step 2: Update task after execution**

Always update:

- `last_run_at`
- `last_status`
- `last_http_status`
- `next_run_at`
- `updated_at`

Use `Date.now() + interval_minutes * 60_000` for the first version.

- [ ] **Step 3: Implement manual run route**

`POST /api/tasks/:id/run` sends `{ taskId, triggerType: "manual" }` to `TASK_QUEUE` and returns `{ ok: true, queued: true }`.

- [ ] **Step 4: Implement scheduled handler**

Every cron tick calls `scheduleDueTasks(env)` to select up to 100 enabled due tasks and enqueue them with `triggerType: "cron"`.

- [ ] **Step 5: Implement queue handler**

Consume batch messages, call `runTaskById`, and `ack()` each message only after the run is handled.

- [ ] **Step 6: Run tests and build**

```bash
npm test -- src/worker/runner-service.test.ts
npm run build
```

Expected: tests and build pass.

- [ ] **Step 7: Commit**

```bash
git add src/worker
git commit -m "feat: add scheduler and task runner"
```

## Task 5: React Admin UI

**Files:**
- Create: `index.html`
- Create: `src/frontend/main.tsx`
- Create: `src/frontend/App.tsx`
- Create: `src/frontend/api.ts`
- Create: `src/frontend/styles.css`
- Create: `src/frontend/components/Layout.tsx`
- Create: `src/frontend/components/StatusBadge.tsx`
- Create: `src/frontend/components/MethodBadge.tsx`
- Create: `src/frontend/components/HeaderEditor.tsx`
- Create: `src/frontend/components/TaskDrawer.tsx`
- Create: `src/frontend/components/ConfirmDialog.tsx`
- Create: `src/frontend/pages/LoginPage.tsx`
- Create: `src/frontend/pages/TasksPage.tsx`
- Create: `src/frontend/pages/TaskDetailPage.tsx`
- Create: `src/frontend/pages/LogsPage.tsx`
- Create: `src/frontend/pages/SettingsPage.tsx`
- Test: `src/frontend/App.test.tsx`

- [ ] **Step 1: Build the auth shell**

Store the admin token in `sessionStorage`, attach it to API requests, and return to login on 401.

- [ ] **Step 2: Build the backend layout**

Left navigation with `任务管理`, `执行日志`, `系统设置`; top bar with title, refresh, admin status, and logout.

- [ ] **Step 3: Build task management**

Implement task table, search, filters, new/edit drawer, enabled switch, run action, detail view, and delete confirmation.

- [ ] **Step 4: Build logs**

Implement global log filters, table pagination, and log detail panel.

- [ ] **Step 5: Build settings**

Show read-only auth, timeout, log truncation, sensitive header, and URL safety policy.

- [ ] **Step 6: Run UI verification**

```bash
npm test -- src/frontend/App.test.tsx
npm run build
```

Expected: tests and build pass.

- [ ] **Step 7: Commit**

```bash
git add index.html src/frontend
git commit -m "feat: add React admin UI"
```

## Task 6: Final Verification

**Files:**
- Modify: `README.md`
- Modify: `.dev.vars.example`

- [ ] **Step 1: Add README**

Document:

- setup
- local development
- D1 migration commands
- Queue and D1 creation commands
- admin token setup
- deploy command

- [ ] **Step 2: Generate Worker types if possible**

Run:

```bash
npm run worker:types
```

Expected: Wrangler writes generated Worker type definitions. If Cloudflare account authentication blocks this, note it in final status.

- [ ] **Step 3: Run all checks**

```bash
npm test
npm run build
npm run worker:check
```

Expected: tests, frontend build, TypeScript, and Wrangler config validation pass.

- [ ] **Step 4: Commit**

```bash
git add README.md .dev.vars.example
git commit -m "docs: add setup and deployment guide"
```

## Self-Review

- Spec coverage: plan covers authentication, task CRUD, enable/disable, manual queue run, cron scanning, queue execution, logs, sensitive header masking, URL safety, admin UI pages, and setup docs.
- Explicit MVP boundary: automatic retry is not implemented; `max_retries` is stored for future compatibility.
- Known implementation decision: use `sessionStorage` for admin token in the MVP because it clears on browser session close and keeps the login flow simple.
- Known deployment decision: use one Worker with static assets instead of separate Pages and API Workers for a smaller first-version boundary.
