const appBaseUrl = process.env.APP_BASE_URL || process.env.APP_URL || "http://localhost:3000";
const workerApiKey = process.env.RENDER_WORKER_API_KEY || "";
const pollIntervalMs = Number(process.env.RENDER_WORKER_POLL_MS || 5000);
const workerId = process.env.RENDER_WORKER_ID || "windows-render-worker-1";
const localWorkDir = process.env.RENDER_WORKER_DIR || "C:\\gamerfied-highlights-worker";
const demoRendererCommand = process.env.DEMO_RENDERER_COMMAND || "";

if (!workerApiKey) {
  console.error("RENDER_WORKER_API_KEY is required");
  process.exit(1);
}

async function workerFetch(path, options = {}) {
  const headers = {
    "x-render-worker-key": workerApiKey,
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`${appBaseUrl}${path}`, {
    ...options,
    headers
  });

  return response;
}

async function claimJob() {
  const response = await workerFetch("/api/render-worker/claim", {
    method: "POST",
    body: JSON.stringify({ workerId })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Unable to claim render job");
  }
  return payload.job;
}

async function updateStatus(renderId, status, extras = {}) {
  const response = await workerFetch(`/api/render-worker/jobs/${renderId}`, {
    method: "POST",
    body: JSON.stringify({
      status,
      ...extras
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Unable to update render status");
  }
}

async function downloadDemo(renderId) {
  const response = await workerFetch(`/api/render-worker/jobs/${renderId}/demo`, {
    method: "GET"
  });
  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.error || "Unable to download demo");
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processJob(job) {
  try {
    await updateStatus(job.id, "LOADING_DEMO");
    const demoBuffer = await downloadDemo(job.id);

    if (!demoRendererCommand) {
      await updateStatus(job.id, "WAITING_FOR_RENDERER", {
        errorMessage:
          "Windows worker is connected, but DEMO_RENDERER_COMMAND is not configured yet. Install CS2/HLAE and configure the renderer command."
      });
      return;
    }

    await updateStatus(job.id, "SEEKING_TICK");
    await updateStatus(job.id, "CAPTURING", {
      errorMessage:
        `Renderer command configured but execution is not implemented yet. Demo bytes downloaded: ${demoBuffer.byteLength}. Work dir: ${localWorkDir}.`
    });

    await updateStatus(job.id, "WAITING_FOR_RENDERER", {
      errorMessage:
        "Renderer command hook exists, but the CS2/HLAE execution layer is still pending implementation."
    });
  } catch (error) {
    await updateStatus(job.id, "FAILED", {
      errorMessage: error instanceof Error ? error.message : "Windows render worker failed"
    });
  }
}

async function loop() {
  console.log(`[worker] polling ${appBaseUrl} as ${workerId}`);
  for (;;) {
    try {
      const job = await claimJob();
      if (!job) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      console.log(`[worker] claimed ${job.id}`);
      await processJob(job);
    } catch (error) {
      console.error(`[worker] ${error instanceof Error ? error.message : "Unknown worker error"}`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}

void loop();
