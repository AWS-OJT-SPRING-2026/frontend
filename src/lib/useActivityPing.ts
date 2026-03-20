import { useEffect, useRef } from 'react';
import { authService } from '../services/authService';
import { api } from '../services/api';

const PING_INTERVAL_MS = 3 * 60 * 1000; // 3 phút

/**
 * Hook gửi ping ngầm mỗi 3 phút khi user đã đăng nhập.
 * Gọi PUT /api/users/ping để cập nhật lastActiveAt trên server.
 * Dùng ở các Layout component (TeacherLayout, AdminLayout, StudentLayout).
 */
export function useActivityPing() {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const sendPing = async () => {
            const token = authService.getToken();
            if (!token || authService.isQuickDemoSession()) return;

            try {
                await api.authPut<unknown>('/users/ping', {}, token);
            } catch {
                // Bỏ qua lỗi ping - không ảnh hưởng UX
            }
        };

        // Gửi ping ngay khi mount (user vừa load trang / vừa login)
        sendPing();

        // Thiết lập interval
        intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);
}
