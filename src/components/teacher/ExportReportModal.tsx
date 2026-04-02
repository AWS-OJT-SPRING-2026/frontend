import { useState } from 'react';
import {
    X, DownloadSimple, FileXls, FilePdf, FileCsv,
    CircleNotch, CheckCircle, Warning,
} from '@phosphor-icons/react';
import { useSettings } from '../../context/SettingsContext';
import { authService } from '../../services/authService';
import { classroomService } from '../../services/classroomService';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type ExportFormat  = 'EXCEL' | 'PDF' | 'CSV';
type DataType      = 'GRADEBOOK' | 'ATTENDANCE' | 'PROGRESS';
type TimeRange     = 'THIS_WEEK' | 'THIS_MONTH' | 'CURRENT_SEMESTER';

interface ExportReportRequest {
    format:    ExportFormat;
    dataTypes: DataType[];
    timeRange: TimeRange;
}

type ToastState = { type: 'success' | 'error'; message: string } | null;

interface Props {
    classId:   number;
    className: string;
    onClose:   () => void;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const FORMAT_OPTIONS: { value: ExportFormat; label: string; Icon: React.ElementType; color: string }[] = [
    { value: 'EXCEL', label: 'Excel (.xlsx)', Icon: FileXls,  color: '#22c55e' },
    { value: 'PDF',   label: 'PDF (.pdf)',    Icon: FilePdf,  color: '#ef4444' },
    { value: 'CSV',   label: 'CSV (.csv)',    Icon: FileCsv,  color: '#3b82f6' },
];

const DATA_TYPE_OPTIONS: { value: DataType; label: string; sub: string; color: string }[] = [
    { value: 'GRADEBOOK',  label: 'Bảng điểm tổng hợp',   sub: 'Điểm tất cả bài kiểm tra và bài tập',  color: '#B8B5FF' },
    { value: 'ATTENDANCE', label: 'Báo cáo điểm danh',     sub: 'Lịch sử tham gia buổi học',            color: '#FCE38A' },
    { value: 'PROGRESS',   label: 'Tiến độ hoàn thành',    sub: 'Tỷ lệ hoàn thành tài liệu & bài tập', color: '#95E1D3' },
];

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'THIS_WEEK',         label: 'Tuần này' },
    { value: 'THIS_MONTH',        label: 'Tháng này' },
    { value: 'CURRENT_SEMESTER',  label: 'Học kỳ hiện tại' },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
export function ExportReportModal({ classId, className, onClose }: Props) {
    const { theme } = useSettings();
    const isDark = theme === 'dark';

    const [format,    setFormat]    = useState<ExportFormat>('EXCEL');
    const [dataTypes, setDataTypes] = useState<DataType[]>(['GRADEBOOK']);
    const [timeRange, setTimeRange] = useState<TimeRange>('THIS_MONTH');
    const [isLoading, setIsLoading] = useState(false);
    const [error,     setError]     = useState<string | null>(null);
    const [success,   setSuccess]   = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        window.setTimeout(() => setToast(null), 2400);
    };

    const triggerBrowserDownload = (blob: Blob, fileName: string) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(blobUrl);
    };

    const toggleDataType = (type: DataType) => {
        setDataTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleExport = async () => {
        if (dataTypes.length === 0) {
            setError('Vui lòng chọn ít nhất một loại dữ liệu để xuất.');
            return;
        }
        setError(null);
        setIsLoading(true);

        const payload: ExportReportRequest = { format, dataTypes, timeRange };
        try {
            const token = authService.getToken();
            if (!token) {
                setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                showToast('error', 'Không thể tải báo cáo: chưa đăng nhập.');
                return;
            }

            const file = await classroomService.downloadClassReport(classId, token, payload);
            triggerBrowserDownload(file.blob, file.fileName);
            setSuccess(true);
            showToast('success', 'Tải báo cáo thành công.');
            setTimeout(onClose, 1800);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Có lỗi xảy ra khi xuất báo cáo. Vui lòng thử lại.';
            setError(message);
            showToast('error', 'Xuất báo cáo thất bại.');
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Styles ── */
    const surface  = isDark ? 'bg-[#171b20] border-white/10' : 'bg-white border-[#1A1A1A]';
    const label    = isDark ? 'text-gray-100' : 'text-[#1A1A1A]';
    const muted    = isDark ? 'text-gray-400' : 'text-[#1A1A1A]/50';
    const divider  = isDark ? 'border-white/10' : 'border-[#1A1A1A]/10';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {toast && (
                <div
                    className={`absolute top-4 right-4 z-[60] px-4 py-2 rounded-2xl text-sm font-extrabold shadow-lg ${
                        toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}
                >
                    {toast.message}
                </div>
            )}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className={`relative w-full max-w-lg rounded-3xl border-2 shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] ${surface}`}
                style={{ fontFamily: "'Nunito', sans-serif" }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className={`px-6 py-5 border-b-2 flex items-center justify-between ${divider}`}
                     style={{ backgroundColor: isDark ? '#20242b' : '#FCE38A' }}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-[#1A1A1A]/10'}`}>
                            <DownloadSimple className={`w-5 h-5 ${isDark ? 'text-gray-100' : 'text-[#1A1A1A]'}`} weight="fill" />
                        </div>
                        <div>
                            <h2 className={`font-extrabold text-lg leading-tight ${label}`}>Xuất báo cáo</h2>
                            <p className={`text-xs font-bold mt-0.5 ${muted}`}>Lớp {className}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-100' : 'bg-[#1A1A1A]/10 hover:bg-[#1A1A1A]/20'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* ── Success state ── */}
                    {success && (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-emerald-500" weight="fill" />
                            </div>
                            <p className={`font-extrabold text-center ${label}`}>Yêu cầu xuất báo cáo đã được gửi!</p>
                            <p className={`text-sm text-center ${muted}`}>Báo cáo sẽ sẵn sàng trong giây lát.</p>
                        </div>
                    )}

                    {!success && (
                        <>
                            {/* ── Section: Format ── */}
                            <div>
                                <p className={`text-xs font-extrabold uppercase tracking-widest mb-3 ${muted}`}>
                                    Định dạng xuất
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {FORMAT_OPTIONS.map(opt => {
                                        const active = format === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setFormat(opt.value)}
                                                className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 font-extrabold text-sm transition-all ${
                                                    active
                                                        ? 'border-[#FF6B4A] bg-[#FF6B4A]/10 text-[#FF6B4A] shadow-md shadow-[#FF6B4A]/15'
                                                        : isDark
                                                            ? 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                                            : 'border-[#1A1A1A]/15 bg-[#F7F7F2] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                                                }`}
                                            >
                                                <opt.Icon className="w-6 h-6" style={{ color: active ? '#FF6B4A' : opt.color }} weight="fill" />
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Section: Data types ── */}
                            <div>
                                <p className={`text-xs font-extrabold uppercase tracking-widest mb-3 ${muted}`}>
                                    Loại dữ liệu
                                </p>
                                <div className="space-y-2.5">
                                    {DATA_TYPE_OPTIONS.map(opt => {
                                        const checked = dataTypes.includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => toggleDataType(opt.value)}
                                                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                                                    checked
                                                        ? 'border-[#FF6B4A] shadow-sm shadow-[#FF6B4A]/15'
                                                        : isDark
                                                            ? 'border-white/10 hover:bg-white/5'
                                                            : 'border-[#1A1A1A]/15 hover:bg-[#1A1A1A]/3'
                                                }`}
                                                style={{ backgroundColor: checked ? (isDark ? undefined : opt.color + '55') : undefined }}
                                            >
                                                {/* Checkbox indicator */}
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                    checked
                                                        ? 'bg-[#FF6B4A] border-[#FF6B4A]'
                                                        : isDark ? 'border-white/20' : 'border-[#1A1A1A]/25'
                                                }`}>
                                                    {checked && <span className="text-white text-[10px] font-extrabold leading-none">✓</span>}
                                                </div>
                                                <div>
                                                    <p className={`font-extrabold text-sm ${label}`}>{opt.label}</p>
                                                    <p className={`text-xs font-semibold mt-0.5 ${muted}`}>{opt.sub}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Section: Time range ── */}
                            <div>
                                <p className={`text-xs font-extrabold uppercase tracking-widest mb-3 ${muted}`}>
                                    Khoảng thời gian
                                </p>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {TIME_RANGE_OPTIONS.map(opt => {
                                        const active = timeRange === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setTimeRange(opt.value)}
                                                className={`py-2.5 px-3 rounded-2xl border-2 font-extrabold text-xs text-center transition-all ${
                                                    active
                                                        ? 'bg-[#FF6B4A] text-white border-[#FF6B4A] shadow-md shadow-[#FF6B4A]/20'
                                                        : isDark
                                                            ? 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                                            : 'border-[#1A1A1A]/15 bg-[#F7F7F2] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Error ── */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FFB5B5]/40 border-2 border-red-200">
                                    <Warning className="w-4 h-4 text-red-500 shrink-0" weight="fill" />
                                    <p className="text-sm font-bold text-red-700">{error}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Footer actions ── */}
                {!success && (
                    <div className={`px-6 pb-6 pt-4 border-t-2 flex gap-3 ${divider}`}>
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className={`flex-1 py-3 font-extrabold rounded-2xl border-2 transition-colors disabled:opacity-40 ${
                                isDark
                                    ? 'bg-white/5 hover:bg-white/10 text-gray-100 border-white/10'
                                    : 'bg-[#1A1A1A]/5 hover:bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/15'
                            }`}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isLoading || dataTypes.length === 0}
                            className="flex-1 py-3 bg-[#FF6B4A] hover:bg-[#ff5535] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#FF6B4A]/20"
                        >
                            {isLoading
                                ? <><CircleNotch className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                                : <><DownloadSimple className="w-4 h-4" weight="fill" /> Tải xuống</>
                            }
                        </button>
                    </div>
                )}

                <style>{`
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px) scale(0.97); }
                        to   { opacity: 1; transform: translateY(0)    scale(1);    }
                    }
                `}</style>
            </div>
        </div>
    );
}
