import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    SquaresFour, CalendarBlank, ClipboardText, Books, MapTrifold, BookOpen, ChatCircle, SignOut,
} from '@phosphor-icons/react';
import { cn } from '../../lib/utils';
import { UserMenu } from '../UserMenu';

const navItems = [
    { to: ".", label: "Tổng quan", icon: SquaresFour, end: true },
    { to: "schedule", label: "Lịch học", icon: CalendarBlank },
    { to: "exercises", label: "Bài tập", icon: ClipboardText },
    { to: "documents", label: "Tài liệu", icon: Books },
    { to: "roadmap", label: "Lộ trình AI", icon: MapTrifold },
    { to: "review", label: "Ôn tập", icon: BookOpen },
    { to: "chat", label: "Hỏi đáp AI", icon: ChatCircle },
];

export function StudentLayout() {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen flex bg-[#111111]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <aside className="group/sidebar w-20 hover:w-60 transition-[width] duration-300 ease-in-out bg-[#1A1A1A] flex flex-col items-center py-5 sticky top-0 h-screen z-20 shrink-0 overflow-hidden">
                <div className="mb-6 flex items-center pl-4 w-full h-14">
                    <img src="/logo.svg" alt="AntiEdu" className="w-14 h-14 shrink-0 rounded-xl block" />
                    <span className="ml-3 text-white font-extrabold text-lg whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100">
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
                                    <span className="text-sm font-extrabold whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100 overflow-hidden">
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex flex-col gap-2 w-full px-2 mt-auto">
                    <UserMenu role="student" />
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-3 rounded-2xl text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors w-full"
                    >
                        <SignOut className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-extrabold whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100">
                            Đăng xuất
                        </span>
                    </button>
                </div>
            </aside>

            {/* Dark canvas with floating content panel */}
            <main className="flex-1 h-screen overflow-hidden p-3 relative">
                <div
                    className="h-full rounded-3xl overflow-auto shadow-2xl relative flex flex-col"
                    style={{
                        backgroundColor: '#F7F7F2',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%231A1A1A' fill-opacity='0.12' font-family='sans-serif'%3E%C3%97%3C/text%3E%3C/svg%3E"),
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
