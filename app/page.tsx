import { UploadForm } from "@/components/UploadForm";

export default function HomePage() {
  return (
    <section className="page hero">
      <div className="hero-copy">
        <p className="eyebrow">Workflow Step 01</p>
        <h1>Create your CS highlight.</h1>
        <p>Upload a demo. The app analyzes match events and surfaces the cleanest moments to render from the demo.</p>
        <div className="steps" aria-label="Highlight flow">
          {["Upload .dem", "Analyze demo events", "Pick the best moment", "Render from demo"].map(
            (step, index) => (
              <div className="step" key={step}>
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </div>
            )
          )}
        </div>
      </div>
      <UploadForm />
    </section>
  );
}
