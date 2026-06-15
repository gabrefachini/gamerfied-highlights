import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");

export async function saveDemoUpload(file: File) {
  console.info("[upload-debug] file-storage START", {
    fileName: file.name,
    fileSize: file.size,
    uploadDir: env.uploadDir
  });

  if (!file.name.toLowerCase().endsWith(".dem")) {
    console.warn("[upload-debug] file-storage FAILURE", { fileName: file.name, error: "Only .dem files are supported" });
    throw new Error("Only .dem files are supported");
  }

  await fs.mkdir(env.uploadDir, { recursive: true });
  const safeName = sanitizeFileName(file.name);
  const fileName = `${randomUUID()}-${safeName}`;
  const filePath = path.join(env.uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  console.info("[upload-debug] file-storage WRITE_SUCCESS", {
    filePath,
    fileSize: buffer.byteLength
  });
  return filePath;
}

export async function saveSourceVideoUpload(file: File) {
  console.info("[upload-debug] source-video START", {
    fileName: file.name,
    fileSize: file.size,
    sourceVideoDir: env.sourceVideoDir
  });

  const allowedExtensions = [".mp4", ".mov", ".webm"];
  const extension = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    console.warn("[upload-debug] source-video FAILURE", {
      fileName: file.name,
      error: "Only .mp4, .mov, and .webm files are supported"
    });
    throw new Error("Only .mp4, .mov, and .webm files are supported");
  }

  await fs.mkdir(env.sourceVideoDir, { recursive: true });
  const safeName = sanitizeFileName(file.name);
  const fileName = `${randomUUID()}-${safeName}`;
  const filePath = path.join(env.sourceVideoDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  console.info("[upload-debug] source-video WRITE_SUCCESS", {
    filePath,
    fileSize: buffer.byteLength
  });
  return filePath;
}

export async function deleteDemoUpload(filePath: string) {
  try {
    await fs.unlink(filePath);
    console.info("[upload-debug] file-storage DELETE_SUCCESS", { filePath });
  } catch (error) {
    console.warn("[upload-debug] file-storage DELETE_FAILURE", {
      filePath,
      message: error instanceof Error ? error.message : "Unknown delete error"
    });
  }
}

export async function deleteSourceVideoUpload(filePath: string) {
  try {
    await fs.unlink(filePath);
    console.info("[upload-debug] source-video DELETE_SUCCESS", { filePath });
  } catch (error) {
    console.warn("[upload-debug] source-video DELETE_FAILURE", {
      filePath,
      message: error instanceof Error ? error.message : "Unknown delete error"
    });
  }
}

export async function saveRenderedVideoUpload(renderJobId: string, file: File) {
  const renderJobDir = path.join(env.renderDir, renderJobId);
  await fs.mkdir(renderJobDir, { recursive: true });
  const extension = path.extname(file.name).toLowerCase() || ".mp4";
  const outputPath = path.join(renderJobDir, `highlight${extension}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}
