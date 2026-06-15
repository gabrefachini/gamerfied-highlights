import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertRenderWorkerAuthorized } from "@/lib/rendering/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { renderId: string } }) {
  try {
    assertRenderWorkerAuthorized(request);

    const renderJob = await prisma.renderJob.findUnique({
      where: { id: params.renderId },
      include: {
        job: true
      }
    });

    if (!renderJob?.job.demoFilePath) {
      return NextResponse.json({ error: "Demo file not found" }, { status: 404 });
    }

    const buffer = await fs.readFile(renderJob.job.demoFilePath);
    const fileName = renderJob.job.demoFilePath.split("/").pop() || `${params.renderId}.dem`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read demo file" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
