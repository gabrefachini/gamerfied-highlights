import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVideoRenderProvider } from "@/lib/rendering";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { renderId: string } }) {
  try {
    const renderProvider = getVideoRenderProvider();
    const renderJob = await prisma.renderJob.findUnique({
      where: { id: params.renderId },
      include: {
        candidate: true
      }
    });

    if (!renderJob) {
      return NextResponse.json({ error: "Render job not found" }, { status: 404 });
    }

    const providerStatus = await renderProvider.getStatus(renderJob.id);
    return NextResponse.json({
      renderJob: {
        ...renderJob,
        providerStatus
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load render job" },
      { status: 500 }
    );
  }
}
