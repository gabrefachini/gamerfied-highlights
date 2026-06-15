import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertRenderWorkerAuthorized } from "@/lib/rendering/workerAuth";
import { saveRenderedVideoUpload } from "@/lib/storage/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { renderId: string } }) {
  try {
    assertRenderWorkerAuthorized(request);

    const renderJob = await prisma.renderJob.findUnique({
      where: { id: params.renderId }
    });

    if (!renderJob) {
      return NextResponse.json({ error: "Render job not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const artifact = formData.get("artifact");
    if (!(artifact instanceof File) || artifact.size <= 0) {
      return NextResponse.json({ error: "Artifact file is required" }, { status: 400 });
    }

    const outputVideoPath = await saveRenderedVideoUpload(renderJob.id, artifact);

    await prisma.renderJob.update({
      where: { id: renderJob.id },
      data: {
        outputVideoPath,
        errorMessage: null
      }
    });

    return NextResponse.json({ outputVideoPath });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload render artifact" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
