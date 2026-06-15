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
    const matchLink = String(formData.get("matchLink") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const requestPayload = {
      traceId,
      hasDemo: demo instanceof File,
      demoName: demo instanceof File ? demo.name : null,
      demoSize: demo instanceof File ? demo.size : null,
      hasMatchLink: Boolean(matchLink),
      hasEmail: Boolean(email)
    };

    console.info("[upload-debug] request SUCCESS", requestPayload);

    if (!(demo instanceof File) && !matchLink) {
      console.warn("[upload-debug] validation FAILURE", { traceId, error: "Missing demo file or match link" });
      return NextResponse.json({ error: "Upload a .dem file or paste a match link" }, { status: 400 });
    }

    if (!env.databaseUrl) {
      console.warn("[upload-debug] validation FAILURE", { traceId, error: "DATABASE_URL is not configured" });
      return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 500 });
    }

    demoFilePath = demo instanceof File && demo.size > 0 ? await saveDemoUpload(demo) : null;
    console.info("[upload-debug] file-storage SUCCESS", {
      traceId,
      filePath: demoFilePath,
      fileSize: demo instanceof File ? demo.size : null
    });

    console.info("[upload-debug] highlight-job-create START", {
      traceId,
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL)
    });
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
