import { useSettings } from '../context/SettingsContext';
import { Translate } from '@phosphor-icons/react';

/**
 * Small inline language switcher for public pages (landing, login).
 * Shows current language and toggles on click.
 */
export function LanguageSwitcher() {
  const { language, setLanguage } = useSettings();

  const toggle = () => setLanguage(language === 'vi' ? 'en' : 'vi');

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 text-sm font-extrabold text-[#1A1A1A]/60 hover:text-[#FF6B4A] transition-colors px-2 py-1 rounded-xl hover:bg-black/5"
      title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      <Translate size={18} weight="bold" />
      <span>{language === 'vi' ? 'EN' : 'VI'}</span>
    </button>
  );
}
