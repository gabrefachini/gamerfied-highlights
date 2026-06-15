import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertRenderWorkerAuthorized } from "@/lib/rendering/workerAuth";

const ACTIVE_STATUSES = new Set([
  "WAITING_FOR_RENDERER",
  "LAUNCHING_GAME",
  "LOADING_DEMO",
  "SEEKING_TICK",
  "CAPTURING",
  "POST_PROCESSING",
  "RENDERING",
  "COMPLETED",
  "FAILED"
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { renderId: string } }) {
  try {
    assertRenderWorkerAuthorized(request);
    const body = (await request.json()) as {
      status?: string;
      errorMessage?: string | null;
      outputVideoPath?: string | null;
    };

    if (!body.status || !ACTIVE_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid render status" }, { status: 400 });
    }

    const renderJob = await prisma.renderJob.update({
      where: { id: params.renderId },
      data: {
        status: body.status as never,
        errorMessage: body.errorMessage ?? null,
        outputVideoPath: body.outputVideoPath ?? undefined
      }
    });

    if (body.status === "COMPLETED") {
      await prisma.highlightJob.update({
        where: { id: renderJob.jobId },
        data: { status: "DONE" }
      });
    } else if (body.status === "FAILED") {
      await prisma.highlightJob.update({
        where: { id: renderJob.jobId },
        data: { status: "FAILED" }
      });
    } else {
      await prisma.highlightJob.update({
        where: { id: renderJob.jobId },
        data: { status: "RENDERING" }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update render job" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
