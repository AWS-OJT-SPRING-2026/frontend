import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, MagnifyingGlass, Funnel, Trash, PencilSimple, Question, Circle, CheckCircle, Brain
} from '@phosphor-icons/react';
import {
    teacherQuestionService,
    type QuestionPreviewResponse,
    type QuestionPayload,
    type AnswerPayload
} from '../../../services/teacherQuestionService';
import { authService } from '../../../services/authService';
import { cn } from '../../../lib/utils';
import 'katex/dist/katex.min.css';
import { MathRenderer } from '../../ui/MathRenderer';

const DIFFICULTY_MAP: Record<number, { label: string, color: string, bg: string }> = {
    1: { label: 'Dễ', color: 'text-emerald-700', bg: 'bg-emerald-100' },
    2: { label: 'Trung bình', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    3: { label: 'Khó', color: 'text-red-700', bg: 'bg-red-100' },
};

export default function TeacherQuestionBankDetail() {
    const { bankId } = useParams<{ bankId: string }>();
    const navigate = useNavigate();
    
    const [questions, setQuestions] = useState<QuestionPreviewResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Cleanup logic for questions that have options inside their text
    const cleanQuestionText = (text: string) => {
        if (!text) return '';
        // Look for A. B. C. D. sequence at the end and remove it
        return text.replace(/\s+A\..*B\..*C\..*D\..*$/gs, '').trim();
    };
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionPreviewResponse | null>(null);
    
    // Form state
    const [formData, setFormData] = useState<QuestionPayload>({
        questionText: '',
        difficultyLevel: 1,
        answers: [
            { label: 'A', content: '', isCorrect: true },
            { label: 'B', content: '', isCorrect: false },
            { label: 'C', content: '', isCorrect: false },
            { label: 'D', content: '', isCorrect: false },
        ]
    });

    const fetchQuestions = async () => {
        if (!bankId) return;
        setLoading(true);
        try {
            const token = authService.getToken();
            if (!token) return;
            const data = await teacherQuestionService.getQuestionsByBankId(parseInt(bankId), token);
            setQuestions(data);
        } catch (error) {
            console.error('Failed to fetch questions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
    }, [bankId]);

    const openCreateModal = () => {
        setEditingQuestion(null);
        setFormData({
            questionText: '',
            difficultyLevel: 1,
            answers: [
                { label: 'A', content: '', isCorrect: true },
                { label: 'B', content: '', isCorrect: false },
                { label: 'C', content: '', isCorrect: false },
                { label: 'D', content: '', isCorrect: false },
            ]
        });
        setShowModal(true);
    };

    const openEditModal = (q: QuestionPreviewResponse) => {
        setEditingQuestion(q);
        // Map existing answers or pad to 4
        const defaultLabels = ['A', 'B', 'C', 'D'];
        let mappedAnswers: AnswerPayload[] = defaultLabels.map((lbl, idx) => {
            const existing = q.answers?.find(a => a.label === lbl || a.label === `Lựa chọn ${idx + 1}`);
            if (existing) {
                return { id: existing.id, label: lbl, content: existing.content, isCorrect: existing.isCorrect };
            }
            return { label: lbl, content: '', isCorrect: false };
        });

        // If no correct answer somehow, set A as default
        if (!mappedAnswers.some(a => a.isCorrect)) {
            mappedAnswers[0].isCorrect = true;
        }

        setFormData({
            questionText: q.questionText,
            difficultyLevel: q.difficultyLevel,
            answers: mappedAnswers,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
        try {
            const token = authService.getToken();
            if (!token) return;
            await teacherQuestionService.deleteQuestion(id, token);
            setQuestions(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            console.error('Lỗi khi xóa:', error);
            alert('Không thể xóa câu hỏi.');
        }
    };

    const handleSave = async () => {
        if (!formData.questionText.trim()) {
            alert('Vui lòng nhập nội dung câu hỏi');
            return;
        }
        if (formData.answers.some(a => !a.content.trim())) {
            alert('Vui lòng nhập đầy đủ nội dung các đáp án');
            return;
        }
        
        setActionLoading(true);
        try {
            const token = authService.getToken();
            if (!token) return;
            
            if (editingQuestion) {
                const updated = await teacherQuestionService.updateQuestion(editingQuestion.id, formData, token);
                setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
            } else {
                const created = await teacherQuestionService.createQuestion(parseInt(bankId!), formData, token);
                setQuestions(prev => [...prev, created]);
            }
            setShowModal(false);
        } catch (error: any) {
            console.error('Lỗi khi lưu:', error);
            alert(error?.message || 'Có lỗi xảy ra khi lưu câu hỏi');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleCorrectAnswer = (index: number) => {
        setFormData(prev => ({
            ...prev,
            answers: prev.answers.map((ans, i) => ({
                ...ans,
                isCorrect: i === index
            }))
        }));
    };

    const handleSetAnswerContent = (index: number, val: string) => {
        setFormData(prev => ({
            ...prev,
            answers: prev.answers.map((ans, i) => i === index ? { ...ans, content: val } : ans)
        }));
    };

    const filteredQuestions = questions.filter(q => 
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/teacher/question-banks')}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:text-[#1A1A1A] text-gray-500 transition-colors"
                >
                    <ArrowLeft size={20} weight="bold" />
                </button>
                <div>
                    <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Chi tiết Ngân hàng câu hỏi</h1>
                    <p className="text-gray-500 font-bold mt-1 text-sm">Quản lý và biên soạn câu hỏi trong tài liệu</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border-2 border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                    <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Tìm kiếm câu hỏi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl pl-11 pr-4 py-3 font-bold text-sm focus:border-emerald-500 focus:bg-white transition-all outline-none"
                    />
                </div>
                <button 
                    onClick={openCreateModal}
                    className="whitespace-nowrap flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-extrabold hover:bg-emerald-600 transition-colors"
                >
                    <Plus size={18} weight="bold" />
                    Thêm câu hỏi
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            ) : filteredQuestions.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4">
                        <Question size={32} weight="fill" />
                    </div>
                    <h3 className="text-lg font-extrabold text-[#1A1A1A]">Trống</h3>
                    <p className="text-gray-500 font-bold mt-1">Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredQuestions.map((q, idx) => (
                        <div key={q.id} className="bg-white border-2 border-gray-100 rounded-[28px] p-6 hover:border-emerald-200 transition-colors flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center font-extrabold text-[#1A1A1A] text-lg">
                                {idx + 1}
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn("px-2.5 py-1 rounded-lg text-xs font-extrabold", DIFFICULTY_MAP[q.difficultyLevel]?.bg || 'bg-gray-100', DIFFICULTY_MAP[q.difficultyLevel]?.color || 'text-gray-600')}>
                                            {DIFFICULTY_MAP[q.difficultyLevel]?.label || 'Không rõ'}
                                        </span>
                                        {q.isAi && (
                                            <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                                                <Brain size={12} weight="fill" /> Câu hỏi AI
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[#1A1A1A] font-bold text-base leading-relaxed markdown-content">
                                        <MathRenderer content={cleanQuestionText(q.questionText)?.replace(/\\n/g, '\n')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(q.answers || []).map((ans, aIdx) => (
                                        <div key={aIdx} className={cn(
                                            "flex items-start gap-3 p-3 rounded-xl border-2 transition-colors",
                                            ans.isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-transparent"
                                        )}>
                                            <div className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 mt-0.5",
                                                ans.isCorrect ? "bg-emerald-500 text-white" : "bg-white border-2 border-gray-300 text-gray-500"
                                            )}>
                                                {ans.label}
                                            </div>
                                            <div className={cn(
                                                "font-bold text-sm w-full break-words",
                                                ans.isCorrect ? "text-emerald-700" : "text-gray-600"
                                            )}>
                                                <MathRenderer content={ans.content} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:flex-col pt-2 w-full md:w-auto justify-end">
                                <button 
                                    onClick={() => openEditModal(q)}
                                    className="w-10 h-10 rounded-xl bg-gray-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                                >
                                    <PencilSimple size={18} weight="bold" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(q.id)}
                                    className="w-10 h-10 rounded-xl bg-gray-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    <Trash size={18} weight="bold" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Edit/Create */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-extrabold text-[#1A1A1A] mb-6">
                            {editingQuestion ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi mới'}
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2">Nội dung câu hỏi</label>
                                <textarea
                                    value={formData.questionText}
                                    onChange={(e) => setFormData(p => ({ ...p, questionText: e.target.value }))}
                                    className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 font-bold text-[#1A1A1A] focus:border-emerald-500 outline-none min-h-[120px] resize-none"
                                    placeholder="Nhập nội dung câu hỏi vào đây..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2">Độ khó</label>
                                <div className="flex gap-3">
                                    {[1, 2, 3].map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setFormData(p => ({ ...p, difficultyLevel: level }))}
                                            className={cn(
                                                "flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all",
                                                formData.difficultyLevel === level
                                                    ? cn(DIFFICULTY_MAP[level].bg, DIFFICULTY_MAP[level].color, "border-transparent")
                                                    : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                                            )}
                                        >
                                            {DIFFICULTY_MAP[level].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3">Các đáp án</label>
                                <div className="space-y-3">
                                    {formData.answers.map((ans, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <button 
                                                onClick={() => toggleCorrectAnswer(idx)}
                                                className={cn(
                                                    "w-10 h-10 flex-shrink-0 cursor-pointer flex items-center justify-center rounded-xl transition-all",
                                                    ans.isCorrect ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                )}
                                                title={ans.isCorrect ? "Đáp án đúng" : "Đánh dấu là đáp án đúng"}
                                            >
                                                {ans.isCorrect ? <CheckCircle size={24} weight="fill" /> : <Circle size={24} weight="bold" />}
                                            </button>
                                            <div className="flex-1 relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-[#1A1A1A]">
                                                    {ans.label}.
                                                </div>
                                                <input 
                                                    type="text"
                                                    value={ans.content}
                                                    onChange={(e) => handleSetAnswerContent(idx, e.target.value)}
                                                    placeholder={`Nhập đáp án ${ans.label}...`}
                                                    className={cn(
                                                        "w-full border-2 rounded-xl pl-10 pr-4 py-3 font-bold text-sm outline-none transition-all",
                                                        ans.isCorrect ? "bg-emerald-50/50 border-emerald-500 text-emerald-900" : "bg-white border-gray-200 focus:border-gray-400 text-[#1A1A1A]"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-gray-400 mt-2 flex items-center gap-1">
                                    <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                                    Bấm vào nút hình tròn để chọn đáp án đúng
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t font-bold border-gray-100">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="px-6 py-3 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={actionLoading}
                                className="px-6 py-3 bg-[#1A1A1A] text-white rounded-xl hover:bg-black transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {actionLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {editingQuestion ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
