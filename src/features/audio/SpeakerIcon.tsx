/** The one speaker icon used by every play button in the app. */
export function SpeakerIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M9.4 3.2a.75.75 0 0 1 1.1.66v12.28a.75.75 0 0 1-1.1.66L5.3 14H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2.3l4.1-2.8ZM13.5 6.4a.75.75 0 0 1 1.05.1 5.5 5.5 0 0 1 0 7 .75.75 0 1 1-1.15-.96 4 4 0 0 0 0-5.08.75.75 0 0 1 .1-1.06Z" />
    </svg>
  );
}
