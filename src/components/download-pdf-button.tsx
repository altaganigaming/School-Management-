"use client";

export function DownloadPdfButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary mt-4 w-full print-hidden">
      Download PDF
    </button>
  );
}