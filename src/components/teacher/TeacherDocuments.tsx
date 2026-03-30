import { UploadSimple, FileText, Info, CheckCircle, Trash, Eye, ShareNetwork } from '@phosphor-icons/react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { classroomService, type TeacherClassroomOption } from '../../services/classroomService';
import {
    teacherDocumentService,
    type TeacherDocumentDetail,
    type TeacherDocumentItem,
} from '../../services/teacherDocumentService';

export function TeacherDocuments() {
    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const { isAuthenticated } = useAuth();

    const [books, setBooks] = useState<TeacherDocumentItem[]>([]);
    const [teacherClassrooms, setTeacherClassrooms] = useState<TeacherClassroomOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAllDocuments, setShowAllDocuments] = useState(false);

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [activeDetail, setActiveDetail] = useState<TeacherDocumentDetail | null>(null);
    const [detailCache, setDetailCache] = useState<Record<string, TeacherDocumentDetail>>({});

    const [distributionModalOpen, setDistributionModalOpen] = useState(false);
    const [distributionSubmitting, setDistributionSubmitting] = useState(false);
    const [distributionSearch, setDistributionSearch] = useState('');
    const [distributionSubjectId, setDistributionSubjectId] = useState('');
    const [distributionClassIds, setDistributionClassIds] = useState<number[]>([]);
    const [distributionTargetDoc, setDistributionTargetDoc] = useState<TeacherDocumentItem | null>(null);

    // Upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [subjectId, setSubjectId] = useState('');
    const [classId, setClassId] = useState('');
    const [docType, setDocType] = useState<'THEORY' | 'QUESTION'>('THEORY');
    const [uploading, setUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = teacherDocumentService.getTokenOrThrow();
            const [booksResult, classroomsResult] = await Promise.allSettled([
                teacherDocumentService.getDocuments(token),
                classroomService.getMyClassroomOptions(token),
            ]);

            if (booksResult.status === 'fulfilled') {
                setBooks(booksResult.value);
            } else {
                throw booksResult.reason;
            }

            if (classroomsResult.status === 'fulfilled') {
                setTeacherClassrooms(classroomsResult.value);
            } else {
                console.error('Error loading classroom options:', classroomsResult.reason);
                setTeacherClassrooms([]);
                setUploadMessage({
                    type: 'error',
                    text: 'Không tải được danh sách lớp của giáo viên. Bạn vẫn có thể xem tài liệu đã tải lên.',
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setUploadMessage({ type: 'error', text: 'Không thể tải danh sách tài liệu. Vui lòng thử lại.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isAuthenticated]);

    const selectedClassroom = useMemo(
        () => teacherClassrooms.find((item) => item.classID.toString() === classId),
        [teacherClassrooms, classId],
    );

    const filteredSubjects = useMemo(() => {
        if (!selectedClassroom) {
            return [];
        }

        return [{ subjectID: selectedClassroom.subjectID, subjectName: selectedClassroom.subjectName }];
    }, [selectedClassroom]);

    const distributionSubjects = useMemo(() => {
        const map = new Map<number, string>();
        teacherClassrooms.forEach((item) => {
            if (!map.has(item.subjectID)) {
                map.set(item.subjectID, item.subjectName);
            }
        });
        return Array.from(map.entries()).map(([subjectID, subjectName]) => ({ subjectID, subjectName }));
    }, [teacherClassrooms]);

    const distributionFilteredClasses = useMemo(() => {
        const selectedSubject = Number(distributionSubjectId);
        const keyword = distributionSearch.trim().toLowerCase();
        return teacherClassrooms.filter((item) => {
            if (!selectedSubject || item.subjectID !== selectedSubject) {
                return false;
            }
            return !keyword || item.className.toLowerCase().includes(keyword);
        });
    }, [teacherClassrooms, distributionSubjectId, distributionSearch]);

    const visibleBooks = useMemo(
        () => (showAllDocuments ? books : books.slice(0, 6)),
        [books, showAllDocuments],
    );

    const getDocCacheKey = (book: TeacherDocumentItem) => `${book.doc_type}-${book.id}`;

    const loadDocumentDetail = async (book: TeacherDocumentItem) => {
        const key = getDocCacheKey(book);
        if (detailCache[key]) {
            return detailCache[key];
        }

        const token = teacherDocumentService.getTokenOrThrow();
        const detail = await teacherDocumentService.getDocumentDetail(book.doc_type, book.id, token);
        setDetailCache((prev) => ({ ...prev, [key]: detail }));
        return detail;
    };

    const handleClassChange = (value: string) => {
        setClassId(value);
        const found = teacherClassrooms.find((item) => item.classID.toString() === value);
        setSubjectId(found ? found.subjectID.toString() : '');
    };

    const handleUpload = async () => {
        setUploadMessage(null);

        if (!selectedFile) {
            setUploadMessage({ type: 'error', text: 'Vui lòng chọn file PDF để tải lên.' });
            return;
        }
        if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
            setUploadMessage({ type: 'error', text: 'Chỉ hỗ trợ file PDF. Vui lòng chọn file có đuôi .pdf' });
            return;
        }
        if (!classId) {
            setUploadMessage({ type: 'error', text: 'Vui lòng chọn lớp học.' });
            return;
        }
        if (!subjectId) {
            setUploadMessage({ type: 'error', text: 'Vui lòng chọn môn học.' });
            return;
        }
        if (!docType) {
            setUploadMessage({ type: 'error', text: 'Vui lòng chọn loại tài liệu.' });
            return;
        }

        if (!isAuthenticated) {
            setUploadMessage({ type: 'error', text: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('class_id', classId);
        formData.append('subject_id', subjectId);
        formData.append('type', docType);

        setUploading(true);
        try {
            const token = teacherDocumentService.getTokenOrThrow();
            const result = await teacherDocumentService.uploadDocument(formData, token);
            const typeLabel = docType === 'THEORY' ? 'Lý thuyết' : 'Câu hỏi';
            setUploadMessage({
                type: 'success',
                text: `Tải lên thành công! Tài liệu ${typeLabel} đã được phân phối về lớp. (ID: ${result.record_id})`,
            });
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            await fetchData();
        } catch (error) {
            console.error('Error uploading document:', error);
            const message = error instanceof Error ? error.message : 'Không thể kết nối đến server.';
            setUploadMessage({ type: 'error', text: `Lỗi: ${message}` });
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleDelete = async (id: number, docTypeValue: 'theory' | 'question') => {
        if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này? Thao tác này sẽ xóa toàn bộ nội dung liên quan trong database.')) return;

        try {
            const token = teacherDocumentService.getTokenOrThrow();
            await teacherDocumentService.deleteDocument(docTypeValue, id, token);
            setBooks((prev) => prev.filter((b) => !(b.id === id && b.doc_type === docTypeValue)));
            setUploadMessage({ type: 'success', text: 'Đã xóa tài liệu và toàn bộ dữ liệu liên quan thành công.' });
        } catch (error) {
            console.error('Error deleting book:', error);
            const message = error instanceof Error ? error.message : 'Lỗi kết nối server.';
            setUploadMessage({ type: 'error', text: `Xóa thất bại: ${message}` });
        }
    };

    const handleOpenDetail = async (book: TeacherDocumentItem) => {
        try {
            setDetailLoading(true);
            setDetailError(null);
            setActiveDetail(null);
            setDetailModalOpen(true);
            const detail = await loadDocumentDetail(book);
            setActiveDetail(detail);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tải chi tiết tài liệu.';
            setUploadMessage({ type: 'error', text: message });
            setDetailError(message);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleOpenDistribution = async (book: TeacherDocumentItem) => {
        setDistributionTargetDoc(book);
        setDistributionSearch('');

        try {
            const detail = await loadDocumentDetail(book);
            const assignedClassIds = detail.assigned_classrooms.map((item) => item.classid);

            setDistributionSubjectId(detail.subject_id.toString());
            setDistributionClassIds(assignedClassIds);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu phân phối.';
            setUploadMessage({ type: 'error', text: message });

            const fallbackSubject = teacherClassrooms.find((item) => item.subjectName === book.subject_name);
            setDistributionSubjectId(fallbackSubject ? fallbackSubject.subjectID.toString() : '');
            setDistributionClassIds([]);
        } finally {
            setDistributionModalOpen(true);
        }
    };

    const handleToggleDistributionClass = (classIdValue: number) => {
        setDistributionClassIds((prev) => {
            if (prev.includes(classIdValue)) {
                return prev.filter((item) => item !== classIdValue);
            }
            return [...prev, classIdValue];
        });
    };

    const handleDistributionSubjectChange = (value: string) => {
        setDistributionSubjectId(value);
        const selectedSubject = Number(value);
        setDistributionClassIds((prev) => prev.filter((classIdValue) => {
            const classroom = teacherClassrooms.find((item) => item.classID === classIdValue);
            return classroom?.subjectID === selectedSubject;
        }));
    };

    const handleConfirmDistribution = async () => {
        if (!distributionTargetDoc) {
            return;
        }

        if (!distributionSubjectId) {
            setUploadMessage({ type: 'error', text: 'Vui lòng chọn môn học trước khi phân phối.' });
            return;
        }

        if (distributionClassIds.length === 0) {
            setUploadMessage({ type: 'error', text: 'Vui lòng chọn ít nhất một lớp học để phân phối.' });
            return;
        }

        try {
            setDistributionSubmitting(true);
            const token = teacherDocumentService.getTokenOrThrow();
            const subjectValue = Number(distributionSubjectId);

            await teacherDocumentService.distributeDocument(
                distributionTargetDoc.doc_type,
                distributionTargetDoc.id,
                {
                    subject_id: subjectValue,
                    class_ids: distributionClassIds,
                },
                token,
            );

            setDistributionModalOpen(false);
            await fetchData();
            setUploadMessage({ type: 'success', text: 'Phân phối tài liệu thành công.' });

            const updatedDetail = await teacherDocumentService.getDocumentDetail(
                distributionTargetDoc.doc_type,
                distributionTargetDoc.id,
                token,
            );
            setDetailCache((prev) => ({ ...prev, [getDocCacheKey(distributionTargetDoc)]: updatedDetail }));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Phân phối tài liệu thất bại.';
            setUploadMessage({ type: 'error', text: message });
        } finally {
            setDistributionSubmitting(false);
        }
    };

    return (
        <div className="p-8 space-y-6 max-w-6xl mx-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <div>
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-1">Sinh học 101 / Tài liệu</p>
                <h1 className={`text-3xl font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Quản lý Tài liệu</h1>
            </div>

            {/* Success banner */}
            <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${isDark ? 'border-emerald-400/20 bg-emerald-500/15' : 'border-[#1A1A1A]/20'}`} style={{ backgroundColor: isDark ? undefined : '#95E1D3' }}>
                <CheckCircle className={`w-5 h-5 ${isDark ? 'text-emerald-300' : 'text-[#1A1A1A]'}`} weight="fill" />
                <span className={`font-extrabold text-sm ${isDark ? 'text-emerald-100' : 'text-[#1A1A1A]'}`}>Đã đồng bộ với kho lưu trữ trực tuyến thành công.</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload form */}
                <div className={`lg:col-span-2 rounded-3xl border-2 p-6 space-y-5 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                    <h2 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Tải lên tài liệu mới</h2>

                    {/* Dropzone */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDark
                            ? 'border-[#FF6B4A]/40 bg-[#FF6B4A]/10 hover:bg-[#FF6B4A]/15'
                            : 'border-[#FF6B4A]/50 bg-[#FF6B4A]/5 hover:bg-[#FF6B4A]/10'
                            }`}
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
                        <h3 className={`font-extrabold mb-1 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>
                            {selectedFile ? selectedFile.name : 'Kéo và thả tệp vào đây'}
                        </h3>
                        <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/50'}`}>Hoặc nhấp để chọn (Tối đa 50MB)</p>
                        <p className={`text-xs font-extrabold uppercase tracking-widest mb-5 ${isDark ? 'text-gray-500' : 'text-[#1A1A1A]/40'}`}>PDF ONLY</p>
                        <button className="bg-[#FF6B4A] hover:bg-[#ff5535] text-white font-extrabold px-8 h-10 rounded-2xl transition-colors">
                            {selectedFile ? 'Thay đổi tệp' : '+ Chọn tệp'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Gán cho lớp học</Label>
                            <Select onValueChange={handleClassChange} value={classId}>
                                <SelectTrigger className={`rounded-2xl border-2 h-11 font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`}>
                                    <SelectValue placeholder="Chọn lớp học" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teacherClassrooms.map((c) => (
                                        <SelectItem key={c.classID} value={c.classID.toString()}>
                                            {c.className}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Môn học</Label>
                            <Select onValueChange={setSubjectId} value={subjectId} disabled={!classId}>
                                <SelectTrigger className={`rounded-2xl border-2 h-11 font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`}>
                                    <SelectValue placeholder="Chọn môn học" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredSubjects.map((s) => (
                                        <SelectItem key={s.subjectID} value={s.subjectID.toString()}>
                                            {s.subjectName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1.5 block">Loại tài liệu</Label>
                            <Select
                                onValueChange={(value) => setDocType(value === 'QUESTION' ? 'QUESTION' : 'THEORY')}
                                value={docType}
                            >
                                <SelectTrigger className={`rounded-2xl border-2 h-11 font-bold ${isDark ? 'bg-[#20242b] border-white/15 text-gray-100' : 'bg-[#F7F7F2] border-[#1A1A1A]/20'}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="THEORY">Lý thuyết</SelectItem>
                                    <SelectItem value="QUESTION">Câu hỏi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Upload feedback message */}
                    {uploadMessage && (
                        <div className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-sm font-bold ${
                            uploadMessage.type === 'success'
                                ? (isDark ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200' : 'border-emerald-500/30 bg-emerald-50 text-emerald-700')
                                : (isDark ? 'border-red-400/30 bg-red-500/15 text-red-200' : 'border-red-500/30 bg-red-50 text-red-700')
                        }`}>
                            {uploadMessage.type === 'success'
                                ? <CheckCircle className="w-5 h-5 shrink-0" weight="fill" />
                                : <Info className="w-5 h-5 shrink-0" weight="fill" />
                            }
                            <span>{uploadMessage.text}</span>
                        </div>
                    )}

                    <button 
                        onClick={handleUpload}
                        disabled={uploading || !selectedFile || !subjectId || !classId}
                        className={`w-full py-3 ${uploading || !selectedFile || !subjectId || !classId ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#FF6B4A] hover:bg-[#ff5535]'} text-white font-extrabold rounded-2xl transition-colors text-base`}
                    >
                        {uploading ? 'Đang xử lý tài liệu (có thể mất vài phút)...' : 'Xác nhận tải lên'}
                    </button>
                </div>

                {/* Right panel */}
                <div className="space-y-5">


                    {/* Tips */}
                    <div className={`rounded-3xl border-2 p-5 ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                        <h3 className={`font-extrabold mb-4 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Gợi ý quản lý</h3>
                        <div className="space-y-3">
                            {[
                                'Đặt tên file theo định dạng: [MonHoc]_[TieuDe]',
                                'Sử dụng tag để học sinh dễ tìm kiếm tài liệu',
                            ].map((tip, i) => (
                                <div key={i} className={`flex gap-3 items-start p-3 rounded-2xl border-2 ${isDark ? 'border-yellow-300/20 bg-yellow-200/10' : 'border-[#1A1A1A]/15'}`} style={{ backgroundColor: isDark ? undefined : '#FCE38A' }}>
                                    <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-yellow-200' : 'text-[#1A1A1A]/70'}`} weight="fill" />
                                    <p className={`text-sm font-bold ${isDark ? 'text-yellow-100/90' : 'text-[#1A1A1A]/70'}`}>{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents list */}
            <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]'}`}>
                <div className={`px-6 py-4 border-b-2 flex items-center justify-between ${isDark ? 'border-white/10' : 'border-[#1A1A1A]'}`}>
                    <h3 className={`font-extrabold text-lg ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>Tài liệu đã tải lên</h3>
                    <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>
                        Hiển thị {visibleBooks.length}/{books.length}
                    </span>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className={`border-b-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/20'}`}>
                        <tr>
                            {['Tên file', 'Ngày tải lên', 'Môn học', 'Đã phân phối', 'Thao tác'].map(h => (
                                <th key={h} className={`px-6 py-4 text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50'}`}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={isDark ? 'divide-y divide-white/10' : 'divide-y divide-[#1A1A1A]/10'}>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold">
                                    Đang tải dữ liệu...
                                </td>
                            </tr>
                        ) : books.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold">
                                    Chưa có tài liệu nào được tải lên.
                                </td>
                            </tr>
                        ) : visibleBooks.map((book) => (
                            <tr key={`${book.doc_type}-${book.id}`} className={isDark ? 'hover:bg-white/5 transition-colors' : 'hover:bg-[#1A1A1A]/3 transition-colors'}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl border-2 border-[#1A1A1A]/20 flex items-center justify-center shrink-0" style={{ backgroundColor: '#FCE38A' }}>
                                            <FileText className="w-5 h-5 text-[#1A1A1A]" weight="fill" />
                                        </div>
                                        <div>
                                            <div className={`font-extrabold ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`}>{book.book_name}</div>
                                            <div className="text-xs text-gray-400 font-semibold">{book.meta}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className={`px-6 py-4 font-bold ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/60'}`}>
                                    {new Date(book.uploadDate).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`font-bold ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/60'}`}>
                                        {book.subject_name}
                                    </div>
                                </td>
                                <td className={`px-6 py-4 font-bold ${isDark ? 'text-gray-300' : 'text-[#1A1A1A]/60'}`}>
                                    {book.assigned_class_count} lớp
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenDetail(book)}
                                            className="px-3 h-8 rounded-xl font-bold text-xs text-[#1A1A1A] bg-[#FCE38A] hover:opacity-90 transition-opacity"
                                            title="Xem chi tiết"
                                        >
                                            <Eye className="w-4 h-4 inline-block mr-1" weight="bold" /> Xem
                                        </button>
                                        <button
                                            onClick={() => handleOpenDistribution(book)}
                                            className="px-3 h-8 rounded-xl font-bold text-xs text-white bg-[#4A69FF] hover:bg-[#3b57e0] transition-colors"
                                            title="Phân phối tài liệu"
                                        >
                                            <ShareNetwork className="w-4 h-4 inline-block mr-1" weight="bold" /> Phân phối
                                        </button>
                                        <button
                                            onClick={() => handleDelete(book.id, book.doc_type)}
                                            className="p-2 text-[#FF6B4A] hover:bg-[#FF6B4A]/10 rounded-xl transition-colors"
                                            title="Xóa tài liệu"
                                        >
                                            <Trash className="w-5 h-5" weight="bold" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className={`p-4 border-t-2 text-center ${isDark ? 'border-white/10' : 'border-[#1A1A1A]/10'}`}>
                    {books.length > 6 ? (
                        <button
                            className="text-sm font-extrabold text-[#FF6B4A] hover:text-[#ff5535]"
                            onClick={() => setShowAllDocuments((prev) => !prev)}
                        >
                            {showAllDocuments ? 'Thu gọn danh sách' : 'Xem tất cả tài liệu'} →
                        </button>
                    ) : null}
                </div>
            </div>

            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Chi tiết tài liệu</DialogTitle>
                        <DialogDescription>Thông tin nội dung và lớp đã được phân phối.</DialogDescription>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="py-8 text-center text-sm text-gray-500 font-semibold">Đang tải chi tiết...</div>
                    ) : detailError ? (
                        <div className="py-8 text-center text-sm text-red-500 font-semibold">{detailError}</div>
                    ) : !activeDetail ? (
                        <div className="py-8 text-center text-sm text-gray-500 font-semibold">Không có dữ liệu chi tiết tài liệu.</div>
                    ) : (
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border p-3">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Tên tài liệu</p>
                                    <p className="font-extrabold mt-1 break-words">{activeDetail.book_name}</p>
                                </div>
                                <div className="rounded-xl border p-3">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Loại</p>
                                    <p className="font-extrabold mt-1">{activeDetail.doc_type === 'theory' ? 'Lý thuyết' : 'Câu hỏi'}</p>
                                </div>
                                <div className="rounded-xl border p-3">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Môn học</p>
                                    <p className="font-extrabold mt-1">{activeDetail.subject_name}</p>
                                </div>
                                <div className="rounded-xl border p-3">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Ngày tải lên</p>
                                    <p className="font-extrabold mt-1">{new Date(activeDetail.uploadDate).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>

                            <div className="rounded-xl border p-3">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Thống kê nội dung</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(activeDetail.stats).map(([key, value]) => (
                                        <div key={key} className="rounded-lg bg-gray-50 px-3 py-2 font-semibold">
                                            {key.replace('_', ' ')}: {value ?? 0}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border p-3">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Lớp đã phân phối</p>
                                {activeDetail.assigned_classrooms.length === 0 ? (
                                    <p className="text-gray-500 font-semibold">Chưa phân phối cho lớp nào.</p>
                                ) : (
                                    <div className="max-h-44 overflow-y-auto space-y-2">
                                        {activeDetail.assigned_classrooms.map((item) => (
                                            <div key={item.classid} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                                <span className="font-semibold">{item.class_name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {item.assigned_at ? new Date(item.assigned_at).toLocaleString('vi-VN') : '--'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={distributionModalOpen} onOpenChange={setDistributionModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Phân phối tài liệu</DialogTitle>
                        <DialogDescription>
                            {distributionTargetDoc ? `Tên: ${distributionTargetDoc.book_name}` : 'Chọn môn học và các lớp cần phân phối.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label className="mb-1 block">Môn học</Label>
                            <Select value={distributionSubjectId} onValueChange={handleDistributionSubjectChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn môn học" />
                                </SelectTrigger>
                                <SelectContent>
                                    {distributionSubjects.map((item) => (
                                        <SelectItem key={item.subjectID} value={item.subjectID.toString()}>
                                            {item.subjectName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="mb-1 block">Tìm lớp học</Label>
                            <Input
                                value={distributionSearch}
                                onChange={(event) => setDistributionSearch(event.target.value)}
                                placeholder="Nhập tên lớp..."
                            />
                        </div>

                        <div className="rounded-xl border p-3 max-h-56 overflow-y-auto space-y-2">
                            {distributionFilteredClasses.length === 0 ? (
                                <p className="text-sm text-gray-500 font-semibold">Không có lớp phù hợp với môn học đã chọn.</p>
                            ) : (
                                distributionFilteredClasses.map((item) => {
                                    const checked = distributionClassIds.includes(item.classID);
                                    return (
                                        <label key={item.classID} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => handleToggleDistributionClass(item.classID)}
                                                className="h-4 w-4"
                                            />
                                            <span className="font-semibold">{item.className}</span>
                                        </label>
                                    );
                                })
                            )}
                        </div>

                        <p className="text-xs text-gray-500 font-semibold">Đã chọn: {distributionClassIds.length} lớp</p>
                    </div>

                    <DialogFooter>
                        <button
                            className="px-4 h-9 rounded-md border font-semibold"
                            onClick={() => setDistributionModalOpen(false)}
                            disabled={distributionSubmitting}
                        >
                            Hủy
                        </button>
                        <button
                            className="px-4 h-9 rounded-md bg-[#4A69FF] text-white font-semibold disabled:opacity-60"
                            onClick={handleConfirmDistribution}
                            disabled={distributionSubmitting}
                        >
                            {distributionSubmitting ? 'Đang phân phối...' : 'Xác nhận'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
