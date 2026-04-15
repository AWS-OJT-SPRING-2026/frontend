import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { 
    Folders, BookOpenText, Plus, FileText, MagnifyingGlass, Funnel, Clock 
} from '@phosphor-icons/react';
import { teacherDocumentService, type TeacherDocumentItem } from '../../../services/teacherDocumentService';
import { authService } from '../../../services/authService';
import TeacherQuestionBankDetail from './TeacherQuestionBankDetail';
import { cn } from '../../../lib/utils';

function QuestionBankList() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<TeacherDocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const token = authService.getToken();
                if (!token) throw new Error('Vui lòng đăng nhập.');
                const docs = await teacherDocumentService.getDocuments(token);
                setDocuments(docs.filter(doc => doc.doc_type === 'question' || doc.doc_type === 'QUESTION'));
            } catch (err: any) {
                setError(err.message || 'Không thể tải danh sách tài liệu.');
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, []);

    const filteredDocs = documents.filter(doc => 
        doc.book_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="font-bold">Đang tải danh sách ngân hàng câu hỏi...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-500 p-6 rounded-[24px] border-2 border-red-100 flex flex-col items-center justify-center text-center">
                <p className="font-extrabold text-lg mb-2">Đã xảy ra lỗi</p>
                <p className="text-sm font-bold opacity-80">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-[#1A1A1A] flex items-center gap-3">
                        <Folders weight="fill" className="text-emerald-500" />
                        Quản lý Ngân hàng câu hỏi
                    </h1>
                    <p className="text-gray-500 font-bold mt-1 text-sm">
                        Quản lý các tài liệu câu hỏi của bạn. Nhấp vào tài liệu để xem và biên soạn câu hỏi.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/teacher/documents')}
                    className="flex items-center gap-2 px-5 py-3 bg-[#1A1A1A] text-white rounded-2xl font-extrabold hover:bg-black transition-all hover:scale-[1.02] active:scale-95 text-sm"
                >
                    <Plus size={18} weight="bold" />
                    Tải lên tài liệu mới
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <MagnifyingGlass 
                        size={20} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" 
                    />
                    <input 
                        type="text"
                        placeholder="Tìm kiếm tài liệu, môn học..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-11 pr-4 py-3 font-bold text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-[#1A1A1A]"
                    />
                </div>
                <button className="flex items-center justify-center w-12 h-12 bg-white border-2 border-gray-200 rounded-2xl text-gray-500 hover:text-[#1A1A1A] hover:bg-gray-50 hover:border-gray-300 transition-all">
                    <Funnel size={20} weight="bold" />
                </button>
            </div>

            {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDocs.map(doc => (
                        <div 
                            key={doc.id}
                            onClick={() => navigate(`/teacher/question-banks/${doc.id}`)}
                            className="bg-white group cursor-pointer border-2 border-gray-200 rounded-[28px] overflow-hidden hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 transform hover:-translate-y-1 flex flex-col"
                        >
                            <div className="p-6 pb-4 flex-1 flex flex-col gap-4">
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                    <BookOpenText size={32} weight="fill" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-[#1A1A1A] text-lg leading-tight line-clamp-2 mb-1 group-hover:text-emerald-600 transition-colors">
                                        {doc.book_name}
                                    </h3>
                                    <span className="text-xs font-extrabold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg inline-block">
                                        {doc.subject_name}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="px-6 py-4 bg-gray-50 mt-auto border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={16} />
                                    <span>
                                      {new Date(doc.uploadDate).toLocaleDateString('vi-VN', {
                                          day: '2-digit', month: '2-digit', year: 'numeric'
                                      })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-600">
                                    <span>Biên soạn</span>
                                    <FileText size={16} weight="fill" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-[40px] p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-6 group-hover:scale-110 transition-transform">
                        <BookOpenText size={40} weight="fill" />
                    </div>
                    <h3 className="text-xl font-extrabold text-[#1A1A1A] mb-3">Chưa có ngân hàng câu hỏi</h3>
                    <p className="text-gray-500 font-bold max-w-md">
                        Bạn chưa tải lên tài liệu câu hỏi nào. Tải lên một tài liệu với định dạng "Ngân hàng câu hỏi" để bắt đầu biên soạn.
                    </p>
                    <button
                        onClick={() => navigate('/teacher/documents')}
                        className="mt-6 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-extrabold hover:bg-black transition-all hover:scale-[1.02] active:scale-95"
                    >
                        Đến trang Quản lý tài liệu
                    </button>
                </div>
            )}
        </div>
    );
}

export function TeacherQuestionBankLayout() {
    return (
        <div className="w-full p-2 md:p-4 lg:p-6 mb-8">
            <Routes>
                <Route path="/" element={<QuestionBankList />} />
                <Route path="/:bankId" element={<TeacherQuestionBankDetail />} />
            </Routes>
        </div>
    );
}
