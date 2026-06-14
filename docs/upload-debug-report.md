# Upload Debug Report

Date: 2026-06-12

## Summary

The demo upload pipeline currently fails at `HighlightJob` creation.

Root cause: the local Next dev server is running without `DATABASE_URL`, so Prisma cannot initialize the PostgreSQL datasource when `prisma.highlightJob.create()` is called.

Secondary issue: the uploaded `.dem` file is written to disk before the database insert. When Prisma fails, the request returns `500`, but the file remains in `uploads/` as an orphaned upload.

## Test Request

Endpoint:

```http
POST /api/highlight-jobs
Content-Type: multipart/form-data
```

Request payload used for reproduction:

```text
demo: /private/tmp/gamerfied-highlights-debug.dem
filename: debug.dem
email: debug@example.com
matchLink: not sent
```

Test file:

```text
size: 15 bytes
content: not a real demo
```

Command:

```bash
curl -sS -i -X POST 'http://localhost:3002/api/highlight-jobs' \
  -F 'demo=@/private/tmp/gamerfied-highlights-debug.dem;filename=debug.dem' \
  -F 'email=debug@example.com'
```

## API Response

Status:

```text
500 Internal Server Error
```

Response payload:

```json
{
  "error": "\nInvalid `prisma.highlightJob.create()` invocation:\n\n\nerror: Environment variable not found: DATABASE_URL.\n  -->  schema.prisma:7\n   | \n 6 |   provider = \"postgresql\"\n 7 |   url      = env(\"DATABASE_URL\")\n   | \n\nValidation Error Count: 1"
}
```

## Pipeline Trace

| Step | Status | Evidence |
| --- | --- | --- |
| Frontend upload request | SUCCESS | API accepted multipart request shape. Reproduced with `curl` against `localhost:3002`. |
| API endpoint entry | SUCCESS | `POST /api/highlight-jobs` executed and returned structured JSON. |
| Request payload parse | SUCCESS | `demo` was present, filename was `debug.dem`, size was `15` bytes. |
| File validation | SUCCESS | `.dem` extension passed validation. |
| File storage | SUCCESS | File was written under `uploads/`. |
| HighlightJob creation | FAILURE | Prisma failed because `DATABASE_URL` is not configured. |
| Database records | FAILURE | No record can be created or queried without a valid `DATABASE_URL`. |
| Parser execution | NOT REACHED | The request fails before `analyzeHighlightJob(job.id)` can run. |
| Highlight detection execution | NOT REACHED | Detection only runs after parser success. |
| API response | FAILURE | Client receives `500` with Prisma initialization error. |

## File Storage Evidence

Files found after failed upload attempts:

```text
uploads/33d2cc8a-c1e0-419a-b87f-0ef50559da80-debug.dem
size: 15 bytes

uploads/497d058e-9ece-4add-bb75-44e12aa8e11e-debug.dem
size: 15 bytes
```

Existing user/demo-sized uploads also exist, which confirms storage succeeds before the DB failure:

```text
uploads/671be51f-a585-440d-b04c-1be8c4f8def3-2026-05-16__1807__1__26938739__de_nuke__team-gabre__vs__team-3xtremefull.dem
size: 200016929 bytes

uploads/90e331a1-424d-41d8-ab93-c30a24c52d90-2026-05-16__1807__1__26938739__de_nuke__team-gabre__vs__team-3xtremefull.dem
size: 200016929 bytes
```

## Job Status

No `HighlightJob` status exists for the failed requests because creation fails at:

```ts
prisma.highlightJob.create(...)
```

Expected status if DB was configured:

```text
UPLOADED -> ANALYZING -> READY_TO_PICK
```

Actual status:

```text
none; job row is never created
```

## Parser Status

Parser status:

```text
NOT REACHED
```

Reason:

```text
analyzeHighlightJob(job.id) is only called after HighlightJob creation succeeds.
```

## Stack Trace

Captured with a direct Prisma create attempt in the same project without `DATABASE_URL`:

```text
PrismaClientInitializationError:
Invalid `prisma.highlightJob.create()` invocation:

error: Environment variable not found: DATABASE_URL.
  -->  schema.prisma:7
   |
 6 |   provider = "postgresql"
 7 |   url      = env("DATABASE_URL")
   |

Validation Error Count: 1
    at $n.handleRequestError (/Users/gabrielfachini/Project/Gamerfied/node_modules/@prisma/client/runtime/library.js:121:7615)
    at $n.handleAndLogRequestError (/Users/gabrielfachini/Project/Gamerfied/node_modules/@prisma/client/runtime/library.js:121:6623)
    at $n.request (/Users/gabrielfachini/Project/Gamerfied/node_modules/@prisma/client/runtime/library.js:121:6307)
    at async l (/Users/gabrielfachini/Project/Gamerfied/node_modules/@prisma/client/runtime/library.js:130:9633)
```

## Temporary Diagnostic Logs Added

Prefix:

```text
[upload-debug]
```

Files instrumented:

```text
app/api/highlight-jobs/route.ts
lib/storage/uploads.ts
lib/highlights/analyze.ts
lib/highlights/cs2Source2Parser.ts
lib/highlights/detector.ts
```

Logged steps:

```text
request SUCCESS
validation FAILURE
file-storage START
file-storage WRITE_SUCCESS
file-storage SUCCESS
highlight-job-create START
highlight-job-create SUCCESS
analysis-dispatch SUCCESS
parser START
parser SUCCESS
detection START
detection SUCCESS
pipeline FAILURE
analysis FAILURE
```

## Exact Failing Step

```text
HighlightJob creation
```

Failing code:

```ts
const job = await prisma.highlightJob.create({
  data: {
    userId: email || null,
    inputType: demoFilePath ? "DEMO_UPLOAD" : "MATCH_LINK",
    inputUrl: demoFilePath ? null : matchLink,
    demoFilePath,
    status: demoFilePath ? "UPLOADED" : "CREATED",
    diagnostics: {
      source: demoFilePath ? "upload" : "match-link",
      originalFileName: demo instanceof File ? demo.name : null
    }
  }
});
```

## Files Involved

```text
components/UploadForm.tsx
app/api/highlight-jobs/route.ts
lib/storage/uploads.ts
lib/prisma.ts
prisma/schema.prisma
lib/highlights/analyze.ts
lib/highlights/cs2Source2Parser.ts
lib/highlights/detector.ts
```

## Proposed Fix

1. Configure local environment:

```bash
cp .env.example .env
```

Set:

```env
DATABASE_URL="postgresql://highlights:highlights@localhost:5433/gamerfied_highlights"
REDIS_URL="redis://localhost:6380"
UPLOAD_DIR="./uploads"
APP_URL="http://localhost:3002"
```

2. Start local infrastructure:

```bash
docker compose up -d postgres redis
npm run prisma:migrate
npm run dev
```

3. Code hardening:

- Validate required env vars before accepting upload bytes.
- Or create the `HighlightJob` first, then save the file, then update the job with `demoFilePath`.
- If any downstream step fails after file write, delete the uploaded file or mark it in diagnostics for cleanup.
- Return a sanitized API error to the client while keeping full stack traces only in server logs.

