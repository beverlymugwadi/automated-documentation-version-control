import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === 'dark';

  return (
    <button
      className="iconbtn"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      <span
        className="theme-toggle__icon"
        style={{ display: 'grid', placeItems: 'center', transform: isDark ? 'none' : 'rotate(180deg)' }}
      >
        {isDark ? <Moon size={17} /> : <Sun size={17} />}
      </span>
    </button>
  );
}