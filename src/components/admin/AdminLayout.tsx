import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    SquaresFour, Users, Books, CalendarBlank, Question, ChartBar, SignOut, List,
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

const navItems = [
    { to: ".", label: "Tổng quan", icon: SquaresFour, end: true },
    { to: "users", label: "Người dùng", icon: Users },
    { to: "classes", label: "Lớp học", icon: Books },
    { to: "schedule", label: "Thời khóa biểu", icon: CalendarBlank },
    { to: "questions", label: "Ngân hàng câu hỏi", icon: Question },
    { to: "statistics", label: "Thống kê", icon: ChartBar },
];

export function AdminLayout() {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="h-screen flex bg-[#111111] overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Sidebar — click to expand/collapse */}
            <aside
                className={cn(
                    "flex flex-col items-center py-5 h-full z-20 shrink-0 overflow-hidden bg-[#1A1A1A] transition-[width] duration-300 ease-in-out",
                    sidebarOpen ? "w-60" : "w-20"
                )}
            >
                {/* Logo + toggle button row */}
                <div className="mb-6 flex items-center w-full px-3 h-16 justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src="/logo.svg" alt="AntiEdu" className="w-12 h-12 shrink-0 rounded-xl block" />
                        {sidebarOpen && (
                            <span className="text-white font-extrabold text-xl whitespace-nowrap">
                                Anti<span className="text-[#FF6B4A]">Edu</span>
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setSidebarOpen(p => !p)}
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
                        title={sidebarOpen ? "Thu gọn" : "Mở rộng"}
                    >
                        <List className="w-5 h-5" weight="bold" />
                    </button>
                </div>

                <nav className="flex-1 flex flex-col gap-1 w-full px-2">
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
                            title={!sidebarOpen ? item.label : undefined}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className="w-6 h-6 shrink-0" weight={isActive ? 'fill' : 'regular'} />
                                    {sidebarOpen && (
                                        <span className="text-sm font-extrabold whitespace-nowrap overflow-hidden">
                                            {item.label}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="flex flex-col gap-2 w-full px-2 mt-auto">
                    <div className="flex items-center gap-3 px-3 py-2 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-extrabold text-sm shrink-0 ring-2 ring-white/20">
                            {user?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        {sidebarOpen && (
                            <div className="overflow-hidden min-w-0">
                                <p className="text-white text-xs font-extrabold whitespace-nowrap">{user?.name || 'Quản trị viên'}</p>
                                <p className="text-gray-500 text-[10px] whitespace-nowrap truncate">{user?.email || 'admin@system.com'}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={logout}
                        title={!sidebarOpen ? "Đăng xuất" : undefined}
                        className="flex items-center gap-3 px-3 py-3 rounded-2xl text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors w-full"
                    >
                        <SignOut className="w-5 h-5 shrink-0" />
                        {sidebarOpen && (
                            <span className="text-sm font-extrabold whitespace-nowrap">Đăng xuất</span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Dark canvas with floating content panel */}
            <main className="flex-1 overflow-auto h-full p-3">
                <div className="min-h-full bg-[#F7F7F2] rounded-3xl overflow-auto shadow-2xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
