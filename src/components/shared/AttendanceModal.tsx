import { useState, useEffect } from 'react';
import { X, Check, Warning, Clock } from '@phosphor-icons/react';
import { isPast24hAfterEnd, hasClassStarted } from '../../lib/timeUtils';
import { authService } from '../../services/authService';
import { timetableService, type AttendanceRequest } from '../../services/timetableService';

export interface AttendanceStudent {
    id: number;
    code: string;
    name: string;
}

export interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: { id: number; title: string; className: string; startTime: string; endTime: string } | null;
    isAdmin: boolean;
}

type AttendanceStatus = 'present' | 'absent';

interface StudentAttendance {
    status: AttendanceStatus;
    note: string;
}

export function AttendanceModal({ isOpen, onClose, event, isAdmin }: AttendanceModalProps) {
    const [students, setStudents] = useState<AttendanceStudent[]>([]);
    const [attendance, setAttendance] = useState<Record<string, StudentAttendance>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    const toUiStatus = (status?: string): AttendanceStatus => {
        return status?.toUpperCase() === 'ABSENT' ? 'absent' : 'present';
    };

    // Load attendance list from backend when modal opens
    useEffect(() => {
        if (!isOpen || !event) {
            return;
        }

        let active = true;

        const loadAttendance = async () => {
            const token = authService.getToken();
            if (!token) {
                if (!active) return;
                setFetchError('Bạn chưa đăng nhập.');
                setStudents([]);
                setAttendance({});
                return;
            }

            setIsLoading(true);
            setFetchError(null);
            setSaveError(null);

            try {
                const data = await timetableService.getAttendanceByTimetable(event.id, token);
                if (!active) return;

                const mappedStudents: AttendanceStudent[] = data.map((item) => ({
                    id: item.studentID,
                    code: item.studentCode,
                    name: item.fullName,
                }));

                const initial: Record<string, StudentAttendance> = {};
                data.forEach((item) => {
                    initial[String(item.studentID)] = {
                        status: toUiStatus(item.status),
                        note: item.note ?? '',
                    };
                });

                setStudents(mappedStudents);
                setAttendance(initial);
            } catch (error) {
                if (!active) return;
                const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu điểm danh.';
                setFetchError(message);
                setStudents([]);
                setAttendance({});
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };

        loadAttendance();

        return () => {
            active = false;
        };
    }, [isOpen, event]);

    if (!isOpen || !event) return null;

    const isPast24h = isPast24hAfterEnd(event.endTime);
    const hasStarted = hasClassStarted(event.startTime);
    const readOnly = (!isAdmin && isPast24h) || !hasStarted;

    const handleSave = async () => {
        if (!event) return;

        const token = authService.getToken();
        if (!token) {
            setSaveError('Bạn chưa đăng nhập.');
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        try {
            const requests: AttendanceRequest[] = students.map((student) => {
                const current = attendance[String(student.id)] ?? { status: 'present', note: '' };

                return {
                    studentID: student.id,
                    status: current.status === 'absent' ? 'ABSENT' : 'PRESENT',
                    note: current.note ?? '',
                };
            });

            await timetableService.saveAttendance(event.id, requests, token);
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Không thể lưu điểm danh.';
            setSaveError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
        if (readOnly) return;
        const key = String(studentId);
        setAttendance(prev => ({ ...prev, [key]: { ...prev[key], status } }));
    };

    const handleNoteChange = (studentId: number, note: string) => {
        if (readOnly) return;
        const key = String(studentId);
        setAttendance(prev => ({ ...prev, [key]: { ...prev[key], note } }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="w-[min(96vw,78rem)] max-w-5xl bg-white rounded-3xl border-2 border-[#1A1A1A] shadow-2xl flex flex-col max-h-[92vh] animate-[slideUp_0.3s_ease-out]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b-2 border-[#1A1A1A] flex items-center justify-between bg-[#FCE38A] rounded-t-3xl">
                    <div>
                        <h3 className="font-extrabold text-xl text-[#1A1A1A]">Điểm danh: {event.className}</h3>
                        <p className="text-sm font-bold text-[#1A1A1A]/70">{event.title}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-xl bg-black/5 hover:bg-black/10 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Notifications */}
                <div className="px-6 pt-4 shrink-0">
                    {!hasStarted ? (
                        <div className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-2xl flex items-center gap-2 text-yellow-700 font-bold text-sm">
                            <Clock className="w-5 h-5" />
                            Buổi học chưa bắt đầu. Bạn chưa thể điểm danh.
                        </div>
                    ) : !isAdmin && isPast24h ? (
                        <div className="p-3 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-2 text-red-600 font-bold text-sm">
                            <Warning className="w-5 h-5" />
                            Đã quá hạn 24h, chỉ Admin mới có thể chỉnh sửa điểm danh.
                        </div>
                    ) : isAdmin && isPast24h ? (
                        <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center gap-2 text-blue-700 font-bold text-sm">
                            <Warning className="w-5 h-5 inline" />
                            Buổi học đã qua 24h. Bạn đang sửa với quyền Admin.
                        </div>
                    ) : null}
                </div>

                {/* Body Table */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    <div className="w-full">
                    <table className="w-full table-fixed text-left text-sm">
                        <thead className="bg-[#1A1A1A]/5 border-b-2 border-[#1A1A1A]/20">
                            <tr>
                                <th className="px-3 sm:px-4 py-3 font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider text-xs w-14 text-center">STT</th>
                                <th className="px-3 sm:px-4 py-3 font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider text-xs w-[30%]">Học sinh</th>
                                <th className="px-3 sm:px-4 py-3 font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider text-xs text-center w-[28%]">Trạng thái</th>
                                <th className="px-3 sm:px-4 py-3 font-extrabold text-[#1A1A1A]/50 uppercase tracking-wider text-xs w-[34%]">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]/10">
                            {students.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-gray-50/50">
                                    <td className="px-3 sm:px-4 py-3 text-center font-bold text-gray-500">{idx + 1}</td>
                                    <td className="px-3 sm:px-4 py-3">
                                        <div className="font-extrabold text-[#1A1A1A] truncate" title={student.name}>{student.name}</div>
                                        <div className="text-xs text-gray-400 font-mono truncate">{student.code}</div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3">
                                        <div className={`flex items-center justify-center gap-1 sm:gap-2 p-1 rounded-xl border-2 ${readOnly ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' : 'border-[#1A1A1A]/10 bg-white'}`}>
                                            <label className={`flex items-center justify-center cursor-pointer p-2 rounded-lg transition-colors flex-1 min-w-0 ${attendance[student.id]?.status === 'present' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'hover:bg-gray-100'}`}>
                                                <input 
                                                    type="radio" 
                                                    name={`attendance-${student.id}`} 
                                                    className="sr-only"
                                                    checked={attendance[student.id]?.status === 'present'}
                                                    onChange={() => handleStatusChange(student.id, 'present')}
                                                    disabled={readOnly}
                                                />
                                                <span className="text-xs whitespace-nowrap">Có mặt</span>
                                            </label>
                                            <label className={`flex items-center justify-center cursor-pointer p-2 rounded-lg transition-colors flex-1 min-w-0 ${attendance[student.id]?.status === 'absent' ? 'bg-red-100 text-red-800 font-bold' : 'hover:bg-gray-100'}`}>
                                                <input 
                                                    type="radio" 
                                                    name={`attendance-${student.id}`} 
                                                    className="sr-only"
                                                    checked={attendance[student.id]?.status === 'absent'}
                                                    onChange={() => handleStatusChange(student.id, 'absent')}
                                                    disabled={readOnly}
                                                />
                                                <span className="text-xs whitespace-nowrap">Vắng</span>
                                            </label>
                                        </div>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3">
                                        <input
                                            type="text"
                                            value={attendance[student.id]?.note || ''}
                                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                            placeholder="Nhập ghi chú..."
                                            disabled={readOnly}
                                            className="w-full min-w-0 text-sm rounded-xl border-2 border-[#1A1A1A]/20 bg-white px-3 py-2 font-semibold text-[#1A1A1A] transition-colors focus:border-[#FF6B4A] focus:outline-none disabled:opacity-50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {isLoading && (
                        <p className="mt-4 text-sm font-bold text-[#1A1A1A]/60">Đang tải danh sách học sinh...</p>
                    )}
                    {!isLoading && fetchError && (
                        <p className="mt-4 text-sm font-bold text-red-600">{fetchError}</p>
                    )}
                    {!isLoading && !fetchError && students.length === 0 && (
                        <p className="mt-4 text-sm font-bold text-[#1A1A1A]/60">Buổi học này chưa có học sinh để điểm danh.</p>
                    )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t-2 border-[#1A1A1A]/10 flex gap-3 shrink-0">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 px-4 font-extrabold text-[#1A1A1A] border-2 border-[#1A1A1A]/20 bg-white hover:bg-gray-50 rounded-2xl transition-all"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={readOnly || isSaving || isLoading || !!fetchError || students.length === 0}
                        className="flex-1 py-3 px-4 flex items-center justify-center gap-2 font-extrabold text-white bg-[#FF6B4A] hover:bg-[#ff5535] rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check className="w-5 h-5" weight="bold" />
                        {isSaving ? 'Đang lưu...' : 'Lưu điểm danh'}
                    </button>
                </div>
                {saveError && (
                    <div className="px-6 pb-5 text-sm font-bold text-red-600">{saveError}</div>
                )}
            </div>
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
