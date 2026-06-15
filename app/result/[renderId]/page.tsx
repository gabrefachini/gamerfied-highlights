import { RenderStatusPanel } from "@/components/RenderStatusPanel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: { renderId: string } }) {
  const renderJob = await prisma.renderJob.findUnique({
    where: { id: params.renderId },
    include: {
      candidate: true
    }
  });

  return <RenderStatusPanel initialRenderJob={renderJob} renderId={params.renderId} />;
}
