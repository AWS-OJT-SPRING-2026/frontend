import { Sparkle, Paperclip, PaperPlaneTilt, Microphone, BookOpen, Star } from '@phosphor-icons/react';

export function StudentChat() {
    return (
        <div className="flex-1 flex h-full" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-[#F7F7F2] relative min-h-0">
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                    {/* Welcome Banner */}
                    <div className="max-w-xl mx-auto text-center mb-8">
                        <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-[#1A1A1A]">
                            <Sparkle className="w-8 h-8 text-[#FCE38A]" weight="fill" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-2">Hôm nay bạn cần hỗ trợ gì?</h2>
                        <p className="text-[#1A1A1A]/50 font-semibold text-sm">Đặt câu hỏi về bài tập, lý thuyết hoặc yêu cầu giải thích công thức.</p>
                    </div>

                    {/* User Message */}
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] font-bold text-gray-300 mr-12">Học sinh • 10:45 AM</span>
                        <div className="flex items-end gap-3 justify-end max-w-[85%]">
                            <div className="bg-[#FF6B4A] text-white rounded-3xl rounded-tr-none px-6 py-4 border-2 border-[#FF6B4A]">
                                <p className="font-bold text-[15px] leading-relaxed">Giải thích giúp mình định luật Ohm và cho ví dụ minh họa.</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-[#FF6B4A] border-2 border-[#1A1A1A] flex items-center justify-center text-white font-extrabold shrink-0 mb-1">H</div>
                        </div>
                    </div>

                    {/* AI Message */}
                    <div className="flex flex-col items-start gap-1">
                        <span className="text-[11px] font-bold text-gray-300 ml-12">AI Assistant • Vừa xong</span>
                        <div className="flex items-start gap-3 max-w-[95%]">
                            <div className="w-9 h-9 bg-[#1A1A1A] rounded-full border-2 border-[#1A1A1A] flex items-center justify-center shrink-0">
                                <Sparkle className="w-4 h-4 text-[#FCE38A]" weight="fill" />
                            </div>
                            <div className="bg-white text-[#1A1A1A] rounded-3xl rounded-tl-none px-6 py-6 border-2 border-[#1A1A1A] space-y-5">
                                <p className="font-bold text-[15px] leading-relaxed">
                                    Chào bạn! Định luật Ohm là một trong những định luật cơ bản nhất của điện học:
                                </p>

                                <div className="bg-[#FCE38A] rounded-2xl p-5 border-2 border-[#1A1A1A]/20">
                                    <div className="flex items-center gap-2 mb-3 font-extrabold text-[#1A1A1A]">
                                        <span className="italic font-black">fx</span> Công thức
                                    </div>
                                    <div className="bg-white border-2 border-[#1A1A1A]/20 rounded-2xl p-4 text-center font-mono text-2xl font-extrabold tracking-widest text-[#1A1A1A] mb-4">
                                        I = U / R
                                    </div>
                                    <div className="space-y-1.5 text-sm font-bold text-[#1A1A1A]/70">
                                        <p><span className="font-extrabold text-[#1A1A1A]">I:</span> Cường độ dòng điện (Ampe - A)</p>
                                        <p><span className="font-extrabold text-[#1A1A1A]">U:</span> Hiệu điện thế (Vôn - V)</p>
                                        <p><span className="font-extrabold text-[#1A1A1A]">R:</span> Điện trở (Ôm - Ω)</p>
                                    </div>
                                </div>

                                <div className="bg-[#95E1D3] rounded-2xl p-5 border-2 border-[#1A1A1A]/20">
                                    <div className="font-extrabold text-[#1A1A1A] mb-2">Ví dụ minh họa</div>
                                    <p className="italic text-[#1A1A1A]/70 text-sm mb-3 font-semibold">
                                        Bóng đèn có R = 12Ω mắc vào U = 24V. Tính I?
                                    </p>
                                    <p className="font-extrabold text-[#1A1A1A] text-sm">
                                        Giải: I = U/R = 24/12 = <span className="text-[#FF6B4A]">2 (A)</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-5 bg-white border-t-2 border-[#1A1A1A]/10 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 w-full max-w-3xl">
                        <button className="w-12 h-12 rounded-2xl bg-[#1A1A1A]/5 border-2 border-[#1A1A1A]/20 text-[#1A1A1A]/50 hover:text-[#1A1A1A] flex items-center justify-center transition-colors shrink-0">
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <div className="relative flex-1">
                            <input
                                className="w-full h-12 bg-[#F7F7F2] border-2 border-[#1A1A1A]/20 rounded-2xl pl-5 pr-14 text-sm font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#FF6B4A] transition-colors"
                                placeholder="Nhập câu hỏi của bạn tại đây..."
                            />
                            <button className="absolute right-1.5 top-1.5 w-9 h-9 rounded-xl bg-[#FF6B4A] hover:bg-[#ff5535] text-white flex items-center justify-center transition-colors">
                                <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                            </button>
                        </div>
                        <button className="w-12 h-12 rounded-2xl bg-[#1A1A1A]/5 border-2 border-[#1A1A1A]/20 text-[#1A1A1A]/50 hover:text-[#1A1A1A] flex items-center justify-center transition-colors shrink-0">
                            <Microphone className="w-5 h-5" />
                        </button>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">AI có thể đưa ra câu trả lời chưa chính xác. Hãy kiểm tra lại kiến thức.</span>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-72 bg-white border-l-2 border-[#1A1A1A]/10 hidden xl:flex flex-col overflow-y-auto">
                <div className="p-6 space-y-6 flex-1">
                    {/* Related Chapters */}
                    <div>
                        <h3 className="flex items-center gap-2 font-extrabold text-[#1A1A1A] mb-4">
                            <BookOpen className="w-5 h-5 text-[#FF6B4A]" weight="fill" /> Chương học liên quan
                        </h3>
                        <div className="rounded-2xl p-4 border-2 border-[#1A1A1A]/20" style={{ backgroundColor: '#B8B5FF' }}>
                            <div className="text-[10px] font-extrabold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">VẬT LÝ 9 - CHƯƠNG 1</div>
                            <h4 className="font-extrabold text-[#1A1A1A] text-sm mb-3">Điện học & Định luật Ohm</h4>
                            <div className="h-2 w-full bg-[#1A1A1A]/15 rounded-full border border-[#1A1A1A]/20 overflow-hidden mb-1.5">
                                <div className="h-full bg-[#1A1A1A]/50 rounded-full" style={{ width: '65%' }} />
                            </div>
                            <span className="text-[10px] text-[#1A1A1A]/50 font-extrabold uppercase tracking-wider">65% hoàn thành</span>
                        </div>
                    </div>

                    {/* Keywords */}
                    <div>
                        <h3 className="flex items-center gap-2 font-extrabold text-[#1A1A1A] mb-4">
                            <Star className="w-5 h-5 text-[#FCE38A]" weight="fill" /> Kiến thức cần nhớ
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {['#DienTro', '#HieuDienThe', '#MachNoiTiep', '#VatLy9'].map(tag => (
                                <span key={tag} className="px-3 py-1.5 rounded-full border-2 border-[#1A1A1A]/20 bg-[#FCE38A] text-xs font-extrabold cursor-pointer hover:bg-[#FCE38A]/70 transition-colors text-[#1A1A1A]">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pro Banner */}
                <div className="p-5 border-t-2 border-[#1A1A1A]/10">
                    <div className="bg-[#1A1A1A] rounded-2xl p-5">
                        <h4 className="font-extrabold text-white text-base mb-2">⚡ Nâng cấp Pro</h4>
                        <p className="text-xs text-white/60 leading-relaxed font-semibold mb-4">Mở khóa giải bài nâng cao và gia sư 1:1.</p>
                        <button className="w-full bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold rounded-2xl text-sm h-10 transition-colors">
                            Khám phá ngay →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
