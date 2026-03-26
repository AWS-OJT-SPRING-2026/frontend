import { useEffect, useRef, useState } from 'react';
import { UserCircle, Headset, X, PaperPlaneTilt, Phone } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { formatDisplayId } from '../lib/profileMappings';

interface UserMenuProps {
    role: 'student' | 'teacher';
}

export function UserMenu({ role }: UserMenuProps) {
    const { user } = useAuth();
    const { t } = useSettings();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'support' | null>(null);
    const [displayId, setDisplayId] = useState(() => formatDisplayId(role, user?.id));
    const menuRef = useRef<HTMLDivElement | null>(null);

    // Support States
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState<{ type: 'user' | 'admin', text: string }[]>([
        { type: 'admin', text: t.userMenu.supportGreeting }
    ]);

    const handleSendMessage = () => {
        if (!message.trim()) return;
        setChat([...chat, { type: 'user', text: message }]);
        setMessage('');
        setTimeout(() => {
            setChat(prev => [...prev, { type: 'admin', text: t.userMenu.thankYou }]);
        }, 1000);
    };

    useEffect(() => {
        let isCancelled = false;

        const loadProfileId = async () => {
            if (!user) {
                setDisplayId(formatDisplayId(role, undefined));
                return;
            }

            const token = authService.getToken();
            if (!token || authService.isQuickDemoSession()) {
                setDisplayId(formatDisplayId(role, user.id));
                return;
            }

            try {
                const profile = await profileService.getMyProfile(token);
                const sourceId = profile.studentID ?? profile.teacherID ?? profile.userID ?? user.id;
                if (!isCancelled) {
                    setDisplayId(formatDisplayId(role, sourceId));
                }
            } catch {
                if (!isCancelled) {
                    setDisplayId(formatDisplayId(role, user.id));
                }
            }
        };

        void loadProfileId();

        return () => {
            isCancelled = true;
        };
    }, [role, user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    return (
        <div ref={menuRef} className="relative">
            {/* User Trigger */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5 rounded-2xl transition-colors"
            >
                {user?.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user?.name || 'User'}
                        className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/20 shadow-lg"
                    />
                ) : (
                    <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0 ring-2 ring-white/20 shadow-lg",
                        role === 'teacher' ? 'bg-emerald-500' : 'bg-[#FF6B4A]'
                    )}>
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                )}
                <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 delay-100 overflow-hidden text-left">
                    <p className="text-white text-xs font-extrabold whitespace-nowrap">{user?.name || 'User'}</p>
                    <p className="text-gray-500 text-[10px] whitespace-nowrap">{displayId}</p>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1A1A1A] border-2 border-[#333] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
                    <button 
                        onClick={() => { navigate('account'); setIsOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all font-extrabold text-sm border-b border-[#333]"
                    >
                        <UserCircle size={20} weight="bold" />
                        {t.common.account}
                    </button>
                    <button 
                        onClick={() => { setActiveModal('support'); setIsOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all font-extrabold text-sm"
                    >
                        <Headset size={20} weight="bold" />
                        {t.common.support}
                    </button>
                </div>
            )}

            {/* Support Modal */}
            {activeModal === 'support' && (
                <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#F7F7F2] w-full max-w-lg rounded-[32px] border-2 border-[#1A1A1A] overflow-hidden shadow-2xl flex flex-col h-[600px] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 bg-white border-b-2 border-[#1A1A1A] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#FCE38A] rounded-2xl border-2 border-[#1A1A1A] flex items-center justify-center">
                                    <Headset size={24} weight="fill" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-lg font-extrabold text-[#1A1A1A]">{t.userMenu.supportTitle}</h2>
                                    <p className="text-[10px] font-extrabold text-emerald-500 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {t.userMenu.adminOnline}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-[#1A1A1A]/5 rounded-xl">
                                <X size={24} weight="bold" />
                            </button>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                            {chat.map((msg, i) => (
                                <div key={i} className={cn(
                                    "flex",
                                    msg.type === 'user' ? "justify-end" : "justify-start"
                                )}>
                                    <div className={cn(
                                        "max-w-[80%] px-4 py-3 rounded-2xl font-bold text-sm shadow-sm border",
                                        msg.type === 'user' 
                                            ? "bg-[#1A1A1A] text-white border-transparent" 
                                            : "bg-white text-[#1A1A1A] border-[#1A1A1A]/10"
                                    )}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Hotline Section */}
                        <div className="px-6 py-4 bg-[#FCE38A]/30 border-t-2 border-[#1A1A1A]/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Phone size={20} weight="fill" className="text-[#1A1A1A]" />
                                <div className="text-left">
                                    <p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-widest leading-none mb-1">{t.userMenu.hotline}</p>
                                    <p className="text-sm font-extrabold text-[#1A1A1A]">1900 6688 (Admin)</p>
                                </div>
                            </div>
                            <a href="tel:19006688" className="bg-[#1A1A1A] text-white px-4 py-2 rounded-xl text-xs font-extrabold">{t.userMenu.callNow}</a>
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t-2 border-[#1A1A1A]">
                            <div className="relative">
                                <input 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder={t.userMenu.inputPlaceholder}
                                    className="w-full bg-[#F7F7F2] border-2 border-[#1A1A1A]/10 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:border-[#FF6B4A] pr-16 text-left" 
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FF6B4A] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                                >
                                    <PaperPlaneTilt size={20} weight="fill" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
