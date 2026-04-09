/**
 * Utility helpers cho hiển thị thời gian tương đối.
 * Dùng thay moment.js/date-fns để tránh thêm dependency.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Ngưỡng coi là "Online" — 5 phút */
export const ONLINE_THRESHOLD_MS = 5 * MINUTE;

/**
 * Đảm bảo parse các string timezone-less như "+07:00" Vietnam Time.
 */
export function parseVnDate(value: string | null | undefined): Date {
    if (!value) return new Date(NaN);
    if (value.length === 19) {
        return new Date(value + '+07:00');
    }
    return new Date(value);
}

/**
 * Kiểm tra user có đang online không dựa trên lastActiveAt.
 * @param lastActiveAt ISO string hoặc timestamp
 * @returns true nếu active trong vòng 5 phút
 */
export function isUserOnline(lastActiveAt: string | null | undefined): boolean {
    if (!lastActiveAt) return false;
    const diff = Date.now() - parseVnDate(lastActiveAt).getTime();
    return diff <= ONLINE_THRESHOLD_MS;
}

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Trả về chuỗi thời gian tương đối từ timestamp đến hiện tại.
 * VD: "2 phút trước", "3 giờ trước", "1 ngày trước"
 * @param dateStr ISO string hoặc timestamp
 */
export function formatTimeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Chưa hoạt động';
    
    const diff = Date.now() - parseVnDate(dateStr).getTime();
    if (diff < ONLINE_THRESHOLD_MS) return 'Vừa xong';

    return formatDistanceToNow(parseVnDate(dateStr), {
        addSuffix: true,
        locale: vi
    });
}

/**
 * Kiểm tra xem thời gian hiện tại có quá hạn 24h so với endTime không.
 * @param endTimeStr ISO datetime string
 * @returns true nếu now > endTime + 24h
 */
export function isPast24hAfterEnd(endTimeStr: string): boolean {
    const endTime = parseVnDate(endTimeStr).getTime();
    return Date.now() > endTime + DAY;
}

/**
 * Kiểm tra buổi học đã bắt đầu chưa.
 * @param startTimeStr ISO datetime string
 * @returns true nếu now >= startTime
 */
export function hasClassStarted(startTimeStr: string): boolean {
    return Date.now() >= parseVnDate(startTimeStr).getTime();
}

/**
 * Kiểm tra buổi học đã kết thúc chưa.
 * @param endTimeStr ISO datetime string
 * @returns true nếu now > endTime
 */
export function hasClassEnded(endTimeStr: string): boolean {
    return Date.now() > parseVnDate(endTimeStr).getTime();
}
