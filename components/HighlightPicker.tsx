"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = {
  id: string;
  type: string;
  playerName: string | null;
  roundNumber: number | null;
  startTimeSeconds: number | null;
  endTimeSeconds: number | null;
  kills: number;
  headshots: number;
  score: number;
  confidence: number;
};

type HighlightJob = {
  id: string;
  status: string;
  diagnostics: unknown;
  candidates: Candidate[];
};

type RendererAvailability = {
  configured: boolean;
  message: string;
  ctaLabel: string;
};

const formatTime = (seconds: number | null) => {
  if (!seconds) return "00:00";
  const rounded = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
};

export function HighlightPicker({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<HighlightJob | null>(null);
  const [renderer, setRenderer] = useState<RendererAvailability | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isQueueingRender, setIsQueueingRender] = useState(false);
  const isTerminal = useMemo(() => ["READY_TO_PICK", "FAILED", "RENDER_QUEUED", "DONE"].includes(job?.status || ""), [job]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/highlight-jobs/${jobId}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load job");
        if (!cancelled) {
          setJob(payload.job);
          setRenderer(payload.renderer);
          setSelectedId(payload.job.candidates?.[0]?.id || "");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load job");
      }
    }

    load();
    if (isTerminal) return () => {
      cancelled = true;
    };

    const interval = window.setInterval(load, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isTerminal, jobId]);

  async function queueRender() {
    if (!selectedId) return;
    setIsQueueingRender(true);
    try {
      const response = await fetch("/api/render-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, candidateId: selectedId })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to queue render");
        return;
      }
      router.push(`/result/${payload.renderJob.id}`);
    } finally {
      setIsQueueingRender(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!job) return <p className="muted">Loading job...</p>;

  if (!job.candidates.length && job.status !== "FAILED") {
    return (
      <section className="status-layout processing-shell">
        <div className="processing-panel">
          <p className="eyebrow">Processing Phase</p>
          <h1 className="page-title">Analyzing match...</h1>
          <p className="lead">Finding highlights, calculating rounds, and preparing candidate moments.</p>
          <div className="progress-track" aria-label="Analysis in progress">
            <div className="progress-bar" />
          </div>
          <span className="pill">Systems nominal</span>
          <p className="muted">Job ID: {job.id}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="status-layout">
      <div className="status-head">
        <p className="eyebrow">Selection Phase</p>
        <span className="pill">{job.status}</span>
        <h1>Choose the best moment.</h1>
        <p className="muted">Job ID: {job.id}</p>
      </div>

      {job.status === "FAILED" ? (
        <pre className="panel error">{JSON.stringify(job.diagnostics, null, 2)}</pre>
      ) : null}

      {job.candidates.length ? (
        <>
          <div className="panel upload-panel">
            <p className="eyebrow">Generate From Demo</p>
            <p className="muted">The selected highlight will be rendered from the demo once a CS2/HLAE renderer is configured.</p>
            <p className="muted">{renderer?.message || "Renderer not configured yet."}</p>
          </div>
          <div className="candidate-grid">
            {job.candidates.map((candidate) => (
              <label className={`candidate ${selectedId === candidate.id ? "active" : ""}`} key={candidate.id}>
                <input
                  checked={selectedId === candidate.id}
                  name="candidate"
                  onChange={() => setSelectedId(candidate.id)}
                  type="radio"
                  value={candidate.id}
                />
                <div className="thumb">
                  <span className="timecode">{formatTime(candidate.startTimeSeconds)}</span>
                </div>
                <div className="candidate-copy">
                  <p className="eyebrow">{candidate.type}</p>
                  <h3>{candidate.playerName || "Unknown player"}</h3>
                  <p className="muted">Round {candidate.roundNumber || "-"} highlight candidate with parsed event metadata.</p>
                </div>
                <div className="metrics">
                  <span className="metric">
                    <span className="meta-label">Kills</span>
                    <strong>{candidate.kills}</strong>
                  </span>
                  <span className="metric">
                    <span className="meta-label">HS</span>
                    <strong>{candidate.headshots}</strong>
                  </span>
                  <span className="metric">
                    <span className="meta-label">Round</span>
                    <strong>{candidate.roundNumber || "-"}</strong>
                  </span>
                  <span className="metric">
                    <span className="meta-label">Score</span>
                    <strong>{Math.round(candidate.score)}</strong>
                  </span>
                </div>
                <span className="select-mark" aria-hidden="true">OK</span>
              </label>
            ))}
          </div>
          <button className="button" disabled={isQueueingRender || !renderer?.configured} onClick={queueRender} type="button">
            {isQueueingRender ? "Queueing render..." : renderer?.configured ? "Generate from demo" : renderer?.ctaLabel || "Renderer setup required"}
          </button>
        </>
      ) : (
        <div className="panel">
          <p className="muted">Analyzing demo. Candidates will appear here when parsing is complete.</p>
        </div>
      )}
    </section>
  );
}
