import { NextRequest, NextResponse } from "next/server";
import { getVideoRenderProvider } from "@/lib/rendering";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const renderProvider = getVideoRenderProvider();
    const body = (await request.json()) as { jobId?: string; candidateId?: string };
    if (!body.jobId || !body.candidateId) {
      return NextResponse.json({ error: "jobId and candidateId are required" }, { status: 400 });
    }

    const renderJob = await renderProvider.queueRender({
      jobId: body.jobId,
      candidateId: body.candidateId
    });
    return NextResponse.json({ renderJob });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to queue render job" },
      { status: 500 }
    );
  }
}
