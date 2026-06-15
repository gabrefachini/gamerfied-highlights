import type { CS2DemoRenderEngine, CS2DemoRenderInput, CS2DemoRenderResult, RendererAvailability } from "./cs2DemoRenderEngine";

const availability: RendererAvailability = {
  configured: false,
  message: "Renderer not configured yet.",
  ctaLabel: "Renderer setup required"
};

export class UnconfiguredCS2DemoRenderEngine implements CS2DemoRenderEngine {
  getAvailability(): RendererAvailability {
    return availability;
  }

  async render(_input: CS2DemoRenderInput): Promise<CS2DemoRenderResult> {
    return {
      status: "WAITING_FOR_RENDERER",
      outputVideoPath: null,
      errorMessage: "Renderer not configured yet."
    };
  }
}

export const unconfiguredCS2DemoRenderEngine = new UnconfiguredCS2DemoRenderEngine();
