import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import {
    SquaresFour, CalendarBlank, ClipboardText, Books, MapTrifold, BookOpen, ChatCircle, SignOut,
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { UserMenu } from '../UserMenu';
import { SettingsPanel } from '../SettingsPanel';

export function StudentLayout() {
    const { logout } = useAuth();
    const { theme, sidebarMode, t } = useSettings();

    const isDark = theme === 'dark';
    const isExpanded = sidebarMode === 'visible';

    const navItems = [
        { to: ".", label: t.student.overview, icon: SquaresFour, end: true },
        { to: "schedule", label: t.student.studySchedule, icon: CalendarBlank },
        { to: "exercises", label: t.student.exercises, icon: ClipboardText },
        { to: "documents", label: t.student.documents, icon: Books },
        { to: "roadmap", label: t.student.aiRoadmap, icon: MapTrifold },
        { to: "review", label: t.student.review, icon: BookOpen },
        { to: "chat", label: t.student.aiChat, icon: ChatCircle },
    ];

    const labelClass = isExpanded
        ? "opacity-100"
        : "opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100";

    return (
        <div className={cn("min-h-screen flex transition-colors duration-300", isDark ? "bg-[#0a0a0a]" : "bg-[#111111]")} style={{ fontFamily: "'Nunito', sans-serif" }}>
            <aside className={cn(
                "flex flex-col items-center py-5 sticky top-0 h-screen z-20 shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
                isDark ? "bg-[#141414]" : "bg-[#1A1A1A]",
                isExpanded ? "w-60" : "group/sidebar w-20 hover:w-60"
            )}>
                <div className="mb-6 flex items-center pl-4 w-full h-14">
                    <img src="/logo.svg" alt="AntiEdu" className="w-14 h-14 shrink-0 rounded-xl block" />
                    <span className={cn("ml-3 text-white font-extrabold text-lg whitespace-nowrap", labelClass)}>
                        Anti<span className="text-[#FF6B4A]">Edu</span>
                    </span>
                </div>

                <nav className="flex-1 flex flex-col gap-1 w-full px-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 py-3 px-3 rounded-2xl transition-all duration-200",
                                    isActive
                                        ? "bg-[#FF6B4A] text-white"
                                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className="w-6 h-6 shrink-0" weight={isActive ? 'fill' : 'regular'} />
                                    <span className={cn("text-sm font-extrabold whitespace-nowrap overflow-hidden", labelClass)}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex flex-col gap-2 w-full px-2 mt-auto">
                    <UserMenu role="student" labelsVisible={isExpanded} labelClassName={labelClass} />
                    <SettingsPanel labelsVisible={isExpanded} labelClassName={labelClass} />
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-3 rounded-2xl text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors w-full"
                    >
                        <SignOut className="w-5 h-5 shrink-0" />
                        <span className={cn("text-sm font-extrabold whitespace-nowrap", labelClass)}>
                            {t.common.logout}
                        </span>
                    </button>
                </div>
            </aside>

            {/* Dark canvas with floating content panel */}
            <main className="flex-1 h-screen overflow-hidden p-3 relative">
                <div
                    className={cn(
                        "h-full rounded-3xl overflow-auto shadow-2xl relative flex flex-col transition-colors duration-300",
                        isDark ? "text-gray-200" : "text-[#1A1A1A]"
                    )}
                    style={{
                        backgroundColor: isDark ? '#1e1e1e' : '#F7F7F2',
                        backgroundImage: isDark
                            ? 'none'
                            : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%231A1A1A' fill-opacity='0.12' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E"),
                                         radial-gradient(ellipse at center, transparent 20%, #F7F7F2 80%)`,
                        backgroundBlendMode: 'normal',
                    }}
                >
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
