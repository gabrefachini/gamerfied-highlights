import { HighlightPicker } from "@/components/HighlightPicker";

export default function HighlightJobPage({ params }: { params: { jobId: string } }) {
  return <HighlightPicker jobId={params.jobId} />;
}
