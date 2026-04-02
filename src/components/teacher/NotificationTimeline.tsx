import { useEffect, useState } from 'react';
import {
    X, Bell, ClipboardText,
    Student, GearSix, Info, Clock,
} from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { authService } from '../../services/authService';
import { classroomService, type ClassNotification } from '../../services/classroomService';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type NotifCategory = 'ALL' | 'GRADE' | 'ATTENDANCE' | 'SYSTEM';

interface Notification {
    id:        number;
    category:  Omit<NotifCategory, 'ALL'>;
    icon:      'grade' | 'attendance' | 'system' | 'info';
    title:     string;
    body:      string;
    time:      string;
    unread:    boolean;
    color:     string;
}

interface Props {
    classId: number;
    onClose: () => void;
}

const TABS: { key: NotifCategory; label: string; Icon: React.ElementType }[] = [
    { key: 'ALL',        label: 'Tất cả',        Icon: Bell         },
    { key: 'GRADE',      label: 'Điểm số',       Icon: ClipboardText },
    { key: 'ATTENDANCE', label: 'Điểm danh',     Icon: Student      },
    { key: 'SYSTEM',     label: 'Hệ thống',      Icon: GearSix      },
];

/* ─── Icon resolver ──────────────────────────────────────────────────────── */
function NotifIcon({ type, color }: { type: Notification['icon']; color: string }) {
    const iconProps = { className: 'w-4 h-4', weight: 'fill' as const };
    return (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white"
             style={{ boxShadow: `0 0 0 1px ${color}55` }}>
            {type === 'grade'      && <ClipboardText  {...iconProps} style={{ color }} />}
            {type === 'attendance' && <Student        {...iconProps} style={{ color: '#d97706' }} />}
            {type === 'system'     && <GearSix        {...iconProps} style={{ color: '#6366f1' }} />}
            {type === 'info'       && <Info           {...iconProps} style={{ color: '#3b82f6' }} />}
        </div>
    );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
function toRelativeTime(iso: string): string {
    const createdAt = new Date(iso).getTime();
    const diffMs = Date.now() - createdAt;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(mins, 1)} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

function toUiNotification(n: ClassNotification): Notification {
    const byCategory = {
        GRADE: { icon: 'grade' as const, color: '#FFB5B5' },
        ATTENDANCE: { icon: 'attendance' as const, color: '#FCE38A' },
        SYSTEM: { icon: 'system' as const, color: '#B8B5FF' },
    };

    const config = byCategory[n.category] ?? { icon: 'info' as const, color: '#B8B5FF' };
    return {
        id: n.id,
        category: n.category,
        icon: config.icon,
        title: n.title,
        body: n.body,
        time: toRelativeTime(n.createdAt),
        unread: false,
        color: config.color,
    };
}

export function NotificationTimeline({ classId, onClose }: Props) {
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState<NotifCategory>('ALL');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = authService.getToken();
        if (!token) {
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        const load = async () => {
            try {
                setIsLoading(true);
                const response = await classroomService.getClassNotifications(classId, token, {
                    category: activeTab,
                    page: 1,
                    size: 50,
                });
                if (!isCancelled) {
                    setNotifications((response.data ?? []).map(toUiNotification));
                }
            } catch {
                if (!isCancelled) setNotifications([]);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        void load();
        return () => {
            isCancelled = true;
        };
    }, [classId, activeTab]);

    const filtered = notifications;

    const unreadCount = notifications.filter(n => n.unread).length;

    /* ── Styles ── */
    const surface = isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]';
    const label   = isDark ? 'text-gray-100'                 : 'text-[#1A1A1A]';
    const muted   = isDark ? 'text-gray-400'                 : 'text-[#1A1A1A]/50';
    const divider = isDark ? 'border-white/10'               : 'border-[#1A1A1A]/10';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
             onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className={`relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border-2 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] flex flex-col max-h-[85vh] ${surface}`}
                style={{ fontFamily: "'Nunito', sans-serif" }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className={`px-6 py-5 border-b-2 flex items-center justify-between shrink-0 ${divider}`}
                     style={{ backgroundColor: isDark ? '#20242b' : '#B8B5FF' }}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center relative ${isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                            <Bell className={`w-5 h-5 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`} weight="fill" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF6B4A] text-white text-[9px] font-extrabold flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h2 className={`font-extrabold text-lg leading-tight ${label}`}>Thông báo</h2>
                            <p className={`text-xs font-bold mt-0.5 ${muted}`}>
                                {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc tất cả'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-100' : 'bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Tabs ── */}
                <div className={`flex gap-2 px-5 py-3 border-b-2 overflow-x-auto shrink-0 ${divider} ${isDark ? 'bg-[#1a1e25]' : 'bg-[#F7F7F2]'}`}>
                    {TABS.map(tab => {
                        const count = tab.key === 'ALL'
                            ? notifications.length
                            : notifications.filter(n => n.category === tab.key).length;
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all ${
                                    active
                                        ? 'bg-[#FF6B4A] text-white shadow-md shadow-[#FF6B4A]/20'
                                        : isDark
                                            ? 'bg-white/5 text-gray-300 hover:bg-white/10'
                                            : 'bg-white text-[#1A1A1A]/60 hover:bg-[#1A1A1A]/5 border border-[#1A1A1A]/10'
                                }`}
                            >
                                <tab.Icon className="w-3.5 h-3.5" weight={active ? 'fill' : 'regular'} />
                                {tab.label}
                                <span className={`text-[9px] px-1 py-0.5 rounded-full ${active ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Timeline list ── */}
                <div className="overflow-y-auto flex-1 p-5">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <Clock className="w-10 h-10 text-gray-300 animate-spin" />
                            <p className={`font-extrabold ${muted}`}>Đang tải thông báo...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12">
                            <Bell className="w-10 h-10 text-gray-300" />
                            <p className={`font-extrabold ${muted}`}>Không có thông báo nào</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline vertical line */}
                            <div className={`absolute left-[19px] top-3 bottom-3 w-0.5 ${isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`} />

                            <div className="space-y-1">
                                {filtered.map((n, idx) => {
                                    // Group header: show date separator when time label changes
                                    const prevTime = idx > 0 ? filtered[idx - 1].time : null;
                                    const showSeparator = prevTime !== n.time;

                                    return (
                                        <div key={n.id}>
                                            {/* Date/time separator */}
                                            {showSeparator && (
                                                <div className="flex items-center gap-2 my-4 first:mt-0">
                                                    <div className={`flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest ${muted} ml-10`}>
                                                        <Clock className="w-3 h-3" />
                                                        {n.time}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Notification row */}
                                            <div className="flex items-start gap-3 group">
                                                {/* Timeline dot + icon */}
                                                <div className="relative shrink-0 mt-0.5">
                                                    <NotifIcon type={n.icon} color={n.color.replace('#', '#')} />
                                                    {n.unread && (
                                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF6B4A] border-2 border-white" />
                                                    )}
                                                </div>

                                                {/* Card */}
                                                <div
                                                    className={`flex-1 p-3.5 rounded-2xl border-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                                                        isDark
                                                            ? 'border-white/10 bg-white/5 hover:bg-white/8'
                                                            : 'border-[#1A1A1A]/10 hover:shadow-[#1A1A1A]/5'
                                                    }`}
                                                    style={{ backgroundColor: isDark ? undefined : n.color + '33' }}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className={`font-extrabold text-sm ${label} leading-snug`}>{n.title}</h4>
                                                        {n.unread && (
                                                            <span className="shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-[#FF6B4A]" />
                                                        )}
                                                    </div>
                                                    <p className={`text-xs font-semibold mt-1 leading-relaxed ${muted}`}>{n.body}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className={`px-6 py-4 border-t-2 shrink-0 ${divider}`}>
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold rounded-2xl transition-colors text-sm shadow-md shadow-[#FF6B4A]/20"
                    >
                        Đóng
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)    scale(1);    }
                }
            `}</style>
        </div>
    );
}
