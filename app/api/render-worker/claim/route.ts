import { NextRequest, NextResponse } from "next/server";
import { RenderJobStatus } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { assertRenderWorkerAuthorized } from "@/lib/rendering/workerAuth";

const CLAIMABLE_RENDER_STATUSES: RenderJobStatus[] = [
  RenderJobStatus.QUEUED,
  RenderJobStatus.WAITING_FOR_RENDERER
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    assertRenderWorkerAuthorized(request);

    const pendingJob = await prisma.renderJob.findFirst({
      where: {
        status: {
          in: CLAIMABLE_RENDER_STATUSES
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        job: true,
        candidate: true
      }
    });

    if (!pendingJob) {
      return NextResponse.json({ job: null });
    }

    const claimResult = await prisma.renderJob.updateMany({
      where: {
        id: pendingJob.id,
        status: {
          in: CLAIMABLE_RENDER_STATUSES
        }
      },
      data: {
        status: "LAUNCHING_GAME",
        errorMessage: null
      }
    });

    if (claimResult.count === 0) {
      return NextResponse.json({ job: null });
    }

    await prisma.highlightJob.update({
      where: { id: pendingJob.jobId },
      data: { status: "RENDERING" }
    });

    const renderJob = await prisma.renderJob.findUniqueOrThrow({
      where: { id: pendingJob.id },
      include: {
        job: true,
        candidate: true
      }
    });

    return NextResponse.json({
      job: {
        id: renderJob.id,
        jobId: renderJob.jobId,
        candidateId: renderJob.candidateId,
        status: renderJob.status,
        startTimeSeconds: renderJob.startTimeSeconds,
        endTimeSeconds: renderJob.endTimeSeconds,
        durationSeconds: renderJob.durationSeconds,
        claimedFromStatus: pendingJob.status,
        demo: {
          fileName: renderJob.job.demoFilePath ? renderJob.job.demoFilePath.split("/").pop() : null,
          downloadUrl: `${env.appUrl}/api/render-worker/jobs/${renderJob.id}/demo`
        },
        highlightCandidate: {
          id: renderJob.candidate.id,
          type: renderJob.candidate.type,
          playerName: renderJob.candidate.playerName,
          roundNumber: renderJob.candidate.roundNumber,
          startTick: renderJob.candidate.startTick,
          endTick: renderJob.candidate.endTick,
          score: renderJob.candidate.score
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to claim render job" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
