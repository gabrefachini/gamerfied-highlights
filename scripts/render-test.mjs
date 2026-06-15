import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const renderDir = path.join(process.cwd(), "renders");
const sourceVideoDir = path.join(process.cwd(), "source-videos");
const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";

const runCommand = async (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });

const getVideoDurationSeconds = async (filePath) => {
  const result = await runCommand(ffprobePath, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath
  ]);

  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || "Unable to read video duration");
  }

  const duration = Number(result.stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Video duration is invalid");
  }

  return duration;
};

async function main() {
  const sampleVideoPath =
    process.env.RENDER_TEST_SOURCE_VIDEO ||
    path.join(sourceVideoDir, "render-test-sample.mp4");

  try {
    await fs.access(sampleVideoPath);
  } catch {
    console.error("Sample video not found.");
    console.error(`Place a recording at ${sampleVideoPath}`);
    console.error("Or run with RENDER_TEST_SOURCE_VIDEO=/absolute/path/to/match-recording.mp4 npm run render:test");
    process.exit(1);
  }

  const ffmpegCheck = await runCommand(ffmpegPath, ["-version"]);
  if (ffmpegCheck.code !== 0) {
    console.error(`FFmpeg is not available at ${ffmpegPath}`);
    process.exit(1);
  }

  const sourceDuration = await getVideoDurationSeconds(sampleVideoPath);
  const startSeconds = sourceDuration >= 4 ? 1 : 0;
  const endSeconds = sourceDuration >= 4 ? 3 : Math.max(0.5, Math.min(sourceDuration, 1.5));
  const durationSeconds = Number((endSeconds - startSeconds).toFixed(3));

  if (durationSeconds <= 0) {
    console.error("Sample video is too short for render:test");
    process.exit(1);
  }

  const outputDir = path.join(renderDir, "render-test");
  const outputPath = path.join(outputDir, "highlight-test.mp4");
  await fs.mkdir(outputDir, { recursive: true });

  const result = await runCommand(ffmpegPath, [
    "-y",
    "-ss",
    startSeconds.toFixed(3),
    "-i",
    sampleVideoPath,
    "-t",
    durationSeconds.toFixed(3),
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath
  ]);

  if (result.code !== 0) {
    console.error(result.stderr.trim() || "FFmpeg failed");
    process.exit(1);
  }

  await fs.access(outputPath);
  const outputDuration = await getVideoDurationSeconds(outputPath);
  if (outputDuration <= 0) {
    console.error("Output video exists but duration is invalid");
    process.exit(1);
  }

  console.log("FFmpeg render test passed.");
  console.log(`Source: ${sampleVideoPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Duration: ${outputDuration.toFixed(3)}s`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "render:test failed");
  process.exit(1);
});
