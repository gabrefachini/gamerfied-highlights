import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { renderId: string } }) {
  const renderJob = await prisma.renderJob.findUnique({
    where: { id: params.renderId }
  });

  if (!renderJob || renderJob.status !== "COMPLETED" || !renderJob.outputVideoPath) {
    return NextResponse.json({ error: "Rendered video not found" }, { status: 404 });
  }

  const buffer = await fs.readFile(renderJob.outputVideoPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `inline; filename="${params.renderId}.mp4"`,
      "Cache-Control": "no-store"
    }
  });
}
