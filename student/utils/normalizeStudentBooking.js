

export function normalizeStudentBooking(booking = {}) {
    return {
        id: String(booking.id || booking._id || `local-booking-${Date.now()}`),
        requested_time: booking.requested_time || booking.scheduled_at || null,
        location: booking.location || getSupportLocation(),
        note: booking.note || booking.excerpt || '',
        status: booking.status || 'new',
        before_mood_score: booking.before_mood_score ?? null,
        after_mood_score: booking.after_mood_score ?? null,
        rescheduled_from: booking.rescheduled_from || '',
        rescheduled_at: booking.rescheduled_at || null,
        created_at: booking.created_at || new Date().toISOString(),
        updated_at: booking.updated_at || null
    };
}