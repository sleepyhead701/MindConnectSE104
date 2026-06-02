import { loadJson, saveJson } from '../../state.js';
import { getStudentStorageKey } from '../studentState.js';
import { normalizeStudentBooking } from '../utils/normalizeStudentBooking.js';

const STUDENT_NOTIFICATIONS_KEY = 'mindconnect:student-notifications';

let studentNotifications = loadStudentNotifications();

function normalizeStudentNotification(notification = {}) {
    return {
        id: String(notification.id || `notification-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
        type: notification.type || 'booking',
        title: String(notification.title || 'Thông báo').slice(0, 120),
        message: String(notification.message || '').slice(0, 500),
        booking_id: notification.booking_id ? String(notification.booking_id) : '',
        status: notification.status || '',
        read: Boolean(notification.read),
        created_at: notification.created_at || new Date().toISOString()
    };
}

export function loadStudentNotifications() {
    const saved = loadJson(getStudentStorageKey(STUDENT_NOTIFICATIONS_KEY), []);
    return Array.isArray(saved) ? saved.map(normalizeStudentNotification).filter(Boolean) : [];
}

export function saveStudentNotifications() {
    saveJson(getStudentStorageKey(STUDENT_NOTIFICATIONS_KEY), studentNotifications.slice(0, 80));
}

export function getStudentNotifications() {
    return studentNotifications;
}

export function addStudentNotification(notification = {}) {
    const normalized = normalizeStudentNotification(notification);
    const exists = studentNotifications.some(item => item.id === normalized.id);
    if (!exists) {
        studentNotifications = [normalized, ...studentNotifications].slice(0, 80);
        saveStudentNotifications();
        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('mindconnect:notifications-updated'));
        }
    }
    return normalized;
}

export function markStudentNotificationsRead() {
    studentNotifications = studentNotifications.map(item => ({ ...item, read: true }));
    saveStudentNotifications();
    if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('mindconnect:notifications-updated'));
    }
}

export function getUnreadStudentNotificationCount() {
    return studentNotifications.filter(item => !item.read).length;
}

function getBookingStatusTitle(status) {
    const labels = {
        new: 'Đã gửi yêu cầu đặt lịch',
        scheduled: 'Lịch hẹn đã được xác nhận',
        rescheduled: 'Lịch hẹn đã được hẹn lại',
        completed: 'Ca hỗ trợ đã hoàn thành',
        cancelled: 'Lịch hẹn đã bị hủy',
        offline: 'Lịch hẹn đang lưu tạm'
    };
    return labels[status] || 'Lịch hẹn được cập nhật';
}

export function syncBookingNotifications(nextBookings = [], previousBookings = []) {
    const previousById = new Map(previousBookings.map(booking => [String(booking.id), booking]));
    const now = Date.now();

    nextBookings.map(normalizeStudentBooking).filter(Boolean).forEach(booking => {
        const previous = previousById.get(String(booking.id));
        const publicUpdates = Array.isArray(booking.public_updates) ? booking.public_updates : [];
        publicUpdates.forEach(update => {
            addStudentNotification({
                id: `booking-update:${booking.id}:${update.id || update.created_at || update.status}`,
                type: 'booking',
                title: update.label || getBookingStatusTitle(update.status || booking.status),
                message: update.message || `Lịch hẹn ${booking.id} vừa được cập nhật.`,
                booking_id: booking.id,
                status: update.status || booking.status,
                created_at: update.created_at || new Date().toISOString()
            });
        });

        if (previous && previous.status !== booking.status) {
            addStudentNotification({
                id: `booking-status:${booking.id}:${booking.status}:${booking.updated_at || booking.created_at}`,
                type: 'booking',
                title: getBookingStatusTitle(booking.status),
                message: `Trạng thái lịch hẹn lúc ${booking.requested_time ? new Date(booking.requested_time).toLocaleString('vi-VN') : 'chưa chọn giờ'} đã chuyển sang "${getBookingStatusTitle(booking.status)}".`,
                booking_id: booking.id,
                status: booking.status,
                created_at: booking.updated_at || new Date().toISOString()
            });
        }

        if (previous && (previous.requested_time !== booking.requested_time || previous.location !== booking.location)) {
            addStudentNotification({
                id: `booking-time-location:${booking.id}:${booking.requested_time || ''}:${booking.location || ''}`,
                type: 'booking',
                title: 'Lịch hẹn đã đổi thời gian/địa điểm',
                message: `Lịch hẹn mới: ${booking.requested_time ? new Date(booking.requested_time).toLocaleString('vi-VN') : 'chưa chọn giờ'} tại ${booking.location || 'địa điểm hỗ trợ'}.`,
                booking_id: booking.id,
                status: booking.status,
                created_at: booking.updated_at || new Date().toISOString()
            });
        }

        const appointmentTime = new Date(booking.requested_time).getTime();
        const isUpcoming = Number.isFinite(appointmentTime)
            && appointmentTime > now
            && appointmentTime - now <= 24 * 60 * 60 * 1000
            && !['completed', 'cancelled', 'rescheduled'].includes(booking.status);
        if (isUpcoming) {
            addStudentNotification({
                id: `booking-upcoming:${booking.id}:${new Date(appointmentTime).toISOString().slice(0, 13)}`,
                type: 'booking',
                title: 'Sắp tới giờ hẹn',
                message: `Bạn có lịch hẹn vào ${new Date(appointmentTime).toLocaleString('vi-VN')} tại ${booking.location || 'địa điểm hỗ trợ'}.`,
                booking_id: booking.id,
                status: booking.status,
                created_at: new Date().toISOString()
            });
        }
    });
}
