'use client';
/** "Download" an event's details: the browser's print dialog, where Save as PDF lives. */
export function PrintButton() {
  return <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => window.print()}>Print or save as PDF</button>;
}
