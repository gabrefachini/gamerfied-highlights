import type { CS2DemoRenderEngine, CS2DemoRenderInput, CS2DemoRenderResult, RendererAvailability } from "./cs2DemoRenderEngine";

const availability: RendererAvailability = {
  configured: true,
  message: "Remote Windows renderer is enabled.",
  ctaLabel: "Generate from demo"
};

export class RemoteWorkerDemoRenderEngine implements CS2DemoRenderEngine {
  getAvailability(): RendererAvailability {
    return availability;
  }

  async render(_input: CS2DemoRenderInput): Promise<CS2DemoRenderResult> {
    return {
      status: "QUEUED",
      outputVideoPath: null,
      errorMessage: null
    };
  }
}

export const remoteWorkerDemoRenderEngine = new RemoteWorkerDemoRenderEngine();
