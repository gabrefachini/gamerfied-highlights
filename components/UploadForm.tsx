"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function UploadForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/highlight-jobs", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed");
      }

      router.push(`/highlights/${payload.job.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel upload-panel" onSubmit={submit}>
      <div className="field">
        <label className="upload-zone" htmlFor="demo">
          <span className="upload-icon">+</span>
          <span className="upload-label">Select demo file</span>
          <span className="muted">Drop in a `.dem` export from CS2.</span>
        </label>
        <input className="file-input" id="demo" name="demo" type="file" accept=".dem" />
      </div>
      <div className="field">
        <label htmlFor="matchLink">Match link</label>
        <input className="input" id="matchLink" name="matchLink" type="url" placeholder="https://..." />
      </div>
      <div className="field">
        <label htmlFor="email">Email placeholder</label>
        <input className="input" id="email" name="email" type="email" placeholder="optional@example.com" />
      </div>
      <div className="button-row">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Analyzing" : "Upload demo"}
        </button>
        <button className="button secondary" disabled={isSubmitting} type="submit">
          Paste match link
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <p className="muted">Match links are stored and marked as pending until link import is implemented.</p>
    </form>
  );
}
