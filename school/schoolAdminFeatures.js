(function initSchoolAdminFeatures(global) {
    let context = {};
    let adminFilters = {
        query: '',
        status: 'all',
        severity: 'all',
        topic: 'all',
        lowEngagementOnly: false
    };

    function getDashboardState() {
        return context.getDashboardState?.() || {};
    }

    function escapeHtml(value) {
        if (context.escapeHtml) return context.escapeHtml(value);
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatAlertTime(value) {
        return context.formatAlertTime
            ? context.formatAlertTime(value)
            : new Date(value).toLocaleString('vi-VN');
    }

    function formatNumber(value) {
        return context.formatNumber
            ? context.formatNumber(value)
            : new Intl.NumberFormat('vi-VN').format(Number(value || 0));
    }

    function getStatusLabel(status) {
        return context.getStatusLabel ? context.getStatusLabel(status) : (status || 'Đang chờ');
    }

    function formatFullDateTime(value) {
        return context.formatFullDateTime ? context.formatFullDateTime(value) : String(value || 'Chưa chọn');
    }

    function showNotification(message, type = 'info') {
        if (context.showNotification) {
            context.showNotification(message, type);
        }
    }

    function parseAdminDateTimeInput(value) {
        if (context.parseAdminDateTimeInput) return context.parseAdminDateTimeInput(value);
        const date = new Date(value || '');
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    function formatDateTimeLocalValue(date = new Date()) {
        return context.formatDateTimeLocalValue ? context.formatDateTimeLocalValue(date) : new Date(date).toISOString().slice(0, 16);
    }

    function getLowEngagementStudentSet() {
        return new Set((getDashboardState().low_engagement_students || []).map(item => item.student_id_hash));
    }

    function getSeverityKey(item) {
        const score = Number(item.score || item.urgency_score || 0);
        if (item.severity === 'critical' || score >= 85) return 'high';
        if (item.severity === 'high' || score >= 70) return 'medium';
        return 'low';
    }

    function normalizeSearchText(value) {
        return String(value ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd');
    }

    function matchesAdminQuery(item, query) {
        if (!query) return true;
        const haystack = [
            item.id,
            item.booking_id,
            item.student_id_hash,
            item.label,
            item.excerpt,
            item.note,
            item.location,
            item.status,
            item.status_label,
            item.source,
            item.tag,
            item.recommendation,
            item.intervention,
            item.trend,
            item.requested_time,
            item.created_at,
            item.updated_at,
            item.scheduled_at
        ].join(' ');
        return normalizeSearchText(haystack).includes(normalizeSearchText(query));
    }

    function getFilteredSupportQueue(queue = []) {
        const lowEngagementStudents = getLowEngagementStudentSet();
        return queue.filter(item => {
            if (!matchesAdminQuery({
                ...item,
                status_label: getStatusLabel(item.status),
                requested_time: item.scheduled_at
            }, adminFilters.query)) return false;
            if (adminFilters.status !== 'all' && item.status !== adminFilters.status) return false;
            if (adminFilters.severity !== 'all' && getSeverityKey(item) !== adminFilters.severity) return false;
            if (adminFilters.lowEngagementOnly && !lowEngagementStudents.has(item.student_id_hash)) return false;
            return true;
        });
    }

    function getFilteredTopics(items = []) {
        return items.filter(item => {
            if (adminFilters.topic && adminFilters.topic !== 'all' && String(item.tag || '').toLowerCase() !== adminFilters.topic.toLowerCase()) {
                return false;
            }
            return matchesAdminQuery({
                tag: item.tag,
                label: item.tag,
                excerpt: [item.intervention, item.recommendation].filter(Boolean).join(' '),
                recommendation: item.recommendation,
                intervention: item.intervention,
                trend: item.trend,
                source: 'topic'
            }, adminFilters.query);
        });
    }

    function getFeedbackSeverityKey(item) {
        const sentiment = Number(item.sentiment_score || 50);
        if (sentiment < 45) return 'high';
        if (sentiment < 65) return 'medium';
        return 'low';
    }

    function getFilteredFeedback(feedbacks = []) {
        const lowEngagementStudents = getLowEngagementStudentSet();
        return feedbacks.filter(item => {
            const latestBooking = getStudentBookingItems(item.student_id_hash)[0];
            if (!matchesAdminQuery({
                student_id_hash: item.student_id_hash,
                label: item.source_type,
                excerpt: [item.report_text, item.rating_text, item.note, latestBooking?.note].filter(Boolean).join(' '),
                location: item.location || latestBooking?.location,
                status: item.status || latestBooking?.status,
                source: item.source_type
            }, adminFilters.query)) return false;
            if (adminFilters.status !== 'all' && latestBooking?.status !== adminFilters.status) return false;
            if (adminFilters.severity !== 'all' && getFeedbackSeverityKey(item) !== adminFilters.severity) return false;
            if (adminFilters.lowEngagementOnly && !lowEngagementStudents.has(item.student_id_hash)) return false;
            return true;
        });
    }

    function renderDashboardFilters() {
        const host = document.querySelector('#main-content .dash-header');
        if (!host) return;

        let panel = document.getElementById('admin-filter-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'admin-filter-panel';
            panel.className = 'dash-card admin-filter-panel';
            host.insertAdjacentElement('afterend', panel);
        }

        const topics = Array.isArray(getDashboardState().top_topics) ? getDashboardState().top_topics : [];
        panel.innerHTML = `
            <div class="card-body admin-filter-body">
                <input id="admin-filter-query" class="time-filter admin-filter-control" value="${escapeHtml(adminFilters.query)}" placeholder="Tìm student hash, booking, feedback, chủ đề, địa điểm...">
                <select id="admin-filter-status" class="time-filter admin-filter-control">
                    <option value="all" ${adminFilters.status === 'all' ? 'selected' : ''}>Tất cả trạng thái</option>
                    <option value="new" ${adminFilters.status === 'new' ? 'selected' : ''}>Đang chờ</option>
                    <option value="scheduled" ${adminFilters.status === 'scheduled' ? 'selected' : ''}>Đã xác nhận</option>
                    <option value="rescheduled" ${adminFilters.status === 'rescheduled' ? 'selected' : ''}>Đã hẹn lại</option>
                    <option value="completed" ${adminFilters.status === 'completed' ? 'selected' : ''}>Đã hoàn thành</option>
                    <option value="cancelled" ${adminFilters.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
                </select>
                <select id="admin-filter-severity" class="time-filter admin-filter-control">
                    <option value="all" ${adminFilters.severity === 'all' ? 'selected' : ''}>Tất cả mức độ</option>
                    <option value="high" ${adminFilters.severity === 'high' ? 'selected' : ''}>Ưu tiên cao</option>
                    <option value="medium" ${adminFilters.severity === 'medium' ? 'selected' : ''}>Ưu tiên vừa</option>
                    <option value="low" ${adminFilters.severity === 'low' ? 'selected' : ''}>Theo dõi</option>
                </select>
                <select id="admin-filter-topic" class="time-filter admin-filter-control">
                    <option value="all" ${adminFilters.topic === 'all' ? 'selected' : ''}>Tất cả chủ đề</option>
                    ${topics.map(topic => `<option value="${escapeHtml(topic.tag)}" ${adminFilters.topic === topic.tag ? 'selected' : ''}>#${escapeHtml(topic.tag)}</option>`).join('')}
                </select>
                <label class="admin-filter-check">
                    <input id="admin-filter-low-engagement" type="checkbox" ${adminFilters.lowEngagementOnly ? 'checked' : ''}>
                    Tương tác thấp
                </label>
                <button class="btn btn-outline" type="button" onclick="clearAdminFilters()">Xóa lọc</button>
            </div>
        `;
    }

    function applyAdminFiltersFromControls() {
        adminFilters = {
            query: document.getElementById('admin-filter-query')?.value.trim() || '',
            status: document.getElementById('admin-filter-status')?.value || 'all',
            severity: document.getElementById('admin-filter-severity')?.value || 'all',
            topic: document.getElementById('admin-filter-topic')?.value || 'all',
            lowEngagementOnly: Boolean(document.getElementById('admin-filter-low-engagement')?.checked)
        };
        context.renderDashboardSections?.({ keepFilterPanel: true });
    }

    function clearAdminFilters() {
        adminFilters = {
            query: '',
            status: 'all',
            severity: 'all',
            topic: 'all',
            lowEngagementOnly: false
        };
        context.renderDashboardSections?.();
    }

    function hasActiveFilters() {
        return Boolean(
            adminFilters.query ||
            adminFilters.status !== 'all' ||
            adminFilters.severity !== 'all' ||
            adminFilters.topic !== 'all' ||
            adminFilters.lowEngagementOnly
        );
    }

    function getStudentFeedbackItems(studentHash) {
        const hash = String(studentHash || '');
        return (Array.isArray(getDashboardState().feedback) ? getDashboardState().feedback : [])
            .filter(item => String(item.student_id_hash || 'SV-ANON') === hash)
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    function getStudentBookingItems(studentHash) {
        const hash = String(studentHash || '');
        return (Array.isArray(getDashboardState().bookings) ? getDashboardState().bookings : [])
            .filter(item => String(item.student_id_hash || 'SV-ANON') === hash)
            .sort((a, b) => {
                const bTime = b.updated_at || b.created_at || b.requested_time || 0;
                const aTime = a.updated_at || a.created_at || a.requested_time || 0;
                return new Date(bTime) - new Date(aTime);
            });
    }

    function closeStudentFeedbackDetail() {
        document.getElementById('student-feedback-detail-modal')?.remove();
    }

    function openStudentFeedbackDetail(studentHash) {
        const hash = String(studentHash || 'SV-ANON');
        const feedbacks = getStudentFeedbackItems(hash);
        const bookings = getStudentBookingItems(hash);
        const latestBooking = bookings[0];
        const positiveCount = feedbacks.filter(item => Number(item.sentiment_score || 50) >= 65).length;
        const avgSentiment = feedbacks.length
            ? Math.round(feedbacks.reduce((sum, item) => sum + Number(item.sentiment_score || 0), 0) / feedbacks.length)
            : 0;

        closeStudentFeedbackDetail();

        const feedbackHtml = feedbacks.length
            ? feedbacks.map(item => {
                const positive = Number(item.sentiment_score || 50) >= 65;
                return `
                    <div class="student-detail-item ${positive ? 'positive' : 'improvement'}">
                        <div class="feedback-header">
                            <span class="feedback-time">${formatAlertTime(item.created_at)}</span>
                            <span class="feedback-tag ${positive ? 'positive' : 'improvement'}">${positive ? 'Tích cực' : 'Cần chú ý'}</span>
                            <span class="feedback-time">Sentiment ${escapeHtml(item.sentiment_score || 0)}/100</span>
                        </div>
                        <p class="feedback-text">"${escapeHtml(item.report_text || item.rating_text || 'Không có nội dung')}"</p>
                        ${item.rating_text ? `<p class="student-detail-note">Đánh giá: ${escapeHtml(item.rating_text)}</p>` : ''}
                    </div>
                `;
            }).join('')
            : '<div class="student-detail-item"><p class="student-detail-note">Student này chưa có feedback trong khoảng dữ liệu hiện tại.</p></div>';

        const latestBookingText = latestBooking
            ? `${getStatusLabel(latestBooking.status)} · ${formatFullDateTime(latestBooking.requested_time)} · ${escapeHtml(latestBooking.location || 'Chưa chọn địa điểm')}`
            : 'Chưa có lịch hẹn trong dữ liệu hiện tại.';

        const modal = document.createElement('div');
        modal.id = 'student-feedback-detail-modal';
        modal.className = 'admin-modal-overlay';
        modal.innerHTML = `
            <div class="admin-modal-card" role="dialog" aria-modal="true" aria-label="Chi tiết feedback sinh viên">
                <div class="admin-modal-head">
                    <div>
                        <span class="modal-eyebrow">Chi tiết student</span>
                        <h3>${escapeHtml(hash)}</h3>
                        <p>Chỉ dùng mã ẩn danh; không hiển thị tên thật của sinh viên.</p>
                    </div>
                    <button class="admin-modal-close" type="button" onclick="MindConnectAdminFeatures.closeStudentFeedbackDetail()" aria-label="Đóng">x</button>
                </div>
                <div class="student-detail-grid">
                    <div><span>Tổng feedback</span><strong>${formatNumber(feedbacks.length)}</strong></div>
                    <div><span>Tích cực</span><strong>${feedbacks.length ? Math.round((positiveCount / feedbacks.length) * 100) : 0}%</strong></div>
                    <div><span>Sentiment TB</span><strong>${avgSentiment}/100</strong></div>
                </div>
                <div class="student-detail-section">
                    <span class="modal-eyebrow">Lịch hẹn gần nhất</span>
                    <p>${latestBookingText}</p>
                </div>
                <div class="student-detail-section">
                    <span class="modal-eyebrow">Feedback của student</span>
                    <div class="student-detail-list">${feedbackHtml}</div>
                </div>
            </div>
        `;
        modal.addEventListener('click', event => {
            if (event.target === modal) closeStudentFeedbackDetail();
        });
        document.body.appendChild(modal);
    }

    function getLatestEvent(row = {}) {
        const events = Array.isArray(row.events) ? row.events : [];
        return events.find(event => event.created_at) || events[0] || {};
    }

    function getCurrentBooking(row = {}) {
        return row.current_booking || {};
    }

    function isOpenBooking(booking = {}) {
        return Boolean(booking.id) && !['completed', 'cancelled', 'rescheduled', 'resolved'].includes(booking.status);
    }

    function getLatestFeedbackEvent(row = {}) {
        return (Array.isArray(row.events) ? row.events : [])
            .find(event => event.type === 'feedback') || null;
    }

    function getLatestInternalNote(row = {}) {
        return Array.isArray(row.internal_notes) && row.internal_notes.length
            ? row.internal_notes[0]
            : null;
    }

    function getNextActionLabel(status) {
        switch (status) {
            case 'new':
                return 'Cần xác nhận lịch hoặc thêm ghi chú trước khi xử lý.';
            case 'scheduled':
                return 'Theo dõi buổi hẹn, sau đó đánh dấu hoàn thành hoặc hẹn lại.';
            case 'rescheduled':
                return 'Đã hẹn lại, theo dõi lịch mới trong hàng đợi.';
            case 'completed':
                return 'Ca đã hoàn thành, chờ/đọc feedback nếu sinh viên gửi.';
            case 'cancelled':
                return 'Ca đã hủy, không cần xử lý tiếp.';
            default:
                return 'Theo dõi thêm trước khi can thiệp.';
        }
    }

    function renderLatestNote(row = {}) {
        const note = getLatestInternalNote(row);
        if (note) return `Nội bộ: ${note.note || ''} (${note.author || 'Nhà trường'} · ${formatAlertTime(note.created_at)})`;

        const currentBooking = getCurrentBooking(row);
        const noteText = String(currentBooking.note || '').trim();
        if (noteText) {
            return `Sinh viên: ${noteText}`;
        }
        return 'Chưa có ghi chú nổi bật.';
    }

    function renderLatestFeedback(row = {}) {
        const feedback = getLatestFeedbackEvent(row);
        if (!feedback) {
            const status = getCurrentBooking(row).status || row.latest_status;
            return status === 'completed'
                ? 'Ca đã hoàn thành, đang chờ feedback từ sinh viên.'
                : 'Chưa có feedback sau hỗ trợ.';
        }
        return `${feedback.message || 'Sinh viên đã gửi feedback.'} (${formatAlertTime(feedback.created_at)})`;
    }

    function renderCurrentAppointment(row = {}) {
        const booking = getCurrentBooking(row);
        if (!booking.id) return 'Chưa có lịch hẹn.';
        const time = booking.requested_time ? formatFullDateTime(booking.requested_time) : 'Chưa chọn giờ';
        const location = booking.location || 'Chưa chọn địa điểm';
        return `${time} · ${location}`;
    }

    function renderHistoryActionButtons(row = {}) {
        const booking = getCurrentBooking(row);
        const bookingId = booking.id;
        const status = booking.status || row.latest_status;
        if (!bookingId) return '';

        const safeBookingId = escapeHtml(bookingId);
        const safeLocation = escapeHtml(booking.location || '');
        if (status === 'new') {
            return `
                <button class="btn-action-sm btn-success" onclick="markHistoryBooking('${safeBookingId}', 'scheduled')">Xác nhận</button>
                <button class="btn-action-sm btn-note" onclick="openInternalNote('${safeBookingId}')">Ghi chú</button>
            `;
        }
        if (status === 'scheduled') {
            return `
                <button class="btn-action-sm btn-success" onclick="markHistoryBooking('${safeBookingId}', 'completed')">Hoàn thành</button>
                <button class="btn-action-sm btn-warn" onclick="rescheduleHistoryBooking('${safeBookingId}', '${safeLocation}')">Hẹn lại</button>
                <button class="btn-action-sm btn-note" onclick="openInternalNote('${safeBookingId}')">Ghi chú</button>
            `;
        }
        if (status === 'rescheduled') {
            return `<button class="btn-action-sm btn-note" onclick="openInternalNote('${safeBookingId}')">Ghi chú</button>`;
        }
        return '';
    }

    function renderInterventionHistory() {
        const list = document.getElementById('intervention-history-list');
        if (!list) return;

        const history = Array.isArray(getDashboardState().intervention_history)
            ? getDashboardState().intervention_history
            : [];
        const filteredHistory = history.filter(row => {
            const currentBooking = getCurrentBooking(row);
            if (!isOpenBooking(currentBooking)) return false;
            const eventText = Array.isArray(row.events)
                ? row.events.map(event => [
                    event.message,
                    event.note,
                    event.actor_label,
                    event.location,
                    event.status,
                    event.requested_time
                ].filter(Boolean).join(' ')).join(' ')
                : '';
            const noteText = Array.isArray(row.internal_notes)
                ? row.internal_notes.map(note => [note.note, note.author, note.created_at].filter(Boolean).join(' ')).join(' ')
                : '';
            const bookingText = Array.isArray(row.bookings)
                ? row.bookings.map(booking => [
                    booking.id,
                    booking.status,
                    getStatusLabel(booking.status),
                    booking.location,
                    booking.note,
                    booking.requested_time,
                    booking.created_at,
                    booking.updated_at
                ].filter(Boolean).join(' ')).join(' ')
                : '';
            if (!matchesAdminQuery({
                id: currentBooking.id,
                student_id_hash: row.student_id_hash,
                status: currentBooking.status || row.latest_status,
                status_label: getStatusLabel(currentBooking.status || row.latest_status),
                location: currentBooking.location,
                note: currentBooking.note,
                requested_time: currentBooking.requested_time,
                updated_at: row.latest_at,
                excerpt: [eventText, noteText, bookingText].filter(Boolean).join(' ')
            }, adminFilters.query)) return false;
            const currentStatus = currentBooking.status || row.latest_status;
            if (adminFilters.status !== 'all' && currentStatus !== adminFilters.status) return false;
            if (adminFilters.severity !== 'all' && getSeverityKey(currentBooking) !== adminFilters.severity) return false;
            if (adminFilters.lowEngagementOnly && !getLowEngagementStudentSet().has(row.student_id_hash)) return false;
            return true;
        });

        if (!filteredHistory.length) {
            list.innerHTML = '<div style="padding:16px; text-align:center; color:#888;">Chưa có lịch sử can thiệp phù hợp bộ lọc.</div>';
            return;
        }

        list.innerHTML = `
            <div class="intervention-guide">
                <strong>Cách đọc:</strong>
                <span>Mỗi khối là một sinh viên ẩn danh. Màn hình này chỉ hiển thị thông tin cần ra quyết định: trạng thái, lịch hẹn hiện tại, ghi chú mới nhất, feedback mới nhất và hành động tiếp theo.</span>
            </div>
        ` + filteredHistory.map(row => `
            <div class="intervention-history-item">
                <div class="intervention-history-head">
                    <div>
                        <strong>${escapeHtml(row.student_id_hash)}</strong>
                        <p>Mã ẩn danh của sinh viên. Không hiển thị tên thật để giữ riêng tư.</p>
                    </div>
                    <span class="data-badge">${escapeHtml(getStatusLabel(getCurrentBooking(row).status || row.latest_status))}</span>
                </div>

                <div class="intervention-summary-grid">
                    <div>
                        <span>Tổng ca</span>
                        <strong>${formatNumber(row.total_bookings)}</strong>
                    </div>
                    <div>
                        <span>Đã hoàn thành</span>
                        <strong>${formatNumber(row.completed_bookings)}</strong>
                    </div>
                    <div>
                        <span>Trạng thái hiện tại</span>
                        <strong>${escapeHtml(getStatusLabel(getCurrentBooking(row).status || row.latest_status))}</strong>
                    </div>
                    <div>
                        <span>Cập nhật gần nhất</span>
                        <strong>${formatAlertTime(row.latest_at || getLatestEvent(row).created_at || new Date())}</strong>
                    </div>
                </div>

                <div class="intervention-context-grid">
                    <div>
                        <span>Lịch hẹn hiện tại</span>
                        <p>${escapeHtml(renderCurrentAppointment(row))}</p>
                    </div>
                    <div>
                        <span>Ghi chú mới nhất</span>
                        <p>${escapeHtml(renderLatestNote(row))}</p>
                    </div>
                    <div>
                        <span>Kết quả / feedback gần nhất</span>
                        <p>${escapeHtml(renderLatestFeedback(row))}</p>
                    </div>
                    <div>
                        <span>Hành động tiếp theo</span>
                        <p>${escapeHtml(getNextActionLabel(getCurrentBooking(row).status || row.latest_status))}</p>
                    </div>
                </div>

                <div class="intervention-next-actions">
                    ${renderHistoryActionButtons(row)}
                </div>
            </div>
        `).join('');
    }

    async function openInternalNote(bookingId) {
        const note = prompt('Nhập ghi chú nội bộ cho ca này. Sinh viên sẽ không thấy ghi chú này:');
        if (!note || !note.trim()) return;

        const result = await context.markBooking?.(bookingId, '', {
            internal_note: note.trim(),
            timeline_message: 'Nhà trường thêm ghi chú nội bộ.'
        });

        if (result) {
            showNotification('Đã lưu ghi chú nội bộ.', 'success');
        }
    }

    async function markHistoryBooking(bookingId, status) {
        if (!bookingId || !status) return;
        const label = getStatusLabel(status);
        const confirmed = context.showConfirmDialog
            ? await context.showConfirmDialog({
                title: 'Cập nhật trạng thái ca hỗ trợ?',
                message: `Chuyển ca này sang trạng thái "${label}".`,
                detail: 'Thao tác sẽ được ghi nhận vào dữ liệu quản trị.',
                confirmLabel: 'Xác nhận',
                cancelLabel: 'Hủy'
            })
            : false;
        if (!confirmed) return;

        const result = await context.markBooking?.(bookingId, status, {
            timeline_message: `Nhà trường cập nhật trạng thái: ${label}.`
        });

        if (result) {
            showNotification(`Đã cập nhật ca sang "${label}".`, 'success');
        }
    }

    async function rescheduleHistoryBooking(bookingId, currentLocation = '') {
        if (!bookingId) return;

        const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        defaultDate.setHours(9, 0, 0, 0);
        const newDate = prompt('Nhập ngày giờ hẹn lại (YYYY-MM-DDTHH:mm hoặc DD/MM/YYYY HH:mm):', formatDateTimeLocalValue(defaultDate));
        if (!newDate) return;

        const requestedTime = parseAdminDateTimeInput(newDate);
        if (!requestedTime) {
            alert('Ngày giờ hẹn lại chưa hợp lệ.');
            return;
        }

        const newLocation = prompt('Chọn/nhập địa điểm hẹn lại:', currentLocation || 'Phòng tham vấn 102 - Khu B');
        if (!newLocation) return;

        const result = await context.markBooking?.(bookingId, 'rescheduled', {
            requested_time: requestedTime,
            location: newLocation,
            note: `Hẹn lại từ admin vào ${formatFullDateTime(requestedTime)} tại ${newLocation}`,
            timeline_message: 'Nhà trường hẹn lại ca hỗ trợ.'
        });

        if (result) {
            showNotification('Đã tạo lịch hẹn mới và đưa xuống cuối hàng đợi.', 'success');
        }
    }

    function escapeCsvCell(value) {
        const text = String(value ?? '').replace(/\r?\n/g, ' ');
        return /[",;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    function rowsToCsv(rows) {
        return rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
    }

    function exportDashboardCsv() {
        const dashboardState = getDashboardState();
        if (!dashboardState) {
            showNotification('Chưa có dữ liệu dashboard để xuất CSV.', 'warning');
            return;
        }

        const sections = [];
        const metrics = dashboardState.metrics || {};
        sections.push(rowsToCsv([
            ['Section', 'Metric', 'Value'],
            ['Metrics', 'Sentiment', metrics.sentiment ?? ''],
            ['Metrics', 'High risk rate', metrics.high_risk_rate ?? 0],
            ['Metrics', 'Engagement', metrics.engagement ?? 0],
            ['Metrics', 'Stress reduction', metrics.stress_reduction ?? 0],
            ['Metrics', 'Intervention success rate', metrics.intervention_success_rate ?? 0],
            ['Metrics', 'Positive feedback rate', metrics.positive_feedback_rate ?? 0]
        ]));

        sections.push(rowsToCsv([
            [],
            ['Bookings'],
            ['Student hash', 'Status', 'Requested time', 'Location', 'Urgency', 'Note'],
            ...(dashboardState.bookings || []).map(booking => [
                booking.student_id_hash,
                getStatusLabel(booking.status),
                formatFullDateTime(booking.requested_time),
                booking.location,
                booking.urgency_score,
                booking.note
            ])
        ]));

        sections.push(rowsToCsv([
            [],
            ['Top topics'],
            ['Tag', 'Count', 'Share', 'Recommendation'],
            ...(dashboardState.top_topics || []).map(topic => [
                topic.tag,
                topic.count,
                `${topic.share}%`,
                topic.intervention
            ])
        ]));

        sections.push(rowsToCsv([
            [],
            ['Feedback'],
            ['Student hash', 'Sentiment', 'Created at', 'Content'],
            ...(dashboardState.feedback || []).map(item => [
                item.student_id_hash,
                item.sentiment_score,
                formatFullDateTime(item.created_at),
                item.report_text || item.rating_text
            ])
        ]));

        const csv = `\uFEFF${sections.join('\n')}`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mindconnect-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function buildPrintableReportHtml() {
        const dashboardState = getDashboardState();
        const metrics = dashboardState?.metrics || {};
        const topics = dashboardState?.top_topics || [];
        const bookings = dashboardState?.bookings || [];
        const feedback = dashboardState?.feedback || [];

        return `
            <!doctype html>
            <html lang="vi">
            <head>
                <meta charset="utf-8">
                <title>Báo cáo MindConnect</title>
                <style>
                    body { font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif; color:#222; padding:28px; }
                    h1 { color:#9f2454; margin-bottom:4px; }
                    h2 { margin-top:28px; color:#9f2454; }
                    table { width:100%; border-collapse:collapse; margin-top:10px; font-size:12px; }
                    th, td { border:1px solid #ddd; padding:8px; text-align:left; vertical-align:top; }
                    th { background:#f7e8ee; }
                    .metrics { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-top:16px; }
                    .metric { border:1px solid #eee; padding:12px; border-radius:8px; }
                    .metric strong { display:block; font-size:20px; color:#d42e70; }
                </style>
            </head>
            <body>
                <h1>Báo cáo MindConnect</h1>
                <p>Ngày xuất: ${new Date().toLocaleString('vi-VN')}</p>
                <div class="metrics">
                    <div class="metric"><span>Chỉ số cảm xúc</span><strong>${escapeHtml(metrics.sentiment ?? 'N/A')}</strong></div>
                    <div class="metric"><span>Tương tác</span><strong>${formatNumber(metrics.engagement)}</strong></div>
                    <div class="metric"><span>Giảm stress</span><strong>${metrics.stress_reduction || 0}%</strong></div>
                    <div class="metric"><span>Yêu cầu hỗ trợ</span><strong>${formatNumber((dashboardState?.intervention || {}).pending_bookings || 0)}</strong></div>
                    <div class="metric"><span>Hoàn thành can thiệp</span><strong>${metrics.intervention_success_rate || 0}%</strong></div>
                    <div class="metric"><span>Feedback tích cực</span><strong>${metrics.positive_feedback_rate || 0}%</strong></div>
                </div>
                <h2>Top chủ đề</h2>
                <table><thead><tr><th>Tag</th><th>Tín hiệu</th><th>Tỷ lệ</th><th>Đề xuất</th></tr></thead><tbody>
                    ${topics.map(topic => `<tr><td>#${escapeHtml(topic.tag)}</td><td>${formatNumber(topic.count)}</td><td>${topic.share || 0}%</td><td>${escapeHtml(topic.intervention || '')}</td></tr>`).join('')}
                </tbody></table>
                <h2>Lịch hẹn</h2>
                <table><thead><tr><th>Student hash</th><th>Trạng thái</th><th>Thời gian</th><th>Địa điểm</th><th>Ghi chú</th></tr></thead><tbody>
                    ${bookings.map(booking => `<tr><td>${escapeHtml(booking.student_id_hash)}</td><td>${escapeHtml(getStatusLabel(booking.status))}</td><td>${formatFullDateTime(booking.requested_time)}</td><td>${escapeHtml(booking.location)}</td><td>${escapeHtml(booking.note)}</td></tr>`).join('')}
                </tbody></table>
                <h2>Feedback gần đây</h2>
                <table><thead><tr><th>Student hash</th><th>Sentiment</th><th>Thời gian</th><th>Nội dung</th></tr></thead><tbody>
                    ${feedback.map(item => `<tr><td>${escapeHtml(item.student_id_hash)}</td><td>${escapeHtml(item.sentiment_score)}</td><td>${formatFullDateTime(item.created_at)}</td><td>${escapeHtml(item.report_text || item.rating_text)}</td></tr>`).join('')}
                </tbody></table>
            </body>
            </html>
        `;
    }

    function exportDashboardPdf() {
        const dashboardState = getDashboardState();
        if (!dashboardState) {
            showNotification('Chưa có dữ liệu dashboard để xuất PDF.', 'warning');
            return;
        }

        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            showNotification('Trình duyệt đang chặn popup. Hãy cho phép popup để in PDF.', 'warning');
            return;
        }

        reportWindow.document.open();
        reportWindow.document.write(buildPrintableReportHtml());
        reportWindow.document.close();
        reportWindow.focus();
        setTimeout(() => reportWindow.print(), 300);
    }

    function handleFilterInput(event) {
        if (event.target?.id === 'admin-filter-query') {
            applyAdminFiltersFromControls();
        }
    }

    function handleFilterChange(event) {
        if (
            event.target?.classList?.contains('admin-filter-control') ||
            event.target?.id === 'admin-filter-low-engagement'
        ) {
            applyAdminFiltersFromControls();
        }
    }

    function init(nextContext = {}) {
        context = nextContext;
    }

    const api = {
        init,
        renderDashboardFilters,
        renderInterventionHistory,
        getFilteredSupportQueue,
        getFilteredTopics,
        getFilteredFeedback,
        hasActiveFilters,
        clearAdminFilters,
        openStudentFeedbackDetail,
        closeStudentFeedbackDetail,
        openInternalNote,
        markHistoryBooking,
        rescheduleHistoryBooking,
        exportDashboardCsv,
        exportDashboardPdf,
        handleFilterInput,
        handleFilterChange
    };

    global.MindConnectAdminFeatures = api;
    global.clearAdminFilters = clearAdminFilters;
    global.openStudentFeedbackDetail = openStudentFeedbackDetail;
    global.closeStudentFeedbackDetail = closeStudentFeedbackDetail;
    global.openInternalNote = openInternalNote;
    global.markHistoryBooking = markHistoryBooking;
    global.rescheduleHistoryBooking = rescheduleHistoryBooking;
    global.exportDashboardCsv = exportDashboardCsv;
    global.exportDashboardPdf = exportDashboardPdf;
})(window);
