export function PipelineConnector({ running }: { running: boolean }) {
  return (
    <div className={`transform__pipe ${running ? 'transform--running' : ''}`} aria-hidden>
      <svg className="pipe-svg" viewBox="0 0 72 240" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pipe-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--signal)" />
            <stop offset="100%" stopColor="var(--signal-2)" />
          </linearGradient>
        </defs>
        <path className="pipe-path" d="M 4 40 C 40 40, 32 200, 68 200" />
        <path className="pipe-flow" d="M 4 40 C 40 40, 32 200, 68 200" />
      </svg>
      <div className="pipe-progress" />
    </div>
  );
}