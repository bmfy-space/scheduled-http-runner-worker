# Scheduled HTTP Runner

Cloudflare Workers + D1 + Queues + React admin for scheduled HTTP requests.

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars
```

## Cloudflare resources

Create a D1 database and Queue, then replace `wrangler.jsonc` placeholders:

```bash
npx wrangler d1 create scheduled_http_runner
npx wrangler queues create task-runner-queue
```

Apply the initial schema:

```bash
npx wrangler d1 migrations apply scheduled_http_runner
```

## Local development

Frontend only:

```bash
npm run dev
```

Build and preview the frontend bundle:

```bash
npm run build
npm run preview
```

Worker dev:

```bash
npm run worker:dev
```

## Tests

```bash
npm test
```

## Deploy

```bash
npm run build
npm run deploy
```
