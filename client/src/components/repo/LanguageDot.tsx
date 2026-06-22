const COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', Ruby: '#701516', CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051',
};

export function LanguageDot({ language }: { language: string | null }) {
  if (!language) return null;
  const color = COLORS[language] ?? 'var(--muted)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span className="lang-dot" style={{ background: color }} />
      {language}
    </span>
  );
}