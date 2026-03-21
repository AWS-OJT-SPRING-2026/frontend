import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkle, PaperPlaneTilt, CircleNotch, CaretLeft, MagnifyingGlass, DotsThreeVertical, Microphone } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { sendChatMessage } from '../../services/chatService';

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

export function StudentChat() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize or load sessions
    useEffect(() => {
        const stored = localStorage.getItem('educare_chat_sessions');
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as ChatSession[];
                // Map string dates back to Date objects
                parsed.forEach(s => s.messages.forEach(m => m.timestamp = new Date(m.timestamp)));
                setSessions(parsed);
                if (parsed.length > 0) {
                    setSessionId(parsed[0].id);
                    setMessages(parsed[0].messages);
                } else {
                    setSessionId(generateSessionId());
                }
            } catch (e) {
                setSessionId(generateSessionId());
            }
        } else {
            setSessionId(generateSessionId());
        }
    }, []);

    // Save sessions to localStorage whenever they change meaningfully
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('educare_chat_sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: trimmed,
            timestamp: new Date(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        // Update sessions immediately with user message
        setSessions(prev => {
            const existingSession = prev.find(s => s.id === sessionId);
            if (existingSession) {
                return prev.map(s => s.id === sessionId ? { ...s, messages: newMessages, updatedAt: Date.now() } : s);
            } else {
                return [{ id: sessionId, title: trimmed.length > 25 ? trimmed.substring(0, 25) + '...' : trimmed, messages: newMessages, updatedAt: Date.now() }, ...prev];
            }
        });

        try {
            const response = await sendChatMessage(trimmed, sessionId);

            const assistantMessage: Message = {
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            };
            const finalMessages = [...newMessages, assistantMessage];
            setMessages(finalMessages);
            
            // Update sessions with AI response
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: finalMessages, updatedAt: Date.now() } : s));
        } catch {
            const errorMessage: Message = {
                role: 'assistant',
                content: '⚠️ Xin lỗi, mình gặp sự cố khi kết nối. Bạn thử gửi lại nhé!',
                timestamp: new Date(),
            };
            const finalMessages = [...newMessages, errorMessage];
            setMessages(finalMessages);
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: finalMessages, updatedAt: Date.now() } : s));
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const createNewSession = () => {
        setSessionId(generateSessionId());
        setMessages([]);
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
        <div className="absolute inset-0 flex bg-[#F7F7F2] rounded-3xl overflow-hidden" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <style>{`
                .katex-display {
                    background-color: #FCE38A !important;
                    border: 2px solid #1A1A1A !important;
                    border-radius: 12px !important;
                    padding: 16px !important;
                    margin: 16px 0 !important;
                    overflow-x: auto !important;
                    overflow-y: hidden /* Hide scrollbars if unnecessary, but let KaTeX handle its overflowing content inside */ !important;
                    box-shadow: 4px 4px 0px rgba(26,26,26,1) !important;
                    display: block !important;
                }
                .katex-display > .katex {
                    display: block !important;
                    text-align: center !important;
                }
                /* Dành cho công thức chèn trong dòng (inline) */
                span.katex {
                    font-weight: bold !important;
                    color: #1A1A1A !important;
                    /* Tuyệt đối KHÔNG gán background, padding hay border vào đây vì sẽ phá vỡ cấu trúc absolute nội bộ của KaTeX */
                }
            `}</style>
            
            {/* Left Sidebar */}
            <div className="w-80 bg-white border-r-2 border-[#1A1A1A]/10 hidden lg:flex flex-col">
                {/* Sidebar Header */}
                <div className="h-16 border-b-2 border-[#1A1A1A]/10 flex items-center px-4 justify-between shrink-0">
                    <button className="flex items-center gap-2 font-extrabold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 px-2 py-1.5 rounded-xl transition-colors">
                        <CaretLeft className="w-5 h-5" weight="bold" />
                        Chat với AI
                    </button>
                    <button className="w-9 h-9 rounded-xl hover:bg-[#1A1A1A]/5 flex items-center justify-center text-[#1A1A1A] transition-colors">
                        <MagnifyingGlass className="w-5 h-5" weight="bold" />
                    </button>
                </div>

                {/* Chat History List */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                    {/* Section 1 */}
                    <div>
                        <div className="flex items-center justify-between px-2 mb-3">
                            <h3 className="text-[11px] font-extrabold text-[#1A1A1A]/50 uppercase tracking-widest">Đoạn thoại tương tác</h3>
                            <button onClick={createNewSession} className="text-[#FF6B4A] hover:bg-[#FF6B4A]/10 px-2 py-0.5 rounded-lg text-xs font-black transition-colors">
                                + TẠO MỚI
                            </button>
                        </div>
                        <div className="space-y-1">
                            {sessions.length === 0 ? (
                                <p className="text-xs px-2 text-gray-400 font-bold italic">Chưa có lịch sử chat.</p>
                            ) : (
                                sessions.sort((a,b) => b.updatedAt - a.updatedAt).map(session => (
                                    <button
                                        key={session.id}
                                        onClick={() => switchSession(session.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-colors flex items-center justify-between ${
                                            sessionId === session.id
                                                ? 'bg-[#B8B5FF]/30 border-[#1A1A1A] font-extrabold text-[#1A1A1A]'
                                                : 'hover:bg-[#1A1A1A]/5 border-transparent font-bold text-[#1A1A1A]/70'
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
                        <h3 className="text-[11px] font-extrabold text-[#1A1A1A]/50 uppercase tracking-widest mb-3 px-2">Luyện tập tình huống</h3>
                        <div className="space-y-1">
                            <button className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1A1A1A]/5 border-2 border-transparent font-bold text-[#1A1A1A]/70 transition-colors flex items-center justify-between">
                                <span className="truncate pr-2">Giao tiếp sân bay</span>
                                <span className="text-xs font-extrabold text-[#FF6B4A] shrink-0">11/12</span>
                            </button>
                            <button className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#1A1A1A]/5 border-2 border-transparent font-bold text-[#1A1A1A]/70 transition-colors flex items-center justify-between">
                                <span className="truncate pr-2">Viết đoạn văn mô tả</span>
                                <span className="text-xs font-extrabold text-[#95E1D3] shrink-0">20/24</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Insights Card */}
                <div className="p-4 mt-auto border-t-2 border-[#1A1A1A]/10 bg-white">
                    <div className="bg-[#95E1D3]/50 rounded-2xl p-4 border-2 border-[#1A1A1A] relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkle className="w-4 h-4 text-[#1A1A1A]" weight="fill" />
                            <span className="text-xs font-black text-[#1A1A1A]">Truyền cảm hứng (AI)</span>
                        </div>
                        <div className="bg-white rounded-xl p-4 border-2 border-[#1A1A1A]">
                            <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-black mx-auto mb-2">💡</div>
                            <h4 className="font-extrabold text-center text-[#1A1A1A] text-sm mb-2">Chia nhỏ câu hỏi</h4>
                            <p className="text-[11px] text-center font-bold text-[#1A1A1A]/70 leading-relaxed">Thay vì hỏi toàn bộ bài dài, hãy hỏi từng ý nhỏ. AI sẽ giúp bạn tư duy dễ dàng và tự tin hơn.</p>
                            
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
            <div className="flex-1 flex flex-col bg-[#F7F7F2] relative min-h-0">
                {/* Chat Header */}
                <div className="h-16 border-b-2 border-[#1A1A1A]/10 flex items-center justify-between px-6 shrink-0 bg-white shadow-sm z-10 w-full xl:rounded-tl-2xl border-l-2">
                    <h2 className="font-extrabold text-[17px] text-[#1A1A1A]">
                        {sessions.find(s => s.id === sessionId)?.title || 'Bài tập mới hiện tại'}
                    </h2>
                    <button className="w-9 h-9 rounded-xl hover:bg-[#1A1A1A]/5 flex items-center justify-center text-[#1A1A1A] transition-colors">
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
                            <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-2">Hôm nay bạn cần hỗ trợ gì?</h2>
                            <p className="text-[#1A1A1A]/50 font-semibold text-sm mb-6">Đặt câu hỏi về bài tập, lý thuyết hoặc yêu cầu giải thích công thức.</p>

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
                                        className="px-4 py-3 rounded-2xl border-2 border-[#1A1A1A]/15 bg-white text-sm font-bold text-[#1A1A1A]/70 hover:border-[#FF6B4A] hover:text-[#FF6B4A] transition-all text-left"
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
                                    className={`rounded-3xl px-6 py-4 border-2 shadow-sm max-w-[85%] lg:max-w-[75%] ${
                                        msg.role === 'user'
                                            ? 'bg-white text-[#1A1A1A] border-[#1A1A1A]/10 rounded-tr-none'
                                            : 'bg-white text-[#1A1A1A] border-[#1A1A1A]/10 rounded-tl-none'
                                    }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-sm prose-[#1A1A1A] max-w-none overflow-hidden
                                                       prose-p:font-semibold prose-p:text-[15px] prose-p:leading-relaxed prose-p:my-1
                                                       prose-headings:font-extrabold prose-headings:text-[#FF6B4A] prose-headings:my-2
                                                       prose-strong:font-black prose-strong:text-[#1A1A1A]
                                                       prose-ul:my-2 prose-li:my-0.5
                                                       prose-code:text-[#FF6B4A] prose-code:bg-[#FF6B4A]/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                                       prose-pre:bg-[#1A1A1A] prose-pre:text-white prose-pre:rounded-xl">
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
                <div className="bg-white border-t-2 border-[#1A1A1A]/10 p-5 xl:rounded-bl-2xl border-l-2 w-full shrink-0">
                    <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-3">
                        <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-[#333333] text-white font-extrabold px-6 py-3.5 rounded-2xl border-2 border-[#1A1A1A] transition-colors shrink-0 shadow-sm group">
                            <Microphone className="w-5 h-5 text-[#FF6B4A] group-hover:scale-110 transition-transform" weight="fill" />
                            Ghi âm câu hỏi
                        </button>
                        
                        <div className="w-full h-12 md:h-14 border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] rounded-2xl flex items-center pl-4 pr-1.5 focus-within:border-[#FF6B4A] transition-colors relative shadow-inner">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                className="w-full h-full bg-transparent border-none outline-none text-sm font-semibold text-[#1A1A1A] placeholder:text-[#1A1A1A]/40"
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
                            <button className="px-5 h-14 bg-white hover:bg-[#1A1A1A]/5 text-[#1A1A1A] border-2 border-[#1A1A1A]/20 font-extrabold text-sm rounded-2xl transition-colors">
                                Xem đánh giá
                            </button>
                            <button className="px-5 h-14 bg-white hover:border-[#FF6B4A] hover:text-[#FF6B4A] text-[#1A1A1A] border-2 border-[#1A1A1A]/20 font-extrabold text-sm rounded-2xl transition-colors">
                                Kết thúc
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
