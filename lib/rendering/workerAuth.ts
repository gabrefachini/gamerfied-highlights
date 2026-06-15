import { env } from "@/lib/env";

export function assertRenderWorkerAuthorized(request: Request) {
  const provided = request.headers.get("x-render-worker-key") || "";
  if (!env.renderWorkerApiKey || provided !== env.renderWorkerApiKey) {
    throw new Error("Unauthorized render worker request");
  }
}
