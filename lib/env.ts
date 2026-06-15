import path from "node:path";

export const env = {
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
  renderDir: process.env.RENDER_DIR || path.join(process.cwd(), "renders"),
  sourceVideoDir: process.env.SOURCE_VIDEO_DIR || path.join(process.cwd(), "source-videos"),
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "ffprobe",
  rendererMode: process.env.RENDERER_MODE || "unconfigured",
  renderWorkerApiKey: process.env.RENDER_WORKER_API_KEY || "",
  s3Bucket: process.env.S3_BUCKET || "",
  awsRegion: process.env.AWS_REGION || "",
  appUrl: process.env.APP_URL || "http://localhost:3000"
};
