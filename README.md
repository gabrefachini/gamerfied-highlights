# Gamerfied Highlights

Standalone lightweight app for CS2 highlight generation.

Core flow:

1. Upload a `.dem` file.
2. Analyze demo events.
3. Show highlight candidates.
4. Select one candidate.
5. Create a render job for the selected candidate.
6. Render the selected moment from the demo once a CS2/HLAE renderer is configured.

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
npm run prisma:push
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
DATABASE_URL="postgresql://highlights:highlights@127.0.0.1:5432/gamerfied_highlights"
REDIS_URL=""
UPLOAD_DIR="./uploads"
APP_URL="http://localhost:3000"
```

`npm run prisma:migrate` is available for environments where the configured database user can create Prisma shadow databases. For the default local bootstrap, use `npm run prisma:push`.

## Product Scope

Included:

- Anonymous upload with optional email placeholder
- Job status page
- Parser/detector integration for uploaded `.dem` files
- Candidate scoring
- Demo-based render-job architecture for future CS2/HLAE rendering
- Windows render-worker contract and internal worker APIs

Not included yet:

- Main Gamerfied auth
- Payments
- Real CS2 `.dem` replay rendering engine
- S3 upload implementation
- Public share pages with access controls

## Demo Rendering

This MVP does not require a full match recording upload. `.dem` remains the primary input and the render pipeline is now oriented around a dedicated CS2/HLAE renderer.

See [docs/cs2-demo-rendering.md](/Users/gabrielfachini/Project/Gamerfied/gamerfied-highlights/docs/cs2-demo-rendering.md).
For the next-step remote worker setup, see [docs/windows-render-worker.md](/Users/gabrielfachini/Project/Gamerfied/gamerfied-highlights/docs/windows-render-worker.md).

## Data Model

See `prisma/schema.prisma` for:

- `HighlightJob`
- `HighlightCandidate`
- `RenderJob`

## Important

Do not point this app at the main Gamerfied production database. Use a separate PostgreSQL database, separate Redis instance/database, separate environment variables, and a separate AWS deployment.
