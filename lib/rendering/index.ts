import { CS2DemoRenderProvider } from "./demoRenderProvider";
import { env } from "@/lib/env";
import { remoteWorkerDemoRenderEngine } from "./remoteWorkerDemoRenderEngine";
import { unconfiguredCS2DemoRenderEngine } from "./unconfiguredDemoRenderEngine";

export function getVideoRenderProvider() {
  const engine = env.rendererMode === "windows-worker" ? remoteWorkerDemoRenderEngine : unconfiguredCS2DemoRenderEngine;
  return new CS2DemoRenderProvider(engine);
}
