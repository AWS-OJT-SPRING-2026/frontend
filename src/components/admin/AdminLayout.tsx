import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import {
    SquaresFour, Users, Books, CalendarBlank, ChartBar, SignOut,
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { SettingsPanel } from '../SettingsPanel';

const BASE_PATH = '/admin';

export function AdminLayout() {
    const { user, logout } = useAuth();
    const { theme, sidebarMode, t } = useSettings();
    const isDark = theme === 'dark';
    const isExpanded = sidebarMode === 'visible';
    const navigate = useNavigate();
    const location = useLocation();
    const [resetKey, setResetKey] = useState(0);

    const labelClass = isExpanded
        ? "opacity-100"
        : "opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100";

    const navItems = [
        { to: ".", label: t.admin.overview, icon: SquaresFour, end: true },
        { to: "users", label: t.admin.users, icon: Users },
        { to: "classes", label: t.admin.classes, icon: Books },
        { to: "schedule", label: t.admin.schedule, icon: CalendarBlank },
        { to: "statistics", label: t.admin.statistics, icon: ChartBar },
    ];

    useEffect(() => {
        document.body.classList.add('admin-mode');
        return () => {
            document.body.classList.remove('admin-mode');
        };
    }, []);

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
        <div className={cn("h-screen flex overflow-hidden transition-colors duration-300", isDark ? "bg-[#0a0a0a]" : "bg-[#111111]")} style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Sidebar */}
            <aside
                className={cn(
                    "flex flex-col items-center py-5 h-full z-20 shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
                    "bg-[#0a0a0a]",
                    isExpanded ? "w-60" : "group/sidebar w-20 hover:w-60"
                )}
            >
                <Link to={BASE_PATH} className="mb-6 flex items-center pl-4 w-full h-14 cursor-pointer hover:opacity-90 transition-opacity">
                    <img src="/logo.svg" alt="SlothubEdu" className="w-12 h-12 shrink-0 rounded-xl block" />
                    <span className={cn("ml-3 text-white font-extrabold text-lg whitespace-nowrap", labelClass)}>
                        Slothub<span className="text-[#FF6B4A]">Edu</span>
                    </span>
                </Link>

                <nav className="flex-1 flex flex-col gap-1 w-full px-2">
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
                            title={!isExpanded ? item.label : undefined}
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

                {/* User + Settings + Logout */}
                <div className="flex flex-col gap-2 w-full px-2 mt-auto">
                    <div className="flex items-center gap-3 px-3 py-2 min-w-0">
                        {user?.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user?.name || 'Admin'}
                                className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/20"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-extrabold text-sm shrink-0 ring-2 ring-white/20">
                                {user?.name?.[0]?.toUpperCase() || 'A'}
                            </div>
                        )}
                        <div className={cn("overflow-hidden min-w-0", labelClass)}>
                                <p className="text-white text-xs font-extrabold whitespace-nowrap">{user?.name || t.admin.administrator}</p>
                                <p className="text-gray-500 text-[10px] whitespace-nowrap truncate">{user?.email || 'admin@system.com'}</p>
                        </div>
                    </div>
                    <SettingsPanel labelsVisible={isExpanded} labelClassName={labelClass} />
                    <button
                        onClick={logout}
                        title={!isExpanded ? t.common.logout : undefined}
                        className="flex items-center gap-3 px-3 py-3 rounded-2xl text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors w-full"
                    >
                        <SignOut className="w-5 h-5 shrink-0" />
                        <span className={cn("text-sm font-extrabold whitespace-nowrap", labelClass)}>{t.common.logout}</span>
                    </button>
                </div>
            </aside>

            {/* Dark canvas with floating content panel */}
            <main className="flex-1 overflow-auto h-full p-3">
                <div
                    className={cn(
                        "min-h-full rounded-3xl overflow-auto shadow-2xl transition-colors duration-300",
                        isDark ? "text-gray-200" : "text-[#1A1A1A]"
                    )}
                    style={{
                        backgroundColor: isDark ? '#465C88' : '#F7F7F2',
                        backgroundImage: isDark
                            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23FFFFFF' fill-opacity='0.05' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E")`
                            : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%231A1A1A' fill-opacity='0.12' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E")`,
                        backgroundBlendMode: 'normal',
                    }}
                >
                    <Outlet key={resetKey} />
                </div>
            </main>
        </div>
    );
}
