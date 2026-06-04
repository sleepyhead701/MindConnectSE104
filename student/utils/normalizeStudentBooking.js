import { getSupportLocations } from '../../shared/state.js';

function getDefaultSupportLocation() {
    return getSupportLocations()[0] || 'Phòng tham vấn 102 - Khu B';
}

export function normalizeStudentBooking(booking = {}) {
    return {
        id: String(booking.id || booking._id || `local-booking-${Date.now()}`),
        requested_time: booking.requested_time || booking.scheduled_at || null,
        location: booking.location || getDefaultSupportLocation(),
        note: booking.note || booking.excerpt || '',
        status: booking.status || 'new',
        before_mood_score: booking.before_mood_score ?? null,
        after_mood_score: booking.after_mood_score ?? null,
        rescheduled_from: booking.rescheduled_from || '',
        rescheduled_at: booking.rescheduled_at || null,
        public_updates: Array.isArray(booking.public_updates) ? booking.public_updates : [],
        created_at: booking.created_at || new Date().toISOString(),
        updated_at: booking.updated_at || null
    };
}
