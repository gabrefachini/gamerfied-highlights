import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVideoRenderProvider } from "@/lib/rendering";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { jobId: string } }) {
  const renderProvider = getVideoRenderProvider();
  const job = await prisma.highlightJob.findUnique({
    where: { id: params.jobId },
    include: {
      candidates: {
        orderBy: { score: "desc" }
      },
      renderJobs: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!job) {
    return NextResponse.json({ error: "Highlight job not found" }, { status: 404 });
  }

  return NextResponse.json({
    job,
    renderer: renderProvider.getAvailability()
  });
}
