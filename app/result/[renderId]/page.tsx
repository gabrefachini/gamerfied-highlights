import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: { renderId: string } }) {
  const renderJob = await prisma.renderJob.findUnique({
    where: { id: params.renderId },
    include: {
      candidate: true
    }
  });
  const isReady = Boolean(renderJob?.videoUrl || renderJob?.status === "DONE");

  return (
    <section className="status-layout">
      <div className="status-head">
        <p className="eyebrow">{isReady ? "Result Phase" : "Workflow Step 03"}</p>
        <span className="pill">{renderJob?.status || "NOT_FOUND"}</span>
        <h1>{isReady ? "Highlight ready." : "Generate your video."}</h1>
        <p className="muted">Render ID: {params.renderId}</p>
      </div>
      {renderJob ? (
        <div className="result-grid">
          <div>
            <div className="video-card">
              <span className="timecode">{isReady ? "READY" : "QUEUED"}</span>
            </div>
            <div className="details">
              <span className="detail-chip">{renderJob.candidate.type}</span>
              <span className="detail-chip">{renderJob.candidate.kills} kills</span>
              <span className="detail-chip">Round {renderJob.candidate.roundNumber || "-"}</span>
              <span className="detail-chip">MP4 later</span>
            </div>
          </div>
          <aside className="panel">
            <p className="eyebrow">Selected Moment</p>
            <h2>{renderJob.candidate.playerName || "Unknown player"}</h2>
            <p className="muted">
              {isReady
                ? "The render is ready for download and sharing."
                : "The real renderer is intentionally deferred. This placeholder is ready for future video generation."}
            </p>
            <div className="result-actions">
              {renderJob.videoUrl ? (
                <a className="button" href={renderJob.videoUrl}>
                  Download
                </a>
              ) : (
                <button className="button" disabled type="button">
                  Rendering later
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
      ) : (
        <p className="error">Render job not found.</p>
      )}
    </section>
  );
}
