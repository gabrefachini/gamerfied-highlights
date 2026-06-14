# Gamerfied Highlights

Standalone lightweight app for CS2 highlight generation.

Core flow:

1. Upload a `.dem` file or paste a match link.
2. Analyze demo events.
3. Show highlight candidates.
4. Select one candidate.
5. Queue a future video render.
6. Download/share later.

This project is independent from the main Gamerfied repository. It does not use the main Gamerfied database, auth, feed, sessions, messages, social graph, coach, or navigation.

## Stack

- Next.js App Router for frontend and API routes
- Prisma + PostgreSQL for independent job data
- Redis/BullMQ for production analysis workers
- Local upload storage for development
- S3-ready environment variables for later demo/video storage

## Local Development

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000`.

To run the optional analysis worker:

```bash
npm run worker:analyze
```

If `REDIS_URL` is not configured, uploads are analyzed in-process after the API creates the job. For production, configure Redis and run the worker separately.

## Build

```bash
npm run build
```

## Optional Docker Infrastructure

```bash
docker compose up -d postgres redis
```

Example local env:

```env
DATABASE_URL="postgresql://highlights:highlights@localhost:5433/gamerfied_highlights"
REDIS_URL="redis://localhost:6380"
UPLOAD_DIR="./uploads"
APP_URL="http://localhost:3000"
```

## Product Scope

Included:

- Anonymous upload with optional email placeholder
- Match link storage placeholder
- Job status page
- Parser/detector integration for uploaded `.dem` files
- Candidate scoring
- Render-job placeholder

Not included yet:

- Main Gamerfied auth
- Payments
- Real video rendering
- S3 upload implementation
- Match-link demo ingestion
- Public share pages with access controls

## Data Model

See `prisma/schema.prisma` for:

- `HighlightJob`
- `HighlightCandidate`
- `RenderJob`

## Important

Do not point this app at the main Gamerfied production database. Use a separate PostgreSQL database, separate Redis instance/database, separate environment variables, and a separate AWS deployment.
