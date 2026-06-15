import type { HighlightCandidate } from "@prisma/client";

export type RendererAvailability = {
  configured: boolean;
  message: string;
  ctaLabel: string;
};

export type DemoRenderStage =
  | "QUEUED"
  | "WAITING_FOR_RENDERER"
  | "LAUNCHING_GAME"
  | "LOADING_DEMO"
  | "SEEKING_TICK"
  | "CAPTURING"
  | "POST_PROCESSING"
  | "RENDERING"
  | "COMPLETED"
  | "FAILED";

export type CS2DemoRenderInput = {
  renderJobId: string;
  demoPath: string;
  highlightCandidate: Pick<
    HighlightCandidate,
    "id" | "type" | "playerName" | "roundNumber" | "startTick" | "endTick" | "score"
  >;
  startTick: number;
  endTick: number;
};

export type CS2DemoRenderResult = {
  status: DemoRenderStage;
  outputVideoPath: string | null;
  errorMessage: string | null;
};

export interface CS2DemoRenderEngine {
  getAvailability(): RendererAvailability;
  render(input: CS2DemoRenderInput): Promise<CS2DemoRenderResult>;
}
