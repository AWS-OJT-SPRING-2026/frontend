import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gear, Sun, Moon, Translate, SidebarSimple, X } from '@phosphor-icons/react';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';

interface SettingsPanelProps {
  /** Whether the sidebar text labels are visible now (used for label opacity) */
  labelsVisible: boolean;
  /** CSS class to apply on label text for show/hide animation */
  labelClassName?: string;
}

export function SettingsPanel({ labelsVisible, labelClassName }: SettingsPanelProps) {
  const { theme, language, sidebarMode, setTheme, setLanguage, setSidebarMode, t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Close on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modalRef.current?.contains(target)) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(p => !p)}
        className="flex items-center gap-3 px-3 py-3 rounded-2xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors w-full"
        title={!labelsVisible ? t.common.settings : undefined}
      >
        <Gear className="w-5 h-5 shrink-0" weight={isOpen ? 'fill' : 'regular'} />
        <span className={cn("text-sm font-extrabold whitespace-nowrap opacity-100", labelsVisible ? "" : labelClassName)}>
          {t.common.settings}
        </span>
      </button>

      {/* Centered modal */}
      {isOpen && typeof document !== 'undefined' && createPortal((
        <div
          className="fixed inset-0 z-[9999] bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div className="h-full w-full flex items-center justify-center p-4 sm:p-6">
            <div
              ref={modalRef}
              className={cn(
                "w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden",
                isDark ? "bg-[#171717] border border-white/10" : "bg-[#FDFDFD] border-2 border-[#1A1A1A]/15"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn("flex items-center justify-between px-6 py-4", isDark ? "border-b border-white/10" : "border-b border-[#1A1A1A]/10 bg-[#F7F7F2]") }>
                <div className="flex items-center gap-2.5">
                  <Gear size={18} weight="fill" className="text-[#FF6B4A]" />
                  <span className={cn("font-extrabold text-base", isDark ? "text-white" : "text-[#1A1A1A]")}>{t.settings.title}</span>
                </div>
                <button onClick={() => setIsOpen(false)} className={cn("p-2 rounded-xl transition-colors", isDark ? "hover:bg-white/10" : "hover:bg-[#1A1A1A]/5")}>
                  <X size={16} className={cn(isDark ? "text-gray-300" : "text-[#1A1A1A]/60")} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[420px]">
                <div className={cn("p-4 md:p-5", isDark ? "bg-[#121212] border-r border-white/10" : "bg-[#F7F7F2] border-r border-[#1A1A1A]/10")}>
                  <p className={cn("text-[11px] font-extrabold uppercase tracking-widest mb-3", isDark ? "text-gray-500" : "text-[#1A1A1A]/50")}>Menu</p>
                  <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FF6B4A]/15 text-[#FF6B4A] border border-[#FF6B4A]/30 font-extrabold text-sm">
                    <Gear size={15} weight="fill" /> Hệ thống
                  </button>
                </div>

                <div className={cn("p-5 md:p-6 space-y-5", isDark ? "bg-[#171717]" : "bg-[#FDFDFD]")}>
                  <div className={cn("rounded-2xl p-4", isDark ? "border border-white/10 bg-white/[0.02]" : "border border-[#1A1A1A]/10 bg-white")}>
                    <div className="flex items-center gap-2 mb-3">
                      {theme === 'light'
                        ? <Sun size={16} weight="fill" className="text-amber-400" />
                        : <Moon size={16} weight="fill" className="text-indigo-300" />
                      }
                      <span className={cn("text-xs font-extrabold uppercase tracking-wider", isDark ? "text-gray-200" : "text-[#1A1A1A]/80")}>{t.settings.theme}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-extrabold transition-all",
                          theme === 'light'
                            ? "bg-[#FF6B4A] text-white shadow-lg shadow-[#FF6B4A]/30"
                            : isDark ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/10 hover:text-[#1A1A1A]"
                        )}
                      >
                        ☀️ {t.settings.themeLight}
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-extrabold transition-all",
                          theme === 'dark'
                            ? "bg-[#FF6B4A] text-white shadow-lg shadow-[#FF6B4A]/30"
                            : isDark ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/10 hover:text-[#1A1A1A]"
                        )}
                      >
                        🌙 {t.settings.themeDark}
                      </button>
                    </div>
                  </div>

                  <div className={cn("rounded-2xl p-4", isDark ? "border border-white/10 bg-white/[0.02]" : "border border-[#1A1A1A]/10 bg-white")}>
                    <div className="flex items-center gap-2 mb-3">
                      <Translate size={16} weight="fill" className="text-emerald-300" />
                      <span className={cn("text-xs font-extrabold uppercase tracking-wider", isDark ? "text-gray-200" : "text-[#1A1A1A]/80")}>{t.settings.language}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setLanguage('vi')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-extrabold transition-all",
                          language === 'vi'
                            ? "bg-[#FF6B4A] text-white shadow-lg shadow-[#FF6B4A]/30"
                            : isDark ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/10 hover:text-[#1A1A1A]"
                        )}
                      >
                        🇻🇳 {t.settings.languageVi}
                      </button>
                      <button
                        onClick={() => setLanguage('en')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-extrabold transition-all",
                          language === 'en'
                            ? "bg-[#FF6B4A] text-white shadow-lg shadow-[#FF6B4A]/30"
                            : isDark ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/10 hover:text-[#1A1A1A]"
                        )}
                      >
                        🇺🇸 {t.settings.languageEn}
                      </button>
                    </div>
                  </div>

                  <div className={cn("rounded-2xl p-4", isDark ? "border border-white/10 bg-white/[0.02]" : "border border-[#1A1A1A]/10 bg-white")}>
                    <div className="flex items-center gap-2 mb-3">
                      <SidebarSimple size={16} weight="fill" className="text-sky-300" />
                      <span className={cn("text-xs font-extrabold uppercase tracking-wider", isDark ? "text-gray-200" : "text-[#1A1A1A]/80")}>{t.settings.sidebar}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSidebarMode('auto')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-extrabold transition-all",
                          sidebarMode === 'auto'
                            ? "bg-[#FF6B4A] text-white shadow-lg shadow-[#FF6B4A]/30"
                            : isDark ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/10 hover:text-[#1A1A1A]"
                        )}
                      >
                        ✨ {t.settings.sidebarAuto}
                      </button>
                      <button
                        onClick={() => setSidebarMode('visible')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-extrabold transition-all",
                          sidebarMode === 'visible'
                            ? "bg-[#FF6B4A] text-white shadow-lg shadow-[#FF6B4A]/30"
                            : isDark ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white" : "bg-[#1A1A1A]/5 text-[#1A1A1A]/70 hover:bg-[#1A1A1A]/10 hover:text-[#1A1A1A]"
                        )}
                      >
                        📌 {t.settings.sidebarVisible}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
