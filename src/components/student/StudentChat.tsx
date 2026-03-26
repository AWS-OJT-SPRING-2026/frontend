import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkle, PaperPlaneTilt, CircleNotch, CaretLeft, MagnifyingGlass, DotsThreeVertical, Microphone } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { getChatSessions, streamChatMessage, upsertChatSession, type ChatSessionDto } from '../../services/chatService';
import { useSettings } from '../../context/SettingsContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    updatedAt: number;
}

function generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15);
}

function formatSessionTitle(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return 'Cuoc hoi thoai moi';
    return trimmed.length > 25 ? `${trimmed.substring(0, 25)}...` : trimmed;
}

function fromDto(dto: ChatSessionDto): ChatSession {
    return {
        id: dto.sessionId,
        title: dto.title,
        messages: (dto.messages ?? []).map((message) => ({
            role: message.role,
            content: message.content,
            timestamp: new Date(message.timestamp),
        })),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt).getTime() : Date.now(),
    };
}

export function StudentChat() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [isHydrating, setIsHydrating] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const persistSession = useCallback(async (id: string, title: string, sessionMessages: Message[]) => {
        await upsertChatSession({
            sessionId: id,
            title,
            messages: sessionMessages.map((m) => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp.toISOString(),
            })),
        });
    }, []);

    // Initialize chat sessions from backend storage
    useEffect(() => {
        const hydrate = async () => {
            try {
                const remoteSessions = await getChatSessions();
                const mapped = remoteSessions.map(fromDto);
                setSessions(mapped);

                if (mapped.length > 0) {
                    setSessionId(mapped[0].id);
                    setMessages(mapped[0].messages);
                } else {
                    setSessionId(generateSessionId());
                    setMessages([]);
                }
            } catch {
                setSessionId(generateSessionId());
                setMessages([]);
            } finally {
                setIsHydrating(false);
            }
        };

        hydrate();
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading || isHydrating) return;

        const activeSessionId = sessionId || generateSessionId();
        if (!sessionId) {
            setSessionId(activeSessionId);
        }

        const userMessage: Message = {
            role: 'user',
            content: trimmed,
            timestamp: new Date(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const assistantMessage: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
        };

        // Update sessions immediately with user message
        const sessionTitle = formatSessionTitle(trimmed);

        setSessions(prev => {
            const existingSession = prev.find(s => s.id === activeSessionId);
            if (existingSession) {
                return prev.map(s => s.id === activeSessionId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s);
            } else {
                return [{ id: activeSessionId, title: sessionTitle, messages: newMessages, updatedAt: Date.now() }, ...prev];
            }
        });

        // Initialize messages state with user message ONLY
        setMessages(newMessages);

        let currentAssistantContent = '';
        let isFirstChunk = true;

        try {
            await streamChatMessage(trimmed, activeSessionId, (token) => {
                if (isFirstChunk) {
                    setIsLoading(false);
                    isFirstChunk = false;
                }
                currentAssistantContent += token;
                
                // Update the messages state with the new token
                setMessages(prev => {
                    const lastIdx = prev.length - 1;
                    if (lastIdx >= 0 && prev[lastIdx].role === 'assistant') {
                        const updated = [...prev];
                        updated[lastIdx] = { ...updated[lastIdx], content: currentAssistantContent };
                        return updated;
                    } else {
                        return [...prev, { ...assistantMessage, content: currentAssistantContent }];
                    }
                });
            });

            // Once streaming is done, sync with sessions and persist
            const finalMessages = [...newMessages, { ...assistantMessage, content: currentAssistantContent }];
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: finalMessages, updatedAt: Date.now() } : s));
            await persistSession(activeSessionId, sessionTitle, finalMessages);
        } catch {
            const errorMessage: Message = {
                role: 'assistant',
                content: '⚠️ Xin lỗi, mình gặp sự cố khi kết nối. Bạn thử gửi lại nhé!',
                timestamp: new Date(),
            };
            const finalMessages = [...newMessages, errorMessage];
            setMessages(finalMessages);
            setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: finalMessages, updatedAt: Date.now() } : s));
            await persistSession(activeSessionId, sessionTitle, finalMessages);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const createNewSession = async () => {
        const newSessionId = generateSessionId();
        const newSession: ChatSession = {
            id: newSessionId,
            title: 'Cuoc hoi thoai moi',
            messages: [],
            updatedAt: Date.now(),
        };

        setSessions(prev => [newSession, ...prev.filter(s => s.id !== newSessionId)]);
        setSessionId(newSessionId);
        setMessages([]);

        try {
            await persistSession(newSessionId, newSession.title, []);
        } catch {
            // Keep optimistic UI for draft session even if persistence fails.
        }

        inputRef.current?.focus();
    };

    const switchSession = (id: string) => {
        const session = sessions.find(s => s.id === id);
        if (session) {
            setSessionId(id);
            setMessages(session.messages);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="absolute inset-0 flex rounded-3xl overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <style>{`
                .katex-display {
                    background-color: ${isDark ? '#232323' : '#FCE38A'} !important;
                    border: 2px solid ${isDark ? '#3a3a3a' : '#1A1A1A'} !important;
                    border-radius: 12px !important;
                    padding: 16px !important;
                    margin: 16px 0 !important;
                    overflow-x: auto !important;
                    overflow-y: hidden /* Hide scrollbars if unnecessary, but let KaTeX handle its overflowing content inside */ !important;
                    box-shadow: ${isDark ? '0 10px 24px rgba(0,0,0,0.35)' : '4px 4px 0px rgba(26,26,26,1)'} !important;
                    display: block !important;
                }
                .katex-display > .katex {
                    display: block !important;
                    text-align: center !important;
                }
                /* Dành cho công thức chèn trong dòng (inline) */
                span.katex {
                    font-weight: bold !important;
                    color: ${isDark ? '#f3f4f6' : '#1A1A1A'} !important;
                    /* Tuyệt đối KHÔNG gán background, padding hay border vào đây vì sẽ phá vỡ cấu trúc absolute nội bộ của KaTeX */
                }
            `}</style>
            
            {/* Left Sidebar */}
            <div className={`w-80 hidden lg:flex flex-col border-r ${isDark ? 'bg-[#1a1a1f] border-white/10' : 'bg-white border-[#1A1A1A]/10 border-r-2'}`}>
                {/* Sidebar Header */}
                <div className={`h-16 flex items-center px-4 justify-between shrink-0 ${isDark ? 'border-b border-white/10' : 'border-b-2 border-[#1A1A1A]/10'}`}>
                    <button className={`flex items-center gap-2 font-extrabold px-2 py-1.5 rounded-xl transition-colors ${isDark ? 'text-gray-100 hover:bg-white/10' : 'text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                        <CaretLeft className="w-5 h-5" weight="bold" />
                        Chat với AI
                    </button>
                    <button className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'text-gray-200 hover:bg-white/10' : 'text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                        <MagnifyingGlass className="w-5 h-5" weight="bold" />
                    </button>
                </div>

                {/* Chat History List */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                    {/* Section 1 */}
                    <div>
                        <div className="flex items-center justify-between px-2 mb-3">
                            <h3 className={`text-[11px] font-extrabold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Đoạn thoại tương tác</h3>
                            <button onClick={createNewSession} className="text-[#FF6B4A] hover:bg-[#FF6B4A]/10 px-2 py-0.5 rounded-lg text-xs font-black transition-colors">
                                + TẠO MỚI
                            </button>
                        </div>
                        <div className="space-y-1">
                            {sessions.length === 0 ? (
                                <p className="text-xs px-2 text-gray-400 font-bold italic">Chưa có lịch sử chat.</p>
                            ) : (
                                [...sessions].sort((a,b) => b.updatedAt - a.updatedAt).map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => switchSession(session.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors flex items-center justify-between ${
                                            sessionId === session.id
                                                ? isDark ? 'bg-[#2a2f44] border-[#525a80] font-extrabold text-gray-100' : 'bg-[#B8B5FF]/30 border-[#1A1A1A] font-extrabold text-[#1A1A1A]'
                                                : isDark ? 'hover:bg-white/5 border-transparent font-bold text-gray-300' : 'hover:bg-[#1A1A1A]/5 border-transparent font-bold text-[#1A1A1A]/70'
                                        }`}
                                    >
                                        <span className="truncate pr-2">{session.title}</span>
                                        {sessionId === session.id ? (
                                            <div className="w-5 h-5 shrink-0 rounded-full border-2 border-[#1A1A1A] border-t-[#FF6B4A]" />
                                        ) : (
                                            <div className="w-5 h-5 shrink-0 rounded-full border-2 border-[#1A1A1A]/20" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div>
                        <h3 className={`text-[11px] font-extrabold uppercase tracking-widest mb-3 px-2 ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>Luyện tập tình huống</h3>
                        <div className="space-y-1">
                            <button className={`w-full text-left px-3 py-2.5 rounded-xl border-2 border-transparent font-bold transition-colors flex items-center justify-between ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-[#1A1A1A]/5 text-[#1A1A1A]/70'}`}>
                                <span className="truncate pr-2">Giao tiếp sân bay</span>
                                <span className="text-xs font-extrabold text-[#FF6B4A] shrink-0">11/12</span>
                            </button>
                            <button className={`w-full text-left px-3 py-2.5 rounded-xl border-2 border-transparent font-bold transition-colors flex items-center justify-between ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-[#1A1A1A]/5 text-[#1A1A1A]/70'}`}>
                                <span className="truncate pr-2">Viết đoạn văn mô tả</span>
                                <span className="text-xs font-extrabold text-[#95E1D3] shrink-0">20/24</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Insights Card */}
                <div className={`p-4 mt-auto ${isDark ? 'border-t border-white/10 bg-[#1a1a1f]' : 'border-t-2 border-[#1A1A1A]/10 bg-white'}`}>
                    <div className={`rounded-2xl p-4 relative overflow-hidden ${isDark ? 'bg-[#1f2e2c] border border-[#3b5551]' : 'bg-[#95E1D3]/50 border-2 border-[#1A1A1A]'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkle className="w-4 h-4 text-[#1A1A1A]" weight="fill" />
                            <span className={`text-xs font-black ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Truyền cảm hứng (AI)</span>
                        </div>
                        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#18181b] border border-white/10' : 'bg-white border-2 border-[#1A1A1A]'}`}>
                            <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-black mx-auto mb-2">💡</div>
                            <h4 className={`font-extrabold text-center text-sm mb-2 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Chia nhỏ câu hỏi</h4>
                            <p className={`text-[11px] text-center font-bold leading-relaxed ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/70'}`}>Thay vì hỏi toàn bộ bài dài, hãy hỏi từng ý nhỏ. AI sẽ giúp bạn tư duy dễ dàng và tự tin hơn.</p>
                            
                            <div className="flex justify-center gap-1 mt-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]/20" />
                                <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]/20" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative min-h-0">
                {/* Chat Header */}
                <div className={`h-16 flex items-center justify-between px-6 shrink-0 z-10 w-full ${isDark ? 'bg-[#1a1a1f] border-b border-l border-white/10' : 'bg-white border-b-2 border-l-2 border-[#1A1A1A]/10 shadow-sm'}`}>
                    <h2 className={`font-extrabold text-[17px] ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                        {sessions.find(s => s.id === sessionId)?.title || 'Bài tập mới hiện tại'}
                    </h2>
                    <button className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'text-gray-200 hover:bg-white/10' : 'text-[#1A1A1A] hover:bg-[#1A1A1A]/5'}`}>
                        <DotsThreeVertical className="w-6 h-6" weight="bold" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    {/* Welcome Banner - show only when no messages */}
                    {messages.length === 0 && (
                        <div className="max-w-xl mx-auto text-center mb-8 mt-12">
                            <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-[#1A1A1A]">
                                <Sparkle className="w-8 h-8 text-[#FCE38A]" weight="fill" />
                            </div>
                            <h2 className={`text-2xl font-extrabold mb-2 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Hôm nay bạn cần hỗ trợ gì?</h2>
                            <p className={`${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'} font-semibold text-sm mb-6`}>Đặt câu hỏi về bài tập, lý thuyết hoặc yêu cầu giải thích công thức.</p>

                            {/* Suggested Prompts */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                                {[
                                    'Hãy giải thích định luật Ohm',
                                    'Giải phương trình x² - 5x + 6',
                                    'Phân biệt axit và bazơ',
                                    'Đọc hiểu tài liệu lịch sử',
                                ].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                                        className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${isDark ? 'border border-white/10 bg-[#1f1f23] text-gray-300 hover:border-[#ff7849] hover:text-[#ff9a73]' : 'border-2 border-[#1A1A1A]/15 bg-white text-[#1A1A1A]/70 hover:border-[#FF6B4A] hover:text-[#FF6B4A]'}`}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1 w-full`}>
                            <span className={`text-[11px] font-bold text-gray-400 ${msg.role === 'user' ? 'mr-14' : 'ml-14'}`}>
                                {msg.role === 'user' ? 'Học sinh' : 'Slozy AI'} • {formatTime(msg.timestamp)}
                            </span>
                            <div className={`flex items-start gap-4 w-full ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-10 h-10 bg-[#1A1A1A] rounded-2xl border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-sm mt-1">
                                        <Sparkle className="w-5 h-5 text-[#FCE38A]" weight="fill" />
                                    </div>
                                )}
                                <div
                                    className={`rounded-3xl px-6 py-4 shadow-sm max-w-[85%] lg:max-w-[75%] ${
                                        msg.role === 'user'
                                            ? isDark ? 'bg-[#232327] text-gray-100 border border-white/10 rounded-tr-none' : 'bg-white text-[#1A1A1A] border-2 border-[#1A1A1A]/10 rounded-tr-none'
                                            : isDark ? 'bg-[#1c1c20] text-gray-100 border border-white/10 rounded-tl-none' : 'bg-white text-[#1A1A1A] border-2 border-[#1A1A1A]/10 rounded-tl-none'
                                    }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <div className={`prose prose-sm max-w-none overflow-hidden
                                                       prose-p:font-semibold prose-p:text-[15px] prose-p:leading-relaxed prose-p:my-1
                                                       prose-headings:font-extrabold prose-headings:my-2
                                                       prose-strong:font-black
                                                       prose-ul:my-2 prose-li:my-0.5
                                                       prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:rounded-xl ${isDark ? 'prose-invert prose-headings:text-[#ff9a73] prose-strong:text-gray-100 prose-code:text-[#ff9a73] prose-code:bg-[#ff7849]/15 prose-pre:bg-[#111216] prose-pre:text-gray-100' : 'prose-[#1A1A1A] prose-headings:text-[#FF6B4A] prose-strong:text-[#1A1A1A] prose-code:text-[#FF6B4A] prose-code:bg-[#FF6B4A]/10 prose-pre:bg-[#1A1A1A] prose-pre:text-white'}`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="font-semibold text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-10 h-10 rounded-2xl bg-[#FF6B4A] border-2 border-[#1A1A1A] flex items-center justify-center text-white font-extrabold shrink-0 shadow-sm mt-1">
                                        HS
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex flex-col items-start gap-1 w-full">
                            <span className={`text-[11px] font-bold text-gray-400 ml-14`}>
                                Slozy AI • Nhập dữ liệu...
                            </span>
                            <div className="flex items-start gap-4 w-full">
                                <div className="w-10 h-10 bg-[#1A1A1A] rounded-2xl border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-sm mt-1">
                                    <Sparkle className="w-5 h-5 text-[#FCE38A]" weight="fill" />
                                </div>
                                <div className="bg-[#95E1D3]/20 text-[#1A1A1A] rounded-3xl rounded-tl-none px-6 py-4 border-2 border-[#95E1D3] shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <CircleNotch className="w-5 h-5 animate-spin text-[#1A1A1A]" />
                                        <span className="font-extrabold text-sm text-[#1A1A1A]">Đang phân tích và tìm trong Sách lý thuyết...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area (Matched reference layout style) */}
                <div className={`p-5 w-full shrink-0 ${isDark ? 'bg-[#1a1a1f] border-t border-l border-white/10' : 'bg-white border-t-2 border-l-2 border-[#1A1A1A]/10'}`}>
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-3">
                        <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#333333] text-white font-extrabold px-6 py-3.5 rounded-2xl border-2 border-[#1A1A1A] transition-colors shrink-0 shadow-sm group">
                            <Microphone className="w-5 h-5 text-[#FF6B4A] group-hover:scale-110 transition-transform" weight="fill" />
                            Ghi âm câu hỏi
                        </button>
                        
                        <div className={`w-full h-12 md:h-14 rounded-2xl flex items-center pl-4 pr-1.5 transition-colors relative shadow-inner ${isDark ? 'border border-white/10 bg-[#111216] focus-within:border-[#ff7849]' : 'border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] focus-within:border-[#FF6B4A]'}`}>
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                className={`w-full h-full bg-transparent border-none outline-none text-sm font-semibold ${isDark ? 'text-gray-100 placeholder:text-gray-500' : 'text-[#1A1A1A] placeholder:text-[#1A1A1A]/40'}`}
                                placeholder="..."
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-[#FF6B4A] hover:bg-[#ff5535] disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0 shadow-sm"
                            >
                                <PaperPlaneTilt className="w-5 h-5" weight="fill" />
                            </button>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-2 shrink-0">
                            <button className={`px-5 h-14 font-extrabold text-sm rounded-2xl transition-colors ${isDark ? 'bg-[#1f1f23] hover:bg-[#26262b] text-gray-100 border border-white/10' : 'bg-white hover:bg-[#1A1A1A]/5 text-[#1A1A1A] border-2 border-[#1A1A1A]/20'}`}>
                                Xem đánh giá
                            </button>
                            <button className={`px-5 h-14 font-extrabold text-sm rounded-2xl transition-colors ${isDark ? 'bg-[#1f1f23] hover:border-[#ff9a73] hover:text-[#ff9a73] text-gray-100 border border-white/10' : 'bg-white hover:border-[#FF6B4A] hover:text-[#FF6B4A] text-[#1A1A1A] border-2 border-[#1A1A1A]/20'}`}>
                                Kết thúc
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
