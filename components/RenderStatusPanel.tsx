"use client";

import { useEffect, useMemo, useState } from "react";

type RenderJob = {
  id: string;
  status:
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
  outputVideoPath: string | null;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  errorMessage: string | null;
  candidate: {
    type: string;
    playerName: string | null;
    kills: number;
    roundNumber: number | null;
  };
  providerStatus?: {
    status:
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
    outputVideoPath: string | null;
    errorMessage: string | null;
  };
};

const STATUS_COPY: Record<RenderJob["status"], { eyebrow: string; title: string; badge: string }> = {
  QUEUED: { eyebrow: "Render Queued", title: "Render queued.", badge: "QUEUED" },
  WAITING_FOR_RENDERER: { eyebrow: "Renderer Required", title: "Renderer setup required.", badge: "WAITING_FOR_RENDERER" },
  LAUNCHING_GAME: { eyebrow: "Launching Game", title: "Launching CS2 renderer.", badge: "LAUNCHING_GAME" },
  LOADING_DEMO: { eyebrow: "Loading Demo", title: "Loading demo.", badge: "LOADING_DEMO" },
  SEEKING_TICK: { eyebrow: "Seeking Tick", title: "Seeking highlight tick.", badge: "SEEKING_TICK" },
  CAPTURING: { eyebrow: "Capturing", title: "Capturing highlight.", badge: "CAPTURING" },
  POST_PROCESSING: { eyebrow: "Post Processing", title: "Post-processing capture.", badge: "POST_PROCESSING" },
  RENDERING: { eyebrow: "Rendering", title: "Rendering highlight.", badge: "RENDERING" },
  COMPLETED: { eyebrow: "Completed", title: "Highlight ready.", badge: "COMPLETED" },
  FAILED: { eyebrow: "Failed", title: "Render failed.", badge: "FAILED" }
};

export function RenderStatusPanel({ renderId, initialRenderJob }: { renderId: string; initialRenderJob: RenderJob | null }) {
  const [renderJob, setRenderJob] = useState<RenderJob | null>(initialRenderJob);
  const [error, setError] = useState("");
  const isTerminal = useMemo(() => ["COMPLETED", "FAILED"].includes(renderJob?.status || ""), [renderJob?.status]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/render-jobs/${renderId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load render job");
        if (!cancelled) setRenderJob(payload.renderJob);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load render job");
      }
    }

    if (!renderJob) void load();
    if (isTerminal) {
      return () => {
        cancelled = true;
      };
    }

    const interval = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isTerminal, renderId, renderJob]);

  if (error) return <p className="error">{error}</p>;
  if (!renderJob) return <p className="muted">Loading render job...</p>;

  const statusCopy = STATUS_COPY[renderJob.status];
  return (
    <section className="status-layout">
      <div className="status-head">
        <p className="eyebrow">{statusCopy.eyebrow}</p>
        <span className="pill">{statusCopy.badge}</span>
        <h1>{statusCopy.title}</h1>
        <p className="muted">Render ID: {renderId}</p>
      </div>
      <div className="result-grid">
        <div>
          <div className="video-card">
            <span className="timecode">{statusCopy.badge}</span>
          </div>
          <div className="details">
            <span className="detail-chip">{renderJob.candidate.type}</span>
            <span className="detail-chip">{renderJob.candidate.kills} kills</span>
            <span className="detail-chip">Round {renderJob.candidate.roundNumber || "-"}</span>
            <span className="detail-chip">{renderJob.durationSeconds.toFixed(2)}s</span>
          </div>
        </div>
        <aside className="panel">
          <p className="eyebrow">Selected Moment</p>
          <h2>{renderJob.candidate.playerName || "Unknown player"}</h2>
          <p className="muted">
            {renderJob.status === "COMPLETED"
              ? "The MP4 clip is ready for preview and download."
              : renderJob.status === "WAITING_FOR_RENDERER"
                ? "Renderer not configured yet."
                : ["LAUNCHING_GAME", "LOADING_DEMO", "SEEKING_TICK", "CAPTURING", "POST_PROCESSING", "RENDERING"].includes(
                    renderJob.status
                  )
                  ? "Rendering highlight from demo."
                : renderJob.status === "FAILED"
                  ? "The configured demo renderer could not generate the highlight clip."
                  : "Render queued. The demo renderer will process the selected highlight."}
          </p>
          <div className="details">
            <span className="detail-chip">Start {renderJob.startTimeSeconds.toFixed(2)}s</span>
            <span className="detail-chip">End {renderJob.endTimeSeconds.toFixed(2)}s</span>
            {renderJob.outputVideoPath ? <span className="detail-chip">{renderJob.outputVideoPath}</span> : null}
          </div>
          {renderJob.status === "COMPLETED" ? (
            <video className="render-preview" controls preload="metadata" src={`/api/render-jobs/${renderId}/video`} />
          ) : null}
          {renderJob.errorMessage ? <p className="error">{renderJob.errorMessage}</p> : null}
          <div className="result-actions">
            {renderJob.status === "COMPLETED" ? (
              <a className="button" download href={`/api/render-jobs/${renderId}/video`}>
                Download MP4
              </a>
            ) : (
              <button className="button" disabled type="button">
                Download MP4
              </button>
            )}
            <button className="button secondary" disabled type="button">
              Copy link
            </button>
            <button className="button secondary" disabled type="button">
              Share
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
