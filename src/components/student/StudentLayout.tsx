import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import {
    SquaresFour, CalendarBlank, ClipboardText, Books, MapTrifold, BookOpen, ChatCircle, SignOut,
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { useActivityPing } from '../../lib/useActivityPing';
import { UserMenu } from '../UserMenu';
import { SettingsPanel } from '../SettingsPanel';

const BASE_PATH = '/student';

export function StudentLayout() {
    const { logout } = useAuth();
    const { theme, sidebarMode, t } = useSettings();
    useActivityPing();
    const navigate = useNavigate();
    const location = useLocation();
    const [resetKey, setResetKey] = useState(0);

    const isDark = theme === 'dark';
    const isExpanded = sidebarMode === 'visible';
    const [isExamMode, setIsExamMode] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ active: boolean }>).detail;
            setIsExamMode(detail?.active ?? false);
        };
        window.addEventListener('educare:exam-mode', handler);
        return () => window.removeEventListener('educare:exam-mode', handler);
    }, []);

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

    const handleNavClick = (item: typeof navItems[number]) => (e: React.MouseEvent) => {
        const targetPath = item.to === '.' ? BASE_PATH : `${BASE_PATH}/${item.to}`;
        const isActive = item.end
            ? location.pathname === targetPath
            : location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`);

        if (isActive) {
            e.preventDefault();
            setResetKey(k => k + 1);
            navigate(targetPath, { replace: true });
            const mainContent = document.querySelector('main .overflow-auto');
            if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className={cn("min-h-screen flex transition-colors duration-300", isDark ? "bg-[#0a0a0a]" : "bg-[#111111]")} style={{ fontFamily: "'Nunito', sans-serif" }}>
            <aside className={cn(
                "flex flex-col items-center py-5 sticky top-0 h-screen z-20 shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
                "bg-[#0a0a0a]",
                isExamMode
                    ? "w-0 pointer-events-none"
                    : isExpanded ? "w-60" : "group/sidebar w-20 hover:w-60"
            )}>
                <Link to={BASE_PATH} className="mb-6 flex items-center pl-4 w-full h-14 cursor-pointer hover:opacity-90 transition-opacity">
                    <img src="/logo.svg" alt="SlothubEdu" className="w-12 h-12 shrink-0 rounded-xl block" />
                    <span className={cn("ml-3 text-white font-extrabold text-lg whitespace-nowrap", labelClass)}>
                        Slothub<span className="text-[#FF6B4A]">Edu</span>
                    </span>
                </Link>

                <nav className="flex-1 flex flex-col gap-1 w-full px-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            end={item.end}
                            onClick={handleNavClick(item)}
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
                        backgroundColor: isDark ? '#0B192C' : '#F7F7F2',
                        backgroundImage: isDark
                            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23FFFFFF' fill-opacity='0.05' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E")`
                            : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%231A1A1A' fill-opacity='0.12' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E")`,
                        backgroundBlendMode: 'normal',
                    }}
                >
                    <Outlet key={resetKey} />
                    {/* Exam mode top banner */}
                    {isExamMode && (
                        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-600 text-white text-xs font-extrabold px-4 py-2 rounded-2xl shadow-lg animate-pulse pointer-events-none select-none border-2 border-red-400">
                            <span className="w-2 h-2 rounded-full bg-white inline-block" />
                            ĐANG LÀM BÀI KIỂM TRA
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
