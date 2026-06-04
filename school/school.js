// school.js - School Admin Dashboard Logic

// ============================================
// 1. CONSTANTS & CONFIGURATION
// ============================================
const API_BASE_URL = 'http://localhost:3000';
const DEFAULT_CONSULTATION_ROWS_ID = 'consultation-case-body';
let dashboardState = null;
let currentView = 'dashboard';

// ============================================
// 2. AUTHENTICATION HELPERS
// ============================================
function getAuthSession() {
    try {
        return JSON.parse(localStorage.getItem('mindconnect:auth')) || null;
    } catch (error) {
        return null;
    }
}

function getAuthHeaders() {
    const session = getAuthSession();
    const headers = session?.token ? { Authorization: `Bearer ${session.token}` } : {};

    if (session?.token === 'mock-token') {
        headers['X-Demo-Role'] = localStorage.getItem('mindconnect:role') || session?.user?.role || 'school';
        headers['X-Demo-Email'] = session?.user?.email || 'school-demo@mindconnect.local';
    }

    return headers;
}

function logout() {
    localStorage.removeItem('mindconnect:auth');
    localStorage.removeItem('mindconnect:role');
    window.location.href = 'index.html';
}

// ============================================
// 3. API REQUEST HELPER
// ============================================
async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...(options.headers || {})
        }
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
        throw new Error(result.error || 'API request failed');
    }

    return result.data;
}

// ============================================
// 4. UTILITY FUNCTIONS
// ============================================
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatAlertTime(value) {
    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerText = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function showConfirmDialog({
    title = 'Xác nhận thao tác',
    message = '',
    detail = '',
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Hủy',
    tone = 'primary'
} = {}) {
    document.getElementById('admin-confirm-dialog')?.remove();

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.id = 'admin-confirm-dialog';
        overlay.className = 'admin-confirm-overlay';
        overlay.innerHTML = `
            <div class="admin-confirm-card admin-confirm-${escapeHtml(tone)}" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
                <div class="admin-confirm-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                        <path d="M12 8v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                        <path d="M12 16.5h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <path d="M10.3 4.1 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.1a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="admin-confirm-body">
                    <span class="modal-eyebrow">Xác nhận</span>
                    <h3 id="admin-confirm-title">${escapeHtml(title)}</h3>
                    ${message ? `<p>${escapeHtml(message)}</p>` : ''}
                    ${detail ? `<small>${escapeHtml(detail)}</small>` : ''}
                    <div class="admin-confirm-actions">
                        <button class="btn btn-secondary" type="button" data-confirm-action="cancel">${escapeHtml(cancelLabel)}</button>
                        <button class="btn btn-primary" type="button" data-confirm-action="confirm">${escapeHtml(confirmLabel)}</button>
                    </div>
                </div>
            </div>
        `;

        const close = value => {
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(value);
        };

        const onKeyDown = event => {
            if (event.key === 'Escape') close(false);
        };

        overlay.addEventListener('click', event => {
            if (event.target === overlay) close(false);
            const action = event.target.closest('[data-confirm-action]')?.dataset.confirmAction;
            if (action === 'confirm') close(true);
            if (action === 'cancel') close(false);
        });

        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(overlay);
        overlay.querySelector('[data-confirm-action="confirm"]')?.focus();
    });
}

function getEmptyDashboardState(errorMessage = '') {
    return {
        metrics: {
            sentiment: 0,
            high_risk_rate: 0,
            high_risk_students: 0,
            total_students_observed: 0,
            engagement: 0,
            engagement_breakdown: {
                posts: 0,
                reactions: 0,
                comments: 0,
                chats: 0,
                bookings: 0,
                feedbacks: 0,
                resources: 0,
                total: 0
            },
            stress_reduction: 0,
            intervention_success_rate: 0,
            positive_feedback_rate: 0
        },
        alerts: [],
        bookings: [],
        intervention_history: [],
        low_engagement_students: [],
        risk_queue: [],
        feedback: [],
        feedback_summary: { total: 0, positive: 0, negative: 0, avg_sentiment: 0 },
        intervention: { avg_before_mood: null, avg_after_mood: null, stress_reduction: 0, completed_bookings: 0, pending_bookings: 0 },
        top_topics: [],
        ai_report: [],
        error: errorMessage
    };
}

function renderDashboardError(message = '') {
    let banner = document.getElementById('dashboard-data-error');
    if (!message) {
        if (banner) banner.remove();
        return;
    }

    const host = document.querySelector('#main-content .dash-header');
    if (!host) return;

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'dashboard-data-error';
        banner.className = 'alert-banner';
        banner.style.marginBottom = '16px';
        host.insertAdjacentElement('afterend', banner);
    }

    banner.innerHTML = `
        <div class="alert-icon">!</div>
        <div class="alert-body">
            <strong>Chưa tải được dữ liệu live</strong>
            <p>${escapeHtml(message)}. Hãy đăng nhập tài khoản nhà trường/quản lý và kiểm tra backend đang chạy.</p>
        </div>
    `;
}

function formatNumber(value) {
    return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

function formatPercent(value) {
    return `${Number(value || 0)}%`;
}

function formatFullDateTime(value) {
    if (!value) return 'Chưa chọn';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Chưa chọn';
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTimeLocalValue(date = new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseAdminDateTimeInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
        return raw;
    }

    const vietnameseDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (vietnameseDate) {
        const [, day, month, year, hour = '09', minute = '00'] = vietnameseDate;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return formatDateTimeLocalValue(parsed);
    return '';
}

function compareSupportQueueItems(a, b) {
    const aRescheduled = a?.rescheduled_from ? 1 : 0;
    const bRescheduled = b?.rescheduled_from ? 1 : 0;
    if (aRescheduled !== bRescheduled) return aRescheduled - bRescheduled;

    if (aRescheduled && bRescheduled) {
        return new Date(a.created_at || a.scheduled_at || 0) - new Date(b.created_at || b.scheduled_at || 0);
    }

    return Number(b.score || 0) - Number(a.score || 0);
}

function getStatusLabel(status) {
    const labels = {
        new: 'Đang chờ',
        contacted: 'Đã liên hệ',
        scheduled: 'Đã xác nhận',
        rescheduled: 'Đã hẹn lại',
        completed: 'Đã hoàn thành',
        resolved: 'Đã xử lý',
        cancelled: 'Đã hủy'
    };
    return labels[status] || status || 'Đang chờ';
}

function getScoreBadgeClass(score, severity) {
    if (severity === 'critical' || Number(score || 0) >= 85) return 'bg-high';
    if (severity === 'high' || Number(score || 0) >= 70) return 'bg-med';
    return 'bg-low';
}

function getSupportQueue() {
    const dashboardQueue = Array.isArray(dashboardState?.risk_queue) ? dashboardState.risk_queue : [];
    const bookingQueue = dashboardQueue.filter(item => item.type === 'booking');
    if (bookingQueue.length) return bookingQueue;

    const bookings = Array.isArray(dashboardState?.bookings) ? dashboardState.bookings : [];
    return bookings.map(booking => ({
        id: booking.id || booking._id,
        type: 'booking',
        source: 'Booking',
        student_id_hash: booking.student_id_hash || booking.student_alias || 'SV-ANON',
        location: booking.location || 'Phòng tham vấn 102 - Khu B',
        scheduled_at: booking.requested_time || booking.created_at,
        created_at: booking.created_at,
        rescheduled_from: booking.rescheduled_from || '',
        rescheduled_at: booking.rescheduled_at || null,
        status: booking.status,
        severity: Number(booking.urgency_score || 0) >= 80 ? 'high' : 'medium',
        label: 'Yêu cầu đặt lịch hỗ trợ',
        excerpt: booking.note,
        score: Number(booking.urgency_score || (booking.before_mood_score ? (6 - Number(booking.before_mood_score)) * 18 : 55))
    }));
}

// ============================================
// 5. CONSULTATION CASES
// ============================================
function getDefaultConsultationRows() {
    const element = document.getElementById(DEFAULT_CONSULTATION_ROWS_ID);
    return element ? element.innerHTML : '';
}

// ============================================
// 7. DASHBOARD DATA FETCHING
// ============================================
async function fetchDashboardData() {
    const timeRange = document.getElementById('timeSelect')?.value || '7';
    dashboardState = await apiRequest(`/api/dashboard?range=${encodeURIComponent(timeRange)}`);
    return dashboardState;
}

// ============================================
// 8. METRICS & TOPICS RENDERING
// ============================================

// ============================================
// 11. DASHBOARD UPDATE (MAIN TRIGGER)
// ============================================
function updateDashboardData() {
    const metricsGrid = document.querySelector('.kpi-grid');
    if (!metricsGrid) return;

    // Loading effect
    metricsGrid.style.opacity = '0.5';
    setTimeout(async () => {
        metricsGrid.style.opacity = '1';
        try {
            await fetchDashboardData();
            renderDashboardError('');
        } catch (error) {
            dashboardState = getEmptyDashboardState(error.message);
            renderDashboardError(error.message);
        }
        renderDashboardSections();
    }, 300);
}

// ============================================
// 12. CONSULTATION HANDLER
// ============================================
async function handleConsultation(status, rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const alertId = row.dataset.alertId;
    const bookingId = row.dataset.bookingId;

    if (status === 'success') {
        const confirmSurvey = await showConfirmDialog({
            title: 'Xác nhận hoàn thành ca tư vấn?',
            message: 'Ca này sẽ được chuyển sang trạng thái đã hoàn thành.',
            detail: 'Hệ thống sẽ tự động ghi nhận khảo sát đánh giá cho sinh viên.',
            confirmLabel: 'Xác nhận',
            cancelLabel: 'Hủy'
        });
        if (confirmSurvey) {
            row.style.backgroundColor = "#e8f5e9";
            if (bookingId) {
                await markBooking(bookingId, 'completed');
                row.remove();
            } else {
                row.querySelector('td:last-child').innerHTML = `<span style="color:green; font-size:12px;">⏳ Đã gửi Survey (Hạn 3 ngày)</span>`;
            }

            setTimeout(() => {
                showNotification('Đã xác nhận hoàn thành và lên lịch nhắc phản hồi tự động.', 'success');
            }, 500);
        }
    } else {
        if (!bookingId) {
            row.style.backgroundColor = "#fff3e0";
            row.querySelector('td:last-child').innerHTML = `<span style="color:#ef6c00; font-size:12px;">📅 Đã ghi nhận cần hẹn lại</span>`;
            return;
        }

        const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        defaultDate.setHours(9, 0, 0, 0);
        const newDate = prompt("Tư vấn chưa hoàn tất. Nhập ngày giờ hẹn lại (YYYY-MM-DDTHH:mm hoặc DD/MM/YYYY HH:mm):", formatDateTimeLocalValue(defaultDate));
        if (!newDate) return;

        const requestedTime = parseAdminDateTimeInput(newDate);
        if (!requestedTime) {
            alert('Ngày giờ hẹn lại chưa hợp lệ.');
            return;
        }

        const currentLocation = row.querySelector('[data-location-value]')?.dataset.locationValue || 'Phòng tham vấn 102 - Khu B';
        const newLocation = prompt("Chọn/nhập địa điểm hẹn lại:", currentLocation);
        if (!newLocation) return;

        row.style.backgroundColor = "#fff3e0";
        row.querySelector('td:last-child').innerHTML = `<span style="color:#ef6c00; font-size:12px;">📅 Đang tạo lịch hẹn mới...</span>`;

        const result = await markBooking(bookingId, 'rescheduled', {
            requested_time: requestedTime,
            location: newLocation,
            note: `Hẹn lại từ admin vào ${formatFullDateTime(requestedTime)} tại ${newLocation}`
        });

        if (result) {
            row.remove();
            showNotification('Đã tạo lịch hẹn mới và đưa xuống cuối hàng đợi.', 'success');
        }
    }
}

// ============================================
// 13. NAVIGATION (SIDEBAR)
// ============================================
function renderDashboardView() {
    // Main dashboard view is already in HTML, just update data
    updateDashboardData();
}

function renderAlertsView() {
    renderInterventionsView();
}

// ============================================
// 14. LIVE DASHBOARD OVERRIDES
// ============================================
function renderMetricSubtext(valueEl, text) {
    const sub = valueEl?.closest('.kpi-card')?.querySelector('.kpi-sub');
    if (sub) sub.innerText = text;
}

function renderMetrics() {
    const metrics = dashboardState?.metrics;
    if (!metrics) return;

    const sentimentEl = document.getElementById('metric-sentiment');
    const supportRequestsEl = document.getElementById('metric-support-requests');
    const engagementEl = document.getElementById('metric-engagement');
    const interventionEl = document.getElementById('metric-intervention');
    const pendingBookings = Array.isArray(dashboardState?.bookings)
        ? dashboardState.bookings.filter(booking => !['completed', 'resolved', 'cancelled', 'rescheduled'].includes(booking.status)).length
        : Number(dashboardState?.intervention?.pending_bookings || 0);

    if (sentimentEl) {
        const sentimentValue = Number(metrics.sentiment);
        sentimentEl.innerText = Number.isFinite(sentimentValue) && sentimentValue > 0
            ? `${sentimentValue}/10`
            : 'Chưa có dữ liệu';
        renderMetricSubtext(sentimentEl, 'Từ diary, report và feedback');
    }
    if (supportRequestsEl) {
        supportRequestsEl.innerText = formatNumber(pendingBookings);
        renderMetricSubtext(supportRequestsEl, 'Booking hỗ trợ đang chờ xử lý');
    }
    if (engagementEl) {
        engagementEl.innerText = formatNumber(metrics.engagement);
        renderMetricSubtext(engagementEl, 'Post, reaction, comment, booking, feedback');
    }
    if (interventionEl) {
        interventionEl.innerText = `${Number(metrics.stress_reduction || 0) > 0 ? '+' : ''}${metrics.stress_reduction || 0}%`;
        renderMetricSubtext(interventionEl, 'So sánh mood trước và sau hỗ trợ');
    }
}

function renderTopTopics() {
    const topics = MindConnectAdminFeatures.getFilteredTopics(Array.isArray(dashboardState?.top_topics) ? dashboardState.top_topics : []);
    const listEl = document.getElementById('top-topic-list');
    if (!listEl) return;
    const chart = listEl.closest('.card-body')?.querySelector('.topic-chart');
    if (!topics.length) {
        const emptyText = MindConnectAdminFeatures.hasActiveFilters?.()
            ? 'Không có chủ đề phù hợp với bộ lọc hiện tại.'
            : 'Chưa có chủ đề nổi bật từ diary, feedback hoặc bài đăng thật.';
        listEl.innerHTML = `<li><span class="topic-name">${emptyText}</span></li>`;
        if (chart) chart.innerHTML = '';
        return;
    }

    listEl.innerHTML = topics.map((topic, index) => `
        <li>
            <span class="topic-num">${index + 1}</span>
            <span class="topic-name">${escapeHtml(topic.tag)}</span>
            <span class="topic-pct">${Number(topic.share || 0)}%</span>
            <span class="topic-trend ${Number(topic.share || 0) >= 30 ? 'trend-bad' : 'neutral'}">${Number(topic.share || 0) >= 30 ? '▲' : '▬'}</span>
        </li>
    `).join('');

    if (chart) {
        const maxCount = Math.max(...topics.map(topic => Number(topic.count || 0)), 1);
        chart.innerHTML = topics.map((topic, index) => {
            const colors = ['var(--danger)', 'var(--warning)', 'var(--accent-pink)', 'var(--deep-rose)', '#888'];
            const width = Math.round((Number(topic.count || 0) / maxCount) * 100);
            return `<div class="chart-bar" title="${escapeHtml(topic.tag)}: ${formatNumber(topic.count)} tín hiệu"><div class="bar-fill" style="width:${Math.max(width, 4)}%;background:${colors[index] || '#888'};"></div></div>`;
        }).join('');
    }
}

function renderEngagementBreakdown() {
    const breakdown = dashboardState?.metrics?.engagement_breakdown || {};
    const grid = document.querySelector('.dashboard-grid');
    if (!grid) return;

    let card = document.getElementById('engagement-breakdown-card');
    if (!card) {
        card = grid.querySelector('.dash-card');
        if (!card) return;
        card.id = 'engagement-breakdown-card';
    }

    const rows = [
        ['Bài đăng', breakdown.posts],
        ['Reaction / like', breakdown.reactions],
        ['Bình luận', breakdown.comments],
        ['Chat AI', breakdown.chats],
        ['Đặt lịch', breakdown.bookings],
        ['Feedback', breakdown.feedbacks],
        ['Xem tài nguyên', breakdown.resources]
    ];

    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title"><span class="card-icon">▦</span> Gắn kết App</h3>
            <span class="data-badge">Live</span>
        </div>
        <div class="card-body">
            <div class="engagement-grid">
                ${rows.map(([label, value]) => `
                    <div class="engagement-cell">
                        <span>${escapeHtml(label)}</span>
                        <strong>${formatNumber(value)}</strong>
                    </div>
                `).join('')}
            </div>
            <p class="chart-note">Tổng hợp mọi tương tác: news feed, reaction, like, comment, đặt lịch, feedback và tài nguyên.</p>
        </div>
    `;
}

function renderAIReport() {
    const report = MindConnectAdminFeatures.getFilteredTopics(Array.isArray(dashboardState?.ai_report) ? dashboardState.ai_report : []);
    const tableBody = document.getElementById('ai-report-body') || document.querySelector('.analysis-table tbody');
    if (!tableBody) return;
    if (!report.length) {
        const emptyText = MindConnectAdminFeatures.hasActiveFilters?.()
            ? 'Không có AI Report phù hợp với bộ lọc hiện tại.'
            : 'Chưa có đủ diary/feedback để tạo AI Report.';
        tableBody.innerHTML = `<tr><td colspan="5" style="padding:16px; text-align:center; color:#888;">${emptyText}</td></tr>`;
        return;
    }

    const maxCount = Math.max(...report.map(item => Number(item.count || 0)), 1);
    tableBody.innerHTML = report.map(item => {
        const pct = Number(item.share || 0);
        return `
            <tr>
                <td><span class="tag-chip-static">#${escapeHtml(item.tag)}</span></td>
                <td><strong>${formatNumber(item.count)}</strong></td>
                <td><div class="mini-bar"><div class="mini-fill" style="width:${Math.max((Number(item.count || 0) / maxCount) * 100, 4)}%"></div></div>${pct}%</td>
                <td><span class="trend-badge ${item.trend === 'Tăng' ? 'trend-bad' : 'neutral'}">${escapeHtml(item.trend || 'Ổn định')}</span></td>
                <td>${escapeHtml(item.recommendation || 'Theo dõi thêm trước khi can thiệp.')}</td>
            </tr>
        `;
    }).join('');
}

function renderConsultationCases(alerts) {
    const table = document.getElementById('consultation-case-table');
    const body = document.getElementById('consultation-case-body');
    if (!body) return;

    const head = table?.querySelector('thead');
    if (head) {
        head.innerHTML = '<tr><th>Student hash</th><th>Địa điểm</th><th>Ngày giờ</th><th>Điểm / trạng thái</th><th>Hành động</th></tr>';
    }

    const queue = MindConnectAdminFeatures.getFilteredSupportQueue(getSupportQueue())
        .filter(item => !['resolved', 'completed', 'cancelled', 'rescheduled'].includes(item.status))
        .sort(compareSupportQueueItems);

    if (!queue.length) {
        const emptyText = MindConnectAdminFeatures.hasActiveFilters?.()
            ? 'Không có ca tư vấn phù hợp với bộ lọc hiện tại.'
            : 'Chưa có ca tư vấn hoặc yêu cầu hỗ trợ đang chờ.';
        body.innerHTML = `<tr><td colspan="5" style="padding:16px; text-align:center; color:#888;">${emptyText}</td></tr>`;
        return;
    }

    body.innerHTML = queue.map(item => {
        const rowId = `queue-${item.type}-${item.id}`;
        const dataAttr = item.type === 'booking'
            ? `data-booking-id="${escapeHtml(item.id)}"`
            : `data-alert-id="${escapeHtml(item.id)}"`;
        const score = Number(item.score || 0);
        return `
            <tr id="${rowId}" ${dataAttr}>
                <td><strong>${escapeHtml(item.student_id_hash || 'SV-ANON')}</strong><br><span style="color:#888; font-size:11px;">${escapeHtml(item.type === 'booking' ? 'Booking' : 'Hỗ trợ')}</span></td>
                <td data-location-value="${escapeHtml(item.location || 'Phòng tham vấn 102 - Khu B')}">${escapeHtml(item.location || 'Phòng tham vấn 102 - Khu B')}</td>
                <td>${formatFullDateTime(item.scheduled_at)}</td>
                <td><span class="badge ${getScoreBadgeClass(score, item.severity)}">${score}/100</span><br><span style="font-size:11px;color:#777;">${escapeHtml(getStatusLabel(item.status))}${item.rescheduled_from ? ' • Hẹn lại' : ''}</span></td>
                <td style="text-align:right;">
                    <button class="btn-action-sm btn-success" onclick="handleConsultation('success', '${rowId}')">✔ Xong</button>
                    <button class="btn-action-sm btn-warn" onclick="handleConsultation('fail', '${rowId}')">📅 Hẹn lại</button>
                    ${item.type === 'booking' ? `<button class="btn-action-sm btn-note" onclick="openInternalNote('${escapeHtml(item.id)}')">Ghi chú</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function renderInterventionSummary() {
    const metrics = dashboardState?.metrics || {};
    const intervention = dashboardState?.intervention || {};
    const successEl = document.getElementById('intervention-success-rate');
    const moodEl = document.getElementById('intervention-mood-change');
    const feedbackEl = document.getElementById('intervention-positive-feedback');
    const noteEl = document.getElementById('intervention-note');

    if (successEl) successEl.innerText = formatPercent(metrics.intervention_success_rate);
    if (moodEl) {
        const before = intervention.avg_before_mood ?? '-';
        const after = intervention.avg_after_mood ?? '-';
        moodEl.innerText = `${before} → ${after}`;
    }
    if (feedbackEl) feedbackEl.innerText = formatPercent(metrics.positive_feedback_rate);
    if (noteEl) {
        noteEl.innerText = `${intervention.completed_bookings || 0} ca hoàn tất, ${intervention.pending_bookings || 0} ca đang chờ. Stress reduction: ${metrics.stress_reduction || 0}%.`;
    }
}

function renderFeedbackSummary() {
    const summary = dashboardState?.feedback_summary || {};
    const allFeedbacks = Array.isArray(dashboardState?.feedback) ? dashboardState.feedback : [];
    const feedbacks = MindConnectAdminFeatures.getFilteredFeedback
        ? MindConnectAdminFeatures.getFilteredFeedback(allFeedbacks)
        : allFeedbacks;
    const totalEl = document.getElementById('feedback-total');
    const positiveEl = document.getElementById('feedback-positive-rate');
    const sentimentEl = document.getElementById('feedback-sentiment');
    const listEl = document.getElementById('feedback-live-list');
    const positiveCount = feedbacks.filter(item => Number(item.sentiment_score || 50) >= 65).length;
    const avgSentiment = feedbacks.length
        ? Math.round(feedbacks.reduce((sum, item) => sum + Number(item.sentiment_score || 0), 0) / feedbacks.length)
        : Number(summary.avg_sentiment || 0);

    if (totalEl) totalEl.innerText = formatNumber(feedbacks.length);
    if (positiveEl) positiveEl.innerText = formatPercent(feedbacks.length ? Math.round((positiveCount / feedbacks.length) * 100) : 0);
    if (sentimentEl) sentimentEl.innerText = `${avgSentiment}/100`;

    if (!listEl) return;
    if (!feedbacks.length) {
        const emptyText = allFeedbacks.length
            ? 'Không có feedback phù hợp với bộ lọc hiện tại.'
            : 'Chưa có feedback mới từ sinh viên.';
        listEl.innerHTML = `<div class="feedback-item improvement"><p class="feedback-text">${emptyText}</p></div>`;
        return;
    }

    listEl.innerHTML = feedbacks.map(item => {
        const positive = Number(item.sentiment_score || 50) >= 65;
        const studentHash = item.student_id_hash || 'SV-ANON';
        return `
            <div class="feedback-item ${positive ? 'positive' : 'improvement'}" role="button" tabindex="0" data-student-hash="${escapeHtml(studentHash)}" onclick="MindConnectAdminFeatures.openStudentFeedbackDetail(this.dataset.studentHash)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();MindConnectAdminFeatures.openStudentFeedbackDetail(this.dataset.studentHash);}">
                <div class="feedback-header">
                    <span class="feedback-author">${escapeHtml(studentHash)}</span>
                    <span class="feedback-time">${formatAlertTime(item.created_at)}</span>
                    <span class="feedback-tag ${positive ? 'positive' : 'improvement'}">${positive ? 'Tích cực' : 'Cần chú ý'}</span>
                </div>
                <p class="feedback-text">"${escapeHtml(item.report_text || item.rating_text || 'Không có nội dung')}"</p>
                ${item.rating_text ? `<p style="font-size:12px;color:#777;">Đánh giá: ${escapeHtml(item.rating_text)}</p>` : ''}
            </div>
        `;
    }).join('');
}

function renderDashboardSections(options = {}) {
    if (!options.keepFilterPanel) MindConnectAdminFeatures.renderDashboardFilters();
    renderMetrics();
    renderEngagementBreakdown();
    renderTopTopics();
    renderAIReport();
    renderConsultationCases([]);
    renderInterventionSummary();
    renderFeedbackSummary();
    MindConnectAdminFeatures.renderInterventionHistory();
}

async function markBooking(bookingId, status, extra = {}) {
    try {
        const result = await apiRequest(`/api/bookings/${bookingId}`, {
            method: 'PATCH',
            body: JSON.stringify({ ...(status ? { status } : {}), ...extra })
        });
        return result;
    } catch (error) {
        // Backend may be unavailable during offline demo.
        showNotification(`Không cập nhật được booking: ${error.message}`, 'error');
        return null;
    } finally {
        updateDashboardData();
    }
}

async function activateSupportForLatestAlert() {
    const latestItem = getSupportQueue()
        .filter(item => !['resolved', 'completed', 'cancelled', 'rescheduled'].includes(item.status))
        .sort(compareSupportQueueItems)[0];

    if (!latestItem) {
        alert('Không có yêu cầu hỗ trợ đang chờ.');
        return;
    }

    await markBooking(latestItem.id, 'scheduled');

    alert('Đã kích hoạt quy trình hỗ trợ cho mục ưu tiên cao nhất.');
}

function renderInterventionsView() {
    const content = document.getElementById('main-content');
    if (!content) return;

    content.innerHTML = `
        <div class="dash-header">
            <div>
                <h2 style="color: var(--deep-rose);">Hiệu quả Can thiệp</h2>
                <span style="color: #666; font-size: 14px;">Tỷ lệ điều hướng, cải thiện mood và feedback sau hỗ trợ</span>
            </div>
            <button class="btn btn-primary" onclick="switchView('dashboard')">← Quay lại Dashboard</button>
        </div>

        <div class="kpi-grid kpi-3">
            <div class="kpi-card kpi-success">
                <div class="kpi-header"><span class="kpi-label">Routing thành công</span></div>
                <div class="kpi-value" id="intervention-success-rate" style="color:#2e7d32;font-weight:800;">0%</div>
                <div class="kpi-sub">Ca hoàn tất / tổng booking</div>
            </div>
            <div class="kpi-card kpi-primary">
                <div class="kpi-header"><span class="kpi-label">Mood trước → sau</span></div>
                <div class="kpi-value" id="intervention-mood-change" style="color:var(--mc-primary);font-weight:800;">-</div>
                <div class="kpi-sub">Từ feedback sau hỗ trợ</div>
            </div>
            <div class="kpi-card kpi-accent">
                <div class="kpi-header"><span class="kpi-label">Feedback tích cực</span></div>
                <div class="kpi-value" id="intervention-positive-feedback" style="color:#c75f3d;font-weight:800;">0%</div>
                <div class="kpi-sub">Sau booking/tư vấn</div>
            </div>
        </div>

        <div class="dash-card" style="margin-top:16px;">
            <div class="card-header"><h3 class="card-title">📋 Ca tư vấn cần xử lý</h3><span class="data-badge">Ranked</span></div>
            <div class="card-body">
                <p id="intervention-note" class="chart-note"></p>
                <table id="consultation-case-table" class="data-table">
                    <thead></thead>
                    <tbody id="consultation-case-body"></tbody>
                </table>
            </div>
        </div>

        <div class="dash-card" style="margin-top:16px;">
            <div class="card-header"><h3 class="card-title">🧾 Tóm tắt can thiệp theo sinh viên</h3><span class="data-badge">Summary</span></div>
            <div class="card-body">
                <div id="intervention-history-list"></div>
            </div>
        </div>
    `;
    updateDashboardData();
}

function renderFeedbackView() {
    const content = document.getElementById('main-content');
    if (!content) return;

    content.innerHTML = `
        <div class="dash-header">
            <div>
                <h2 style="color: var(--deep-rose);">Báo cáo & Feedback</h2>
                <span style="color: #666; font-size: 14px;">Phản hồi thật từ sinh viên, có mood score và sentiment score</span>
            </div>
            <button class="btn btn-primary" onclick="switchView('dashboard')">← Quay lại Dashboard</button>
        </div>

        <div class="kpi-grid kpi-3">
            <div class="kpi-card kpi-neutral">
                <div class="kpi-header"><span class="kpi-label">Tổng feedback</span></div>
                <div class="kpi-value" id="feedback-total" style="color:var(--text-dark);">0</div>
                <div class="kpi-sub">Report + feedback + hậu tư vấn</div>
            </div>
            <div class="kpi-card kpi-success">
                <div class="kpi-header"><span class="kpi-label">Tích cực</span></div>
                <div class="kpi-value" id="feedback-positive-rate" style="color:var(--success);">0%</div>
                <div class="kpi-sub">Từ sentiment score</div>
            </div>
            <div class="kpi-card kpi-primary">
                <div class="kpi-header"><span class="kpi-label">Sentiment TB</span></div>
                <div class="kpi-value" id="feedback-sentiment" style="color:var(--primary-pink);">0/100</div>
                <div class="kpi-sub">Từ nội dung và mood score</div>
            </div>
        </div>

        <div class="dash-card" style="margin-top:16px;">
            <div class="card-header"><h3 class="card-title">💡 Feedback nổi bật</h3><span class="data-badge">Live</span></div>
            <div class="card-body">
                <div id="feedback-live-list" class="feedback-list"></div>
            </div>
        </div>
    `;
    updateDashboardData();
}

function exportDashboardData() {
    if (!dashboardState) {
        showNotification('Chưa có dữ liệu dashboard để xuất.', 'warning');
        return;
    }
    const payload = JSON.stringify(dashboardState, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mindconnect-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function showAllTopics() {
    const topics = (dashboardState?.top_topics || [])
        .map(topic => `#${topic.tag}: ${topic.count} tín hiệu, đề xuất: ${topic.intervention}`)
        .join('\n');
    alert(topics || 'Chưa có chủ đề nổi bật.');
}

function exportReport() {
    MindConnectAdminFeatures.exportDashboardPdf();
}

function generateWeeklyReport() {
    fetchDashboardData()
        .then(() => {
            renderDashboardSections();
            showNotification('Đã tạo báo cáo tuần từ dữ liệu live.', 'success');
        })
        .catch(error => showNotification(`Không tạo được báo cáo: ${error.message}`, 'error'));
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.dash-menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    switch (view) {
        case 'dashboard':
            window.location.reload();
            break;
        case 'interventions':
            renderInterventionsView();
            break;
        case 'feedback':
            renderFeedbackView();
            break;
        default:
            window.location.reload();
    }
}

function setupSidebarNavigation() {
    document.querySelectorAll('.dash-menu-item').forEach(item => {
        if (!item.dataset.view) return;
        item.addEventListener('click', function() {
            switchView(this.dataset.view || 'dashboard');
        });
    });

    document.addEventListener('input', event => {
        MindConnectAdminFeatures.handleFilterInput(event);
    });

    document.addEventListener('change', event => {
        MindConnectAdminFeatures.handleFilterChange(event);
    });
}

function initializeAdminFeatures() {
    MindConnectAdminFeatures.init({
        getDashboardState: () => dashboardState,
        renderDashboardSections,
        markBooking,
        escapeHtml,
        formatAlertTime,
        formatNumber,
        getStatusLabel,
        formatFullDateTime,
        formatDateTimeLocalValue,
        parseAdminDateTimeInput,
        showNotification,
        showConfirmDialog
    });
}

// ============================================
// 15. INITIALIZATION
// ============================================
window.onload = function() {
    initializeAdminFeatures();
    updateDashboardData();
    setupSidebarNavigation();
};
