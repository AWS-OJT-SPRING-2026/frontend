import { Translate } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

/**
 * Small inline language switcher for public pages (landing, login).
 * Shows current language and toggles on click.
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage, theme } = useSettings();
  const isDark = theme === 'dark';

  const toggle = () => setLanguage(language === 'vi' ? 'en' : 'vi');

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center gap-1.5 text-sm font-extrabold transition-colors px-2.5 py-1.5 rounded-xl border',
        isDark
          ? 'text-gray-300 border-white/15 hover:text-white hover:bg-white/10'
          : 'text-[#1A1A1A]/60 border-[#1A1A1A]/10 hover:text-[#FF6B4A] hover:bg-black/5',
        className
      )}
      title={language === 'vi' ? 'Switch to English' : 'Chuyen sang Tieng Viet'}
      aria-label={language === 'vi' ? 'Switch language to English' : 'Chuyen ngon ngu sang Tieng Viet'}
    >
      <Translate size={18} weight="bold" />
      <span>{language === 'vi' ? 'EN' : 'VI'}</span>
    </button>
  );
}
