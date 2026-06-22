export function relativeTime(input: string | number | Date): string {
  if (!input) return '';
  const date = new Date(input);
  const diffMs = Date.now() - date.getTime();
  const min = Math.round(diffMs / 60000);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fullTime(input: string | number | Date): string {
  if (!input) return '';
  return new Date(input).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}