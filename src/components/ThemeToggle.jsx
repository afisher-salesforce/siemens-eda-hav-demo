import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-surface-border hover:border-surface-border-light
                 transition-all duration-200 hover:shadow-card-hover"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <Sun size={16} className="text-th-muted hover:text-amber-400 transition-colors" />
      ) : (
        <Moon size={16} className="text-th-muted hover:text-indigo-500 transition-colors" />
      )}
    </button>
  );
}
