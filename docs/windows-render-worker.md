# Windows Render Worker

This document describes the next-step architecture where the main app stays where it is and a separate Windows machine performs CS2 demo rendering.

## Responsibilities

### Main app

- upload `.dem`
- analyze demo
- detect highlight candidates
- create `RenderJob`
- expose worker APIs
- store final MP4
- show render status in UI

### Windows worker

- claim render jobs from the app
- download demo file
- launch CS2 / HLAE
- load demo
- seek to highlight ticks
- capture render output
- upload MP4 artifact back to the app
- update render job status

## Internal Worker API

All worker endpoints require:

```http
x-render-worker-key: <RENDER_WORKER_API_KEY>
```

Endpoints:

- `POST /api/render-worker/claim`
- `POST /api/render-worker/jobs/:renderId`
- `GET /api/render-worker/jobs/:renderId/demo`
- `POST /api/render-worker/jobs/:renderId/artifact`

## Environment

### On the app host

```env
RENDERER_MODE="windows-worker"
RENDER_WORKER_API_KEY="replace-with-a-random-secret"
APP_URL="http://YOUR_APP_HOST:3000"
```

### On the Windows worker

```env
APP_BASE_URL="http://YOUR_APP_HOST:3000"
RENDER_WORKER_API_KEY="same-random-secret"
RENDER_WORKER_ID="windows-render-worker-1"
RENDER_WORKER_POLL_MS="5000"
RENDER_WORKER_DIR="C:\\gamerfied-highlights-worker"
DEMO_RENDERER_COMMAND=""
```

Keep `DEMO_RENDERER_COMMAND` empty until the CS2/HLAE execution layer exists.

## Mac Step-by-Step

Run these on your Mac inside the project:

```bash
cd /Users/gabrielfachini/Project/Gamerfied/gamerfied-highlights
cp .env.example .env
```

Edit `.env` and set:

```env
DATABASE_URL="postgresql://highlights:highlights@127.0.0.1:5432/gamerfied_highlights"
REDIS_URL=
UPLOAD_DIR="./uploads"
RENDER_DIR="./renders"
SOURCE_VIDEO_DIR="./source-videos"
FFMPEG_PATH="ffmpeg"
FFPROBE_PATH="ffprobe"
RENDERER_MODE="windows-worker"
RENDER_WORKER_API_KEY="replace-with-a-random-secret"
APP_URL="http://YOUR_MAC_IP_OR_DOMAIN:3000"
```

Then run:

```bash
npm install
npm run prisma:push
npm run build
npm run dev
```

If you want the app reachable from the Windows machine, use a host/IP it can access.

## Windows Step-by-Step

1. Install Node.js 20+
2. Clone the repo
3. Create environment variables:

```powershell
$env:APP_BASE_URL="http://YOUR_APP_HOST:3000"
$env:RENDER_WORKER_API_KEY="replace-with-a-random-secret"
$env:RENDER_WORKER_ID="windows-render-worker-1"
$env:RENDER_WORKER_POLL_MS="5000"
$env:RENDER_WORKER_DIR="C:\gamerfied-highlights-worker"
$env:DEMO_RENDERER_COMMAND=""
```

4. Start the worker:

```powershell
node scripts/windows-render-worker.mjs
```

## Current Worker State

The worker already does:

- authenticate with the app
- claim queued render jobs
- download the `.dem`
- move the render job through early statuses
- report missing renderer configuration honestly

It does not yet do:

- launch CS2
- control HLAE
- seek ticks inside the replay
- capture video frames
- upload a finished MP4

## Next Implementation Layer

The remaining work is the actual Windows renderer command implementation:

1. launch CS2/HLAE
2. open demo
3. seek `startTick`
4. capture until `endTick`
5. post-process if needed
6. upload MP4 with `POST /api/render-worker/jobs/:renderId/artifact`
7. mark `COMPLETED`
