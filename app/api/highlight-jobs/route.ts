import { NextRequest, NextResponse } from "next/server";
import { analyzeHighlightJob } from "@/lib/highlights/analyze";
import { enqueueAnalysis } from "@/lib/highlights/queue";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { deleteDemoUpload, saveDemoUpload } from "@/lib/storage/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  let demoFilePath: string | null = null;
  try {
    const formData = await request.formData();
    const demo = formData.get("demo");
    const email = String(formData.get("email") || "").trim();
    const requestPayload = {
      traceId,
      hasDemo: demo instanceof File,
      demoName: demo instanceof File ? demo.name : null,
      demoSize: demo instanceof File ? demo.size : null,
      hasEmail: Boolean(email)
    };

    console.info("[upload-debug] request SUCCESS", requestPayload);

    if (!(demo instanceof File) || demo.size <= 0) {
      console.warn("[upload-debug] validation FAILURE", { traceId, error: "Missing demo file" });
      return NextResponse.json({ error: "Upload a .dem file to continue" }, { status: 400 });
    }

    if (!env.databaseUrl) {
      console.warn("[upload-debug] validation FAILURE", { traceId, error: "DATABASE_URL is not configured" });
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    demoFilePath = await saveDemoUpload(demo);
    console.info("[upload-debug] file-storage SUCCESS", {
      traceId,
      filePath: demoFilePath,
      fileSize: demo.size
    });

    console.info("[upload-debug] highlight-job-create START", {
      traceId,
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL)
    });
    const job = await prisma.highlightJob.create({
      data: {
        userId: email || null,
        inputType: "DEMO_UPLOAD",
        inputUrl: null,
        demoFilePath,
        status: "UPLOADED",
        diagnostics: {
          source: "upload",
          originalFileName: demo.name
        }
      }
    });
    console.info("[upload-debug] highlight-job-create SUCCESS", { traceId, jobId: job.id, status: job.status });

    const queued = await enqueueAnalysis(job.id);
    console.info("[upload-debug] analysis-dispatch SUCCESS", { traceId, jobId: job.id, queued });
    if (!queued) {
      void analyzeHighlightJob(job.id);
    }

    const responsePayload = { job: { id: job.id, status: job.status }, queued };
    console.info("[upload-debug] response SUCCESS", { traceId, responsePayload });
    return NextResponse.json(responsePayload);
  } catch (error) {
    if (demoFilePath) {
      await deleteDemoUpload(demoFilePath);
    }
    console.error("[upload-debug] pipeline FAILURE", {
      traceId,
      message: error instanceof Error ? error.message : "Unable to create highlight job",
      stack: error instanceof Error ? error.stack : null
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create highlight job" },
      { status: 500 }
    );
  }
}
