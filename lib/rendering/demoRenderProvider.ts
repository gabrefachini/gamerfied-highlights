import { prisma } from "@/lib/prisma";
import type { CS2DemoRenderEngine, DemoRenderStage, RendererAvailability } from "./cs2DemoRenderEngine";

export type RenderJobWithCandidate = Awaited<ReturnType<typeof prisma.renderJob.findUniqueOrThrow>>;

export type QueueRenderInput = {
  jobId: string;
  candidateId: string;
};

export type RenderStatusResult = {
  status: DemoRenderStage;
  outputVideoPath: string | null;
  errorMessage: string | null;
};

export interface VideoRenderProvider {
  getAvailability(): RendererAvailability;
  queueRender(input: QueueRenderInput): Promise<RenderJobWithCandidate>;
  render(renderJobId: string): Promise<RenderJobWithCandidate>;
  getStatus(renderJobId: string): Promise<RenderStatusResult>;
}

export class CS2DemoRenderProvider implements VideoRenderProvider {
  constructor(private readonly engine: CS2DemoRenderEngine) {}

  getAvailability(): RendererAvailability {
    return this.engine.getAvailability();
  }

  async queueRender(input: QueueRenderInput): Promise<RenderJobWithCandidate> {
    const candidate = await prisma.highlightCandidate.findFirst({
      where: {
        id: input.candidateId,
        jobId: input.jobId
      },
      include: {
        job: true
      }
    });

    if (!candidate) {
      throw new Error("Highlight candidate not found");
    }

    if (!candidate.job.demoFilePath) {
      throw new Error("Demo file is required for rendering");
    }

    const availability = this.engine.getAvailability();

    const renderJob = await prisma.renderJob.create({
      data: {
        jobId: input.jobId,
        candidateId: input.candidateId,
        sourceVideoPath: null,
        outputVideoPath: null,
        status: availability.configured ? "QUEUED" : "WAITING_FOR_RENDERER",
        startTimeSeconds: candidate.startTimeSeconds ?? 0,
        endTimeSeconds: candidate.endTimeSeconds ?? 0,
        durationSeconds: Math.max(0, (candidate.endTimeSeconds ?? 0) - (candidate.startTimeSeconds ?? 0)),
        errorMessage: availability.configured ? null : availability.message
      },
      include: {
        candidate: true
      }
    });

    await prisma.highlightJob.update({
      where: { id: input.jobId },
      data: { status: "RENDER_QUEUED" }
    });

    return renderJob;
  }

  async render(renderJobId: string): Promise<RenderJobWithCandidate> {
    const renderJob = await prisma.renderJob.findUnique({
      where: { id: renderJobId },
      include: {
        candidate: true,
        job: true
      }
    });

    if (!renderJob) {
      throw new Error("Render job not found");
    }

    if (!renderJob.job.demoFilePath) {
      await prisma.renderJob.update({
        where: { id: renderJobId },
        data: {
          status: "FAILED",
          errorMessage: "Demo file is required for rendering"
        }
      });

      return prisma.renderJob.findUniqueOrThrow({
        where: { id: renderJobId },
        include: { candidate: true }
      });
    }

    const result = await this.engine.render({
      renderJobId,
      demoPath: renderJob.job.demoFilePath,
      highlightCandidate: {
        id: renderJob.candidate.id,
        type: renderJob.candidate.type,
        playerName: renderJob.candidate.playerName,
        roundNumber: renderJob.candidate.roundNumber,
        startTick: renderJob.candidate.startTick,
        endTick: renderJob.candidate.endTick,
        score: renderJob.candidate.score
      },
      startTick: renderJob.candidate.startTick,
      endTick: renderJob.candidate.endTick
    });

    await prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: result.status,
        outputVideoPath: result.outputVideoPath,
        errorMessage: result.errorMessage
      }
    });

    if (result.status === "COMPLETED") {
      await prisma.highlightJob.update({
        where: { id: renderJob.jobId },
        data: { status: "DONE" }
      });
    }

    return prisma.renderJob.findUniqueOrThrow({
      where: { id: renderJobId },
      include: { candidate: true }
    });
  }

  async getStatus(renderJobId: string): Promise<RenderStatusResult> {
    const renderJob = await prisma.renderJob.findUniqueOrThrow({
      where: { id: renderJobId }
    });

    return {
      status: renderJob.status,
      outputVideoPath: renderJob.outputVideoPath,
      errorMessage: renderJob.errorMessage
    };
  }
}
