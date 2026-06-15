import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

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
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
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
