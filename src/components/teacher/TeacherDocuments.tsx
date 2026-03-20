import { UploadSimple, FileText, Eye, List, SquaresFour, Info, CheckCircle } from '@phosphor-icons/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const DOCS = [
    { name: 'Giao-trinh-Sinh-Hoc-Te-Bao.pdf', meta: 'PDF • 4.2 MB', date: '12/10/2023', views: '1,245', bg: '#FFB5B5' },
    { name: 'Bai-Tap-Chuong-1.docx', meta: 'DOCX • 850 KB', date: '10/10/2023', views: '856', bg: '#B8B5FF' },
    { name: 'Slide-Thuyet-Trinh-Di-Truyen.pptx', meta: 'PPTX • 12.5 MB', date: '08/10/2023', views: '2,102', bg: '#FCE38A' },
];

export function TeacherDocuments() {
    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Sinh học 101 / Tài liệu</p>
                <h1 className="text-3xl font-extrabold text-[#1A1A1A]">Quản lý Tài liệu</h1>
            </div>

            {/* Success banner */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-[#1A1A1A]/20" style={{ backgroundColor: '#95E1D3' }}>
                <CheckCircle className="w-5 h-5 text-[#1A1A1A]" weight="fill" />
                <span className="font-extrabold text-[#1A1A1A] text-sm">Đã đồng bộ với kho lưu trữ trực tuyến thành công.</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload form */}
                <div className="lg:col-span-2 bg-white rounded-3xl border-2 border-[#1A1A1A] p-6 space-y-5">
                    <h2 className="font-extrabold text-lg text-[#1A1A1A]">Tải lên tài liệu mới</h2>

                    {/* Dropzone */}
                    <div className="border-2 border-dashed border-[#FF6B4A]/50 bg-[#FF6B4A]/5 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-[#FF6B4A]/10 transition-colors cursor-pointer">
                        <div className="w-14 h-14 bg-[#FF6B4A] rounded-2xl flex items-center justify-center mb-4">
                            <UploadSimple className="w-7 h-7 text-white" weight="fill" />
                        </div>
                        <h3 className="font-extrabold text-[#1A1A1A] mb-1">Kéo và thả tệp vào đây</h3>
                        <p className="text-sm text-[#1A1A1A]/50 font-semibold mb-2">Hoặc nhấp để chọn (Tối đa 50MB)</p>
                        <p className="text-xs text-[#1A1A1A]/40 font-extrabold uppercase tracking-widest mb-5">PDF, DOCX, PPTX, ZIP</p>
                        <button className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-8 h-10 rounded-2xl transition-colors">
                            + Chọn tệp
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Tiêu đề tài liệu</Label>
                            <Input placeholder="Đề cương chương 2..." className="rounded-2xl border-2 border-[#1A1A1A]/20 bg-[#F7F7F2] h-11 font-semibold" />
                        </div>
                        <div>
                            <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Môn học</Label>
                            <Select defaultValue="sinh">
                                <SelectTrigger className="bg-[#F7F7F2] rounded-2xl border-2 border-[#1A1A1A]/20 h-11 font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sinh">Sinh học đại cương</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Loại tài liệu</Label>
                            <Select defaultValue="theory">
                                <SelectTrigger className="bg-[#F7F7F2] rounded-2xl border-2 border-[#1A1A1A]/20 h-11 font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="theory">Lý thuyết</SelectItem>
                                    <SelectItem value="question">Câu hỏi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Gán cho lớp học</Label>
                        <Select defaultValue="nhom1">
                            <SelectTrigger className="bg-[#F7F7F2] rounded-2xl border-2 border-[#1A1A1A]/20 h-11 font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="nhom1">BIO101 - Nhóm 01</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <button className="w-full py-3 bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold rounded-2xl transition-colors text-base">
                        Xác nhận tải lên
                    </button>
                </div>

                {/* Right panel */}
                <div className="space-y-5">


                    {/* Tips */}
                    <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] p-5">
                        <h3 className="font-extrabold text-[#1A1A1A] mb-4">Gợi ý quản lý</h3>
                        <div className="space-y-3">
                            {[
                                'Đặt tên file theo định dạng: [MonHoc]_[TieuDe]',
                                'Sử dụng tag để học sinh dễ tìm kiếm tài liệu',
                            ].map((tip, i) => (
                                <div key={i} className="flex gap-3 items-start p-3 rounded-2xl border-2 border-[#1A1A1A]/15" style={{ backgroundColor: '#FCE38A' }}>
                                    <Info className="w-4 h-4 text-[#1A1A1A]/70 shrink-0 mt-0.5" weight="fill" />
                                    <p className="text-sm font-bold text-[#1A1A1A]/70">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents list */}
            <div className="bg-white rounded-3xl border-2 border-[#1A1A1A] overflow-hidden">
                <div className="px-6 py-4 border-b-2 border-[#1A1A1A] flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-[#1A1A1A]">Tài liệu đã tải lên</h3>
                    <div className="flex gap-2">
                        <button className="p-2 text-gray-400 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5 rounded-xl transition-colors">
                            <List className="w-5 h-5" />
                        </button>
                        <button className="p-2 bg-[#1A1A1A]/10 text-[#1A1A1A] rounded-xl">
                            <SquaresFour className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#1A1A1A]/5 border-b-2 border-[#1A1A1A]/20">
                        <tr>
                            {['Tên file', 'Ngày tải lên', 'Lượt xem', 'Thao tác'].map(h => (
                                <th key={h} className="px-6 py-4 text-xs font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/10">
                        {DOCS.map((doc, i) => (
                            <tr key={i} className="hover:bg-[#1A1A1A]/3 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl border-2 border-[#1A1A1A]/20 flex items-center justify-center shrink-0" style={{ backgroundColor: doc.bg }}>
                                            <FileText className="w-5 h-5 text-[#1A1A1A]" weight="fill" />
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-[#1A1A1A]">{doc.name}</div>
                                            <div className="text-xs text-gray-400 font-semibold">{doc.meta}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-[#1A1A1A]/60">{doc.date}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 font-bold text-[#1A1A1A]/60">
                                        <Eye className="w-4 h-4" /> {doc.views}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button className="text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535]">⋯</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 border-t-2 border-[#1A1A1A]/10 text-center">
                    <button className="text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535]">Xem tất cả tài liệu →</button>
                </div>
            </div>
        </div>
    );
}
