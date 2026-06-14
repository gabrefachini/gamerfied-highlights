import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { jobId?: string; candidateId?: string };
    if (!body.jobId || !body.candidateId) {
      return NextResponse.json({ error: "jobId and candidateId are required" }, { status: 400 });
    }

    const candidate = await prisma.highlightCandidate.findFirst({
      where: {
        id: body.candidateId,
        jobId: body.jobId
      }
    });

    if (!candidate) {
      return NextResponse.json({ error: "Highlight candidate not found" }, { status: 404 });
    }

    const renderJob = await prisma.renderJob.create({
      data: {
        jobId: body.jobId,
        candidateId: body.candidateId,
        status: "QUEUED"
      }
    });

    await prisma.highlightJob.update({
      where: { id: body.jobId },
      data: { status: "RENDER_QUEUED" }
    });

    return NextResponse.json({ renderJob });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to queue render job" },
      { status: 500 }
    );
  }
}
