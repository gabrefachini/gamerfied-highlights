import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const appBaseUrl = process.env.APP_BASE_URL || process.env.APP_URL || "http://localhost:3000";
const workerApiKey = process.env.RENDER_WORKER_API_KEY || "";
const pollIntervalMs = Number(process.env.RENDER_WORKER_POLL_MS || 5000);
const workerId = process.env.RENDER_WORKER_ID || "windows-render-worker-1";
const localWorkDir = process.env.RENDER_WORKER_DIR || "C:\\gamerfied-highlights-worker";
const demoRendererCommand = process.env.DEMO_RENDERER_COMMAND || "";
const demoRendererExecutable = process.env.DEMO_RENDERER_EXECUTABLE || "";
const demoRendererArgs = process.env.DEMO_RENDERER_ARGS || "";
const outputFileName = process.env.RENDER_WORKER_OUTPUT_FILE || "highlight.mp4";
const workerLogPath = path.join(localWorkDir, "worker.log");

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

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString();
}

async function appendLogLine(logPath, message) {
  try {
    await fs.appendFile(logPath, `[${getTimestamp()}] ${message}\n`);
  } catch (error) {
    console.error(
      `[worker] unable to write log ${logPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function logWorker(message) {
  console.log(`[worker] ${message}`);
  await appendLogLine(workerLogPath, message);
}

async function logJob(jobId, message) {
  const jobLogPath = path.join(localWorkDir, jobId, "render-worker.log");
  await ensureDirectory(path.dirname(jobLogPath));
  await appendLogLine(jobLogPath, message);
  await appendLogLine(workerLogPath, `[job:${jobId}] ${message}`);
}

function sanitizeFileName(fileName, fallback) {
  return (fileName || fallback).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
}

async function prepareJobFiles(job, demoBuffer) {
  const jobDir = path.join(localWorkDir, job.id);
  await ensureDirectory(jobDir);

  const demoFileName = sanitizeFileName(job.demo?.fileName, `${job.id}.dem`);
  const demoPath = path.join(jobDir, demoFileName);
  const outputVideoPath = path.join(jobDir, outputFileName);

  await fs.writeFile(demoPath, demoBuffer);

  return {
    jobDir,
    demoPath,
    outputVideoPath,
    rendererStdoutLogPath: path.join(jobDir, "renderer.stdout.log"),
    rendererStderrLogPath: path.join(jobDir, "renderer.stderr.log")
  };
}

async function runRendererCommand(job, preparedFiles) {
  const { jobDir, demoPath, outputVideoPath, rendererStdoutLogPath, rendererStderrLogPath } = preparedFiles;

  const rendererEnv = {
    ...process.env,
    RENDER_JOB_ID: job.id,
    RENDER_JOB_DIR: jobDir,
    DEMO_FILE_PATH: demoPath,
    OUTPUT_VIDEO_PATH: outputVideoPath,
    HIGHLIGHT_START_TICK: String(job.highlightCandidate?.startTick ?? ""),
    HIGHLIGHT_END_TICK: String(job.highlightCandidate?.endTick ?? ""),
    HIGHLIGHT_START_SECONDS: String(job.startTimeSeconds ?? ""),
    HIGHLIGHT_END_SECONDS: String(job.endTimeSeconds ?? ""),
    HIGHLIGHT_DURATION_SECONDS: String(job.durationSeconds ?? ""),
    HIGHLIGHT_PLAYER_NAME: job.highlightCandidate?.playerName ?? "",
    HIGHLIGHT_ROUND_NUMBER: String(job.highlightCandidate?.roundNumber ?? ""),
    WORKER_JOB_LOG_PATH: path.join(jobDir, "render-job.log"),
    RENDERER_STDOUT_LOG_PATH: rendererStdoutLogPath,
    RENDERER_STDERR_LOG_PATH: rendererStderrLogPath
  };

  return await new Promise((resolve, reject) => {
    const useExplicitExecutable = Boolean(demoRendererExecutable);
    const command = useExplicitExecutable ? demoRendererExecutable : process.env.ComSpec || "cmd.exe";
    const args = useExplicitExecutable
      ? splitCommandLine(demoRendererArgs)
      : ["/d", "/s", "/c", demoRendererCommand];

    const child = spawn(command, args, {
      cwd: jobDir,
      env: rendererEnv,
      windowsHide: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", async (chunk) => {
      const text = chunk.toString();
      stdout += text;
      await fs.appendFile(rendererStdoutLogPath, text);
    });

    child.stderr.on("data", async (chunk) => {
      const text = chunk.toString();
      stderr += text;
      await fs.appendFile(rendererStderrLogPath, text);
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Unable to start renderer process "${command}" with args ${JSON.stringify(args)}: ${error.code || ""} ${error.message}`.trim()
        )
      );
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Renderer command failed with exit code ${code}.${stderr ? ` Stderr: ${stderr.trim()}` : ""}${stdout ? ` Stdout: ${stdout.trim()}` : ""}`
        )
      );
    });
  });
}

function splitCommandLine(commandLine) {
  const args = [];
  let current = "";
  let quote = "";

  for (let index = 0; index < commandLine.length; index += 1) {
    const char = commandLine[index];

    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = "";
      continue;
    }

    if (/\s/.test(char) && !quote) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    args.push(current);
  }

  return args;
}

async function assertOutputVideoExists(outputVideoPath) {
  const stat = await fs.stat(outputVideoPath).catch(() => null);
  if (!stat || stat.size <= 0) {
    throw new Error(`Renderer did not produce a valid MP4 at ${outputVideoPath}`);
  }
}

async function uploadArtifact(renderId, outputVideoPath) {
  const artifactBuffer = await fs.readFile(outputVideoPath);
  const formData = new FormData();
  const artifactFile = new File([artifactBuffer], path.basename(outputVideoPath), {
    type: "video/mp4"
  });

  formData.set("artifact", artifactFile);

  const response = await workerFetch(`/api/render-worker/jobs/${renderId}/artifact`, {
    method: "POST",
    body: formData
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Unable to upload render artifact");
  }

  return payload.outputVideoPath;
}

async function processJob(job) {
  try {
    const claimedFromStatus = job.claimedFromStatus ? ` from ${job.claimedFromStatus}` : "";
    await logJob(
      job.id,
      `claimed${claimedFromStatus} for candidate ${job.candidateId} ticks ${job.highlightCandidate?.startTick}-${job.highlightCandidate?.endTick}`
    );
    await updateStatus(job.id, "LOADING_DEMO");
    await logJob(job.id, "status -> LOADING_DEMO");
    const demoBuffer = await downloadDemo(job.id);
    await logJob(job.id, `downloaded demo (${demoBuffer.byteLength} bytes)`);
    const preparedFiles = await prepareJobFiles(job, demoBuffer);
    await logJob(job.id, `prepared job files in ${preparedFiles.jobDir}`);

    if (!demoRendererCommand) {
      await updateStatus(job.id, "WAITING_FOR_RENDERER", {
        errorMessage:
          "Windows worker is connected, but DEMO_RENDERER_COMMAND is not configured yet. Install CS2/HLAE and configure the renderer command."
      });
      await logJob(job.id, "status -> WAITING_FOR_RENDERER (missing DEMO_RENDERER_COMMAND)");
      return;
    }

    await updateStatus(job.id, "SEEKING_TICK");
    await logJob(job.id, "status -> SEEKING_TICK");
    await updateStatus(job.id, "CAPTURING");
    await logJob(job.id, `status -> CAPTURING (running "${demoRendererCommand}")`);
    await runRendererCommand(job, preparedFiles);
    await logJob(job.id, "renderer command exited successfully");
    await assertOutputVideoExists(preparedFiles.outputVideoPath);
    await logJob(job.id, `output video exists at ${preparedFiles.outputVideoPath}`);

    await updateStatus(job.id, "POST_PROCESSING");
    await logJob(job.id, "status -> POST_PROCESSING");
    const uploadedOutputVideoPath = await uploadArtifact(job.id, preparedFiles.outputVideoPath);
    await logJob(job.id, `uploaded artifact to ${uploadedOutputVideoPath}`);

    await updateStatus(job.id, "COMPLETED", {
      outputVideoPath: uploadedOutputVideoPath,
      errorMessage: null
    });
    await logJob(job.id, "status -> COMPLETED");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Windows render worker failed";
    await logJob(job.id, `status -> FAILED (${errorMessage})`);
    await updateStatus(job.id, "FAILED", {
      errorMessage
    });
  }
}

async function loop() {
  await ensureDirectory(localWorkDir);
  await logWorker(`polling ${appBaseUrl} as ${workerId}`);
  let idlePollCount = 0;
  for (;;) {
    try {
      const job = await claimJob();
      if (!job) {
        idlePollCount += 1;
        if (idlePollCount === 1 || idlePollCount % 12 === 0) {
          await logWorker("no claimable render job available (QUEUED or WAITING_FOR_RENDERER)");
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      idlePollCount = 0;
      await logWorker(`claimed ${job.id}${job.claimedFromStatus ? ` from ${job.claimedFromStatus}` : ""}`);
      await processJob(job);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown worker error";
      console.error(`[worker] ${errorMessage}`);
      await appendLogLine(workerLogPath, `[${getTimestamp()}] ERROR ${errorMessage}`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}

void loop();
