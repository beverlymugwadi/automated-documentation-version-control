export default function DiffView({ hunks }) {
  if (!hunks || hunks.length === 0) {
    return (
      <div className="diff-empty">
        No differences found between these versions.
      </div>
    );
  }

  return (
    <div className="diff-view">
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className="diff-hunk">
          <div className="diff-hunk-header">{hunk.header}</div>
          {hunk.lines.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className={`diff-line diff-line--${line.type}`}
            >
              <span className="diff-line-indicator">
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
              </span>
              <span className="diff-line-text">{line.text}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}