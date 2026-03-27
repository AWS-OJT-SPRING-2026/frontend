import { Moon, Sun } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { theme, setTheme, t } = useSettings();
  const isDark = theme === 'dark';

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative h-9 w-[92px] rounded-full border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/40',
        isDark ? 'bg-[#10131a] border-white/15' : 'bg-[#f5f6fa] border-[#1A1A1A]/12',
        className
      )}
      title={isDark ? t.settings.themeLight : t.settings.themeDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={cn(
          'absolute top-1 left-1 h-7 w-7 rounded-full shadow-md transition-transform duration-300',
          'flex items-center justify-center',
          isDark ? 'translate-x-[54px] bg-[#1f2733] text-[#FCE38A]' : 'translate-x-0 bg-white text-[#FF9B3F]'
        )}
      >
        {isDark ? <Moon size={14} weight="fill" /> : <Sun size={14} weight="fill" />}
      </span>

      <span className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
        <Sun
          size={14}
          weight="fill"
          className={cn(isDark ? 'text-gray-500' : 'text-[#FF9B3F]')}
        />
        <Moon
          size={14}
          weight="fill"
          className={cn(isDark ? 'text-[#FCE38A]' : 'text-gray-400')}
        />
      </span>
    </button>
  );
}

