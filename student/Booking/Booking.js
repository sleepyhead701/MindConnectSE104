import { blockIfBackendNotReady } from '../API/blockIfBackendNotReady.js'
import { getCurrentMoodScore, setCurrentMoodScore, getStudentBookings, setStudentBookings } from '../studentState.js';
import { addStudentNotification } from './BookingNotifications.js';
import { apiRequest } from '../utils/utils.js';
import { getSupportLocations } from '../../state.js';
import { escapeHtml } from '../utils/utils.js';
import { trackInteraction } from '../API/analytics.js';
import { getRiskAlerts, saveRiskAlerts } from '../RiskAlert.js';

export function getSupportLocation(value) {
    const selected = String(value || '').trim();
    return getSupportLocations().includes(selected) ? selected : getSupportLocations()[0];
}

function renderSupportLocationOptions(selectedLocation = getSupportLocation()) {
    return getSupportLocations().map(location => `
        <option value="${escapeHtml(location)}" ${location === selectedLocation ? 'selected' : ''}>
            ${escapeHtml(location)}
        </option>
    `).join('');
}

export function getBookingStatusLabel(status) {
    const labels = {
        new: 'Đang chờ',
        scheduled: 'Đã xác nhận',
        rescheduled: 'Đã hẹn lại',
        completed: 'Đã hoàn thành',
        cancelled: 'Đã hủy',
        offline: 'Lưu tạm trên máy'
    };
    return labels[status] || status || 'Đang chờ';
}

export function formatBookingDateTime(value) {
    if (!value) return 'Chưa chọn thời gian';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa chọn thời gian';
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

export function openFeedbackModal(context = {}) {
    const existing = document.getElementById('student-feedback-modal');
    if (existing) existing.remove();

    const beforeScore = Number(context.before_mood_score || getCurrentMoodScore() || 3);
    const afterScore = Number(context.after_mood_score || getCurrentMoodScore() || 3);
    const modal = document.createElement('div');
    modal.id = 'student-feedback-modal';
    modal.className = 'modal-overlay';
    modal.dataset.sourceType = context.source_type || 'feedback';
    modal.dataset.bookingId = context.booking_id || '';

    modal.innerHTML = `
        <div class="modal-content" style="max-height: 90vh; overflow:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom: 16px;">
                <div>
                    <h3 style="color: var(--deep-rose); font-family: var(--font-heading); margin:0;">Gửi feedback ẩn danh</h3>
                    <p style="margin:4px 0 0; color:#666; font-size:13px;">Nhà trường sẽ dùng phản hồi này để đo hiệu quả hỗ trợ.</p>
                </div>
                <button type="button" id="close-feedback-btn" aria-label="Đóng" style="font-size: 24px; cursor:pointer; color: #999; border:0; background:transparent;">&times;</button>
            </div>

            <label class="mc-field-label" for="feedback-report">Bạn muốn báo cáo hoặc chia sẻ điều gì?</label>
            <textarea id="feedback-report" class="mc-textarea" style="min-height:90px;" placeholder="Ví dụ: Sau buổi tư vấn mình thấy nhẹ hơn, hoặc mình vẫn còn gặp khó khăn..."></textarea>

            <label class="mc-field-label" for="feedback-rating" style="margin-top:14px;">Đánh giá ngắn về hỗ trợ/tài nguyên</label>
            <textarea id="feedback-rating" class="mc-textarea" style="min-height:70px;" placeholder="Điều gì hữu ích? Điều gì cần cải thiện?"></textarea>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px;">
                <div>
                    <label class="mc-field-label" for="feedback-before">Trước hỗ trợ</label>
                    <select id="feedback-before" class="mc-input">
                        ${[1, 2, 3, 4, 5].map(score => `<option value="${score}" ${score === beforeScore ? 'selected' : ''}>${score}/5</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="mc-field-label" for="feedback-after">Sau hỗ trợ</label>
                    <select id="feedback-after" class="mc-input">
                        ${[1, 2, 3, 4, 5].map(score => `<option value="${score}" ${score === afterScore ? 'selected' : ''}>${score}/5</option>`).join('')}
                    </select>
                </div>
            </div>

            <button class="mc-btn mc-btn-primary" id="submit-feedback-btn" style="width:100%; margin-top:18px;" type="button">Gửi phản hồi</button>
        </div>
    `;
    document.querySelector('.mobile-frame')?.appendChild(modal);
    
    modal.onclick = function(e) { if (e.target === modal) closeFeedbackModal(); };
    document.getElementById('close-feedback-btn').addEventListener('click', closeFeedbackModal);
    document.getElementById('submit-feedback-btn').addEventListener('click', submitStudentFeedback);
}

function closeFeedbackModal() {
    const modal = document.getElementById('student-feedback-modal');
    if (modal) modal.remove();
}

async function submitStudentFeedback() {
    if (blockIfBackendNotReady()) return;

    const modal = document.getElementById('student-feedback-modal');
    const reportText = document.getElementById('feedback-report')?.value.trim() || '';
    const ratingText = document.getElementById('feedback-rating')?.value.trim() || '';
    const beforeScore = Number(document.getElementById('feedback-before')?.value || getCurrentMoodScore());
    const afterScore = Number(document.getElementById('feedback-after')?.value || getCurrentMoodScore());

    if (!reportText && !ratingText) {
        alert('Bạn hãy nhập nội dung feedback hoặc báo cáo trước khi gửi nhé.');
        return;
    }

    try {
        const feedback = await apiRequest('/api/feedback', {
            method: 'POST',
            body: JSON.stringify({
                source_type: modal?.dataset.sourceType || 'feedback',
                booking_id: modal?.dataset.bookingId || '',
                report_text: reportText,
                rating_text: ratingText,
                mood_score: afterScore,
                before_mood_score: beforeScore,
                after_mood_score: afterScore
            })
        });
        setCurrentMoodScore(afterScore);
        trackInteraction('feedback', feedback?.id || 'student-feedback', {
            surface: 'feedback-modal',
            source_type: modal?.dataset.sourceType || 'feedback'
        });
        closeFeedbackModal();
        alert('Đã gửi feedback ẩn danh cho nhà trường. Cảm ơn bạn đã chia sẻ.');
    } catch (error) {
        alert(`Không gửi được feedback lúc này: ${error.message}`);
    }
}

export function openBookingModal() {
    const existing = document.getElementById('booking-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'booking-modal';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <h3 style="color: var(--deep-rose); font-family: var(--font-heading);">Đặt lịch tham vấn</h3>
                <button type="button" id="close-booking-btn" aria-label="Đóng" style="font-size: 24px; cursor:pointer; color: #999; border:0; background:transparent;">&times;</button>
            </div>

            <div class="info-row"><span class="label">📞 Hotline hỗ trợ:</span><a href="tel:19001234" class="val" style="text-decoration:none;">1900.1234</a></div>
            <div class="info-row"><span class="label">📍 Địa điểm:</span><span class="val" style="font-size: 14px;">Phòng 102 - Khu B</span></div>

            <div style="margin-bottom: 15px;">
                <label style="display:block; font-size: 13px; margin-bottom: 5px; color:#666;">Chọn thời gian mong muốn:</label>
                <input type="datetime-local" id="booking-time" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; font-size: 13px; margin-bottom: 5px; color:#666;">Chọn địa điểm mong muốn:</label>
                <select id="booking-location" class="mc-input">
                    ${renderSupportLocationOptions()}
                </select>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size: 13px; margin-bottom: 5px; color:#666;">Ghi chú (Không bắt buộc):</label>
                <input type="text" id="booking-note" placeholder="Ví dụ: Mình muốn tư vấn về..." style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
            <button class="btn-primary" id="confirm-booking-btn" style="width:100%; padding: 12px;" type="button">Xác nhận đặt lịch</button>
        </div>
    `;
    (document.querySelector('.mobile-frame') || document.body).appendChild(modal);
    
    modal.onclick = function(e) { if(e.target === modal) closeBookingModal(); };
    modal.querySelector('#close-booking-btn')?.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        closeBookingModal();
    });
    modal.querySelector('#confirm-booking-btn')?.addEventListener('click', handleConfirmBooking);
}

if (typeof window !== 'undefined') {
    window.openBookingModal = openBookingModal;
}

function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if(modal) modal.remove();
}

function isWithinBusinessHours(dateTimeString) {
    if (!dateTimeString) return false;
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) return false;
    const hour = date.getHours();
    return hour >= 7 && hour < 17;
}

export async function handleConfirmBooking() {
    const requestedTime = document.getElementById('booking-time')?.value || null;
    const note = document.getElementById('booking-note')?.value || '';
    const selectedLocation = getSupportLocation(document.getElementById('booking-location')?.value);
    
    if (requestedTime && !isWithinBusinessHours(requestedTime)) {
        alert('⏰ Vui lòng chọn thời gian trong giờ hành chính (7h sáng - 5h chiều)');
        return;
    }
    
    closeBookingModal();

    try {
        const booking = await apiRequest('/api/bookings', {
            method: 'POST',
            body: JSON.stringify({
                requested_time: requestedTime,
                note,
                location: selectedLocation,
                before_mood_score: getCurrentMoodScore()
            })
        });
        trackInteraction('booking', booking?.id || requestedTime || Date.now(), {
            requested_time: requestedTime,
            location: selectedLocation,
            before_mood_score: getCurrentMoodScore()
        });
        setStudentBookings([booking, ...getStudentBookings()]);
        addStudentNotification({
            id: `booking-created:${booking?.id || requestedTime || Date.now()}`,
            type: 'booking',
            title: 'Đã gửi yêu cầu đặt lịch',
            message: `Yêu cầu đặt lịch của bạn đã được ghi nhận${requestedTime ? ` vào ${formatBookingDateTime(requestedTime)}` : ''} tại ${selectedLocation}.`,
            booking_id: booking?.id || '',
            status: booking?.status || 'new'
        });
        document.dispatchEvent(new CustomEvent('mindconnect:bookings-updated'));
    } catch (error) {
        const localBooking = {
            id: `local-booking-${Date.now()}`,
            requested_time: requestedTime,
            location: selectedLocation,
            note,
            status: 'offline',
            before_mood_score: getCurrentMoodScore(),
            created_at: new Date().toISOString()
        };
        setStudentBookings([localBooking, ...getStudentBookings()]);
        addStudentNotification({
            id: `booking-created:${localBooking.id}`,
            type: 'booking',
            title: 'Lịch hẹn đang lưu tạm',
            message: `Backend chưa lưu được lịch này. App đang giữ lịch tạm vào ${formatBookingDateTime(requestedTime)} tại ${selectedLocation}.`,
            booking_id: localBooking.id,
            status: 'offline'
        });
        document.dispatchEvent(new CustomEvent('mindconnect:bookings-updated'));

        const localBookingAlert = {
            id: `BK-${Date.now()}`,
            created_at: new Date().toISOString(),
            source: 'Booking',
            severity: 'medium',
            label: 'Yêu cầu tham vấn',
            matched_keyword: 'booking',
            status: 'new',
            student_alias: 'SV ẩn danh',
            class_name: 'CNTT_K48',
            department: 'CNTT',
            location: selectedLocation,
            before_mood_score: getCurrentMoodScore(),
            excerpt: note || 'Sinh viên yêu cầu đặt lịch tham vấn.'
        };
        saveRiskAlerts([localBookingAlert, ...getRiskAlerts()]);
    }

    setTimeout(() => {
        alert("✅ Đã gửi yêu cầu thành công!\nCán bộ tham vấn sẽ liên hệ lại với bạn qua SĐT hoặc Email trong vòng 24h.\nSau buổi hỗ trợ, bạn có thể vào Profile để gửi feedback ẩn danh.");
    }, 300);
}
