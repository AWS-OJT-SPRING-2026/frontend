import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    Bell, CheckCircle, Warning, Info, Calendar,
    BookOpen, ChatsCircle, ArrowRight, Checks,
} from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import {
    notificationService,
    NotificationItem,
    NotificationCategory,
    IMPORTANT_TYPES,
    SYSTEM_TYPES,
} from '../../services/notificationService';

// ─── Icon / colour per type ───────────────────────────────────────────────────

function getTypeStyle(type: string): { icon: React.ElementType; color: string } {
    if (IMPORTANT_TYPES.includes(type as any)) return { icon: Warning, color: '#EF4444' };
    if (SYSTEM_TYPES.includes(type as any)) return { icon: Calendar, color: '#8B5CF6' };
    if (type === 'FEEDBACK_RECEIVED') return { icon: ChatsCircle, color: '#10B981' };
    if (type === 'TEST_RESULT') return { icon: CheckCircle, color: '#10B981' };
    if (type === 'ASSIGNMENT_NEW') return { icon: BookOpen, color: '#2563EB' };
    return { icon: Info, color: '#FF6B4A' };
}

function getCategoryOf(type: string): NotificationCategory {
    if (IMPORTANT_TYPES.includes(type as any)) return 'IMPORTANT';
    if (SYSTEM_TYPES.includes(type as any)) return 'SYSTEM';
    return 'LEARNING';
}

// ─── Date grouping ────────────────────────────────────────────────────────────

function groupByDate(items: NotificationItem[]): Record<string, NotificationItem[]> {
    const groups: Record<string, NotificationItem[]> = {};
    for (const item of items) {
        const date = parseISO(item.createdAt);
        const key = isToday(date) ? 'Hôm nay' : isYesterday(date) ? 'Hôm qua' : 'Trước đó';
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    }
    return groups;
}

const GROUP_ORDER = ['Hôm nay', 'Hôm qua', 'Trước đó'];

// ─── CTA label ───────────────────────────────────────────────────────────────

function getCtaLabel(type: string): string {
    if (type === 'ASSIGNMENT_DUE_SOON' || type === 'TEST_STARTING') return 'Bắt đầu ngay';
    return 'Xem chi tiết';
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    /** Controlled open state managed by the parent (StudentHomepage). */
    open: boolean;
    onClose: () => void;
}

export function NotificationDropdown({ open, onClose }: Props) {
    const navigate = useNavigate();
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState<NotificationCategory>('ALL');
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 15;

    // ── Fetch ──────────────────────────────────────────────────────────────

    const fetchNotifications = useCallback(async (category: NotificationCategory) => {
        setLoading(true);
        try {
            const data = await notificationService.getMyNotifications(category);
            setItems(data);
            setPage(0);
        } catch {
            // silently fail – notifications are non-critical
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) fetchNotifications(activeTab);
    }, [open, activeTab, fetchNotifications]);

    // ── Actions ─────────────────────────────────────────────────────────────

    const handleMarkRead = async (id: number) => {
        setItems(prev => prev.map(n => n.notificationId === id ? { ...n, isRead: true } : n));
        try {
            await notificationService.markAsRead(id);
        } catch { /* ignore */ }
    };

    const handleMarkAllRead = async () => {
        setItems(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await notificationService.markAllAsRead();
        } catch { /* ignore */ }
    };

    const handleCta = (item: NotificationItem) => {
        handleMarkRead(item.notificationId);
        onClose();
        if (item.actionUrl) {
            let url = item.actionUrl;
            // The backend sends "/student/tests/{id}" for feedback notifications.
            // We map this to the exercises view with a ?resultId= parameter.
            if (url.startsWith('/student/tests/')) {
                const id = url.split('/').pop();
                url = `/student/exercises?resultId=${id}`;
            }
            navigate(url);
        }
    };

    // ── Derived ──────────────────────────────────────────────────────────────

    const unreadCount = items.filter(n => !n.isRead).length;
    const visibleItems = items.slice(0, (page + 1) * PAGE_SIZE);
    const grouped = groupByDate(visibleItems);
    const hasMore = items.length > (page + 1) * PAGE_SIZE;

    // ── Style helpers ─────────────────────────────────────────────────────────

    const bg = isDark ? 'bg-[#1A1A1A] border-2 border-[#EEEEEE]' : 'bg-white border border-gray-200';
    const headerBg = isDark ? 'bg-[#15161a] border-b border-white/10' : 'bg-gray-50 border-b border-gray-100';
    const text = isDark ? 'text-[#f3f4f6]' : 'text-[#1A1A1A]';
    const textMuted = isDark ? 'text-[#94a3b8]' : 'text-gray-400';
    const hoverRow = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
    const tabActive = 'bg-[#FF6B4A] text-white';
    const tabInactive = isDark ? 'text-[#94a3b8] hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100';

    const TABS: { label: string; value: NotificationCategory }[] = [
        { label: 'Tất cả', value: 'ALL' },
        { label: 'Quan trọng', value: 'IMPORTANT' },
        { label: 'Học tập', value: 'LEARNING' },
        { label: 'Hệ thống', value: 'SYSTEM' },
    ];

    if (!open) return null;

    return (
        <div className={`absolute right-0 mt-3 w-96 rounded-3xl shadow-2xl z-[100] overflow-hidden ${bg}`}>

            {/* Header */}
            <div className={`px-5 py-3 flex items-center justify-between ${headerBg}`}>
                <div className="flex items-center gap-2">
                    <h3 className={`font-extrabold text-sm ${text}`}>Thông báo</h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FF6B4A] text-white text-[10px] font-extrabold">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    className="flex items-center gap-1 text-[10px] font-extrabold text-[#FF6B4A] hover:underline uppercase tracking-widest disabled:opacity-40"
                >
                    <Checks className="w-3 h-3" />
                    Đọc tất cả
                </button>
            </div>

            {/* Tabs */}
            <div className={`flex gap-1 px-4 py-2 ${isDark ? 'bg-[#15161a]' : 'bg-gray-50'}`}>
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${activeTab === tab.value ? tabActive : tabInactive}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
                {loading ? (
                    <div className="py-10 flex justify-center">
                        <div className="w-5 h-5 border-2 border-[#FF6B4A] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-2">
                        <Bell className={`w-8 h-8 ${textMuted}`} />
                        <p className={`text-xs font-semibold ${textMuted}`}>Không có thông báo nào</p>
                    </div>
                ) : (
                    GROUP_ORDER.filter(g => grouped[g]).map(groupKey => (
                        <div key={groupKey}>
                            {/* Group label */}
                            <p className={`px-5 py-2 text-[10px] font-extrabold uppercase tracking-widest ${textMuted} ${isDark ? 'bg-white/5' : 'bg-gray-50/80'}`}>
                                {groupKey}
                            </p>

                            {grouped[groupKey].map(n => {
                                const { icon: Icon, color } = getTypeStyle(n.type);
                                const isImportant = getCategoryOf(n.type) === 'IMPORTANT';
                                const relTime = formatDistanceToNow(parseISO(n.createdAt), {
                                    addSuffix: true,
                                    locale: vi,
                                });

                                return (
                                    <div
                                        key={n.notificationId}
                                        onClick={() => handleMarkRead(n.notificationId)}
                                        className={`px-5 py-3 flex gap-3 cursor-pointer relative transition-colors
                                            ${hoverRow}
                                            ${!n.isRead ? (isImportant
                                                ? (isDark ? 'bg-red-900/20' : 'bg-red-50')
                                                : (isDark ? 'bg-[#FF6B4A]/10' : 'bg-blue-50/30'))
                                            : ''}`}
                                    >
                                        {/* Icon */}
                                        <div
                                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                            style={{ backgroundColor: color + '18' }}
                                        >
                                            <Icon className="w-4.5 h-4.5" style={{ color }} weight="fill" />
                                        </div>

                                        {/* Body */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                                <p className={`text-xs font-extrabold leading-snug line-clamp-1 ${text} ${isImportant && !n.isRead ? 'text-red-500' : ''}`}>
                                                    {n.title}
                                                </p>
                                                <span className={`text-[10px] font-semibold whitespace-nowrap shrink-0 ${textMuted}`}>
                                                    {relTime}
                                                </span>
                                            </div>
                                            <p className={`text-[11px] font-semibold leading-relaxed line-clamp-2 ${textMuted}`}>
                                                {n.content}
                                            </p>
                                            {/* CTA */}
                                            {n.actionUrl && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleCta(n); }}
                                                    className={`mt-1.5 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider ${isImportant ? 'text-red-500' : 'text-[#FF6B4A]'} hover:underline`}
                                                >
                                                    {getCtaLabel(n.type)}
                                                    <ArrowRight className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Unread dot */}
                                        {!n.isRead && (
                                            <div className={`absolute top-1/2 -translate-y-1/2 right-3 w-1.5 h-1.5 rounded-full ${isImportant ? 'bg-red-500' : 'bg-[#FF6B4A]'}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}

                {/* Load more */}
                {hasMore && (
                    <div className="p-3 flex justify-center">
                        <button
                            onClick={() => setPage(p => p + 1)}
                            className={`text-[11px] font-bold text-[#FF6B4A] hover:underline`}
                        >
                            Xem thêm
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
