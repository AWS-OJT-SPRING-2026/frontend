import { UploadSimple, FileText, List, SquaresFour, Info, CheckCircle, Trash } from '@phosphor-icons/react';
import { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

export function TeacherDocuments() {
    interface Book {
        id: number;
        book_name: string;
        subject_name: string;
        create_at: string;
        meta: string;
        doc_type?: string;
    }

    interface Subject {
        subject_id: number;
        subject_name: string;
    }

    const [books, setBooks] = useState<Book[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [subjectId, setSubjectId] = useState<string>("");
    const [docType, setDocType] = useState<string>("theory");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [booksRes, subjectsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_FAST_API_URL}/books`),
                fetch(`${import.meta.env.VITE_FAST_API_URL}/subjects`)
            ]);

            if (booksRes.ok) {
                const data = await booksRes.json();
                setBooks(data);
            }

            if (subjectsRes.ok) {
                const data = await subjectsRes.json();
                setSubjects(data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpload = async () => {
        if (!selectedFile || !subjectId) {
            alert('Vui lòng chọn tệp và môn học.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('subject_id', subjectId);
        formData.append('doc_type', docType);
        formData.append('userid', "1"); // Default teacher ID

        setUploading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_FAST_API_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert('Tải lên và xử lý tài liệu thành công!');
                setSelectedFile(null);
                fetchData(); // Refresh list
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.detail || 'Xử lý thất bại'}`);
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            alert('Lỗi kết nối server.');
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDelete = async (id: number, doc_type: string = 'theory') => {
        if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này? Thao tác này sẽ xóa toàn bộ nội dung liên quan trong database.')) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_FAST_API_URL}/books/${doc_type}/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setBooks(books.filter(b => b.id !== id || b.doc_type !== doc_type));
            } else {
                alert('Xóa thất bại. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('Lỗi kết nối server.');
        }
    };

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
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#FF6B4A]/50 bg-[#FF6B4A]/5 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-[#FF6B4A]/10 transition-colors cursor-pointer"
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".pdf"
                        />
                        <div className="w-14 h-14 bg-[#FF6B4A] rounded-2xl flex items-center justify-center mb-4">
                            <UploadSimple className="w-7 h-7 text-white" weight="fill" />
                        </div>
                        <h3 className="font-extrabold text-[#1A1A1A] mb-1">
                            {selectedFile ? selectedFile.name : 'Kéo và thả tệp vào đây'}
                        </h3>
                        <p className="text-sm text-[#1A1A1A]/50 font-semibold mb-2">Hoặc nhấp để chọn (Tối đa 50MB)</p>
                        <p className="text-xs text-[#1A1A1A]/40 font-extrabold uppercase tracking-widest mb-5">PDF ONLY</p>
                        <button className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-8 h-10 rounded-2xl transition-colors">
                            {selectedFile ? 'Thay đổi tệp' : '+ Chọn tệp'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div>
                            <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Môn học</Label>
                            <Select onValueChange={setSubjectId} value={subjectId}>
                                <SelectTrigger className="bg-[#F7F7F2] rounded-2xl border-2 border-[#1A1A1A]/20 h-11 font-bold">
                                    <SelectValue placeholder="Chọn môn học" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => (
                                        <SelectItem key={s.subject_id} value={s.subject_id.toString()}>
                                            {s.subject_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Loại tài liệu</Label>
                            <Select onValueChange={setDocType} value={docType}>
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

                    <button 
                        onClick={handleUpload}
                        disabled={uploading || !selectedFile || !subjectId}
                        className={`w-full py-3 ${uploading ? 'bg-gray-400' : 'bg-[#FF6B4A] hover:bg-[#ff5535]'} text-white font-extrabold rounded-2xl transition-colors text-base`}
                    >
                        {uploading ? 'Đang xử lý tài liệu (có thể mất vài phút)...' : 'Xác nhận tải lên'}
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
                            {['Tên file', 'Ngày tải lên', 'Môn học', 'Thao tác'].map(h => (
                                <th key={h} className="px-6 py-4 text-xs font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/10">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-bold">
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : books.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-bold">
                                    Chưa có tài liệu nào được tải lên.
                                </td>
                            </tr>
                        ) : books.map((book) => (
                            <tr key={`${book.doc_type}-${book.id}`} className="hover:bg-[#1A1A1A]/3 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl border-2 border-[#1A1A1A]/20 flex items-center justify-center shrink-0" style={{ backgroundColor: '#FCE38A' }}>
                                            <FileText className="w-5 h-5 text-[#1A1A1A]" weight="fill" />
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-[#1A1A1A]">{book.book_name}</div>
                                            <div className="text-xs text-gray-400 font-semibold">{book.meta}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-[#1A1A1A]/60">
                                    {new Date(book.create_at).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-[#1A1A1A]/60">
                                        {book.subject_name}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleDelete(book.id, book.doc_type)}
                                        className="p-2 text-[#FF6B4A] hover:bg-[#FF6B4A]/10 rounded-xl transition-colors"
                                        title="Xóa tài liệu"
                                    >
                                        <Trash className="w-5 h-5" weight="bold" />
                                    </button>
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
