import path from "node:path";

export const env = {
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
  s3Bucket: process.env.S3_BUCKET || "",
  awsRegion: process.env.AWS_REGION || "",
  appUrl: process.env.APP_URL || "http://localhost:3000"
};
