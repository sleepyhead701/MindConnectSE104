// school.js - School Admin Dashboard Logic

// ============================================
// 1. CONSTANTS & CONFIGURATION
// ============================================
const API_BASE_URL = 'http://localhost:3000';
const RISK_ALERTS_KEY = 'mindconnect:risk-alerts';
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
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
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

// ============================================
// 5. RISK ALERTS MANAGEMENT
// ============================================
function getRiskAlerts() {
    try {
        return JSON.parse(localStorage.getItem(RISK_ALERTS_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function saveRiskAlerts(alerts) {
    localStorage.setItem(RISK_ALERTS_KEY, JSON.stringify(alerts));
}

function filterAlertsByTime(alerts, timeRange) {
    if (timeRange === 'custom') return alerts;

    const now = new Date();
    return alerts.filter(alert => {
        const createdAt = new Date(alert.created_at);
        if (Number.isNaN(createdAt.getTime())) return false;

        if (timeRange === 'today') {
            return createdAt.toDateString() === now.toDateString();
        }

        const days = Number(timeRange);
        if (!days) return true;
        return createdAt >= new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    });
}

function renderRiskAlertPanel(alerts) {
    const panel = document.getElementById('risk-alert-panel');
    const count = document.getElementById('risk-alert-count');
    const list = document.getElementById('risk-alert-list');

    if (!alerts || !alerts.length) {
        if (panel) panel.classList.add('hidden');
        if (list) list.innerHTML = '';
        return;
    }

    panel.classList.remove('hidden');
    count.innerText = `${alerts.length} cảnh báo`;
    list.innerHTML = alerts.map(alert => `
        <div class="risk-alert-item ${alert.severity === 'critical' ? 'critical' : ''}">
            <div>
                <strong>${escapeHtml(alert.label)}</strong>
                <p>${escapeHtml(alert.excerpt || 'Không có trích đoạn')}</p>
                <span>${escapeHtml(alert.source)} · ${escapeHtml(alert.class_name)} · ${formatAlertTime(alert.created_at)}</span>
            </div>
            <button class="btn-action-sm btn-success" onclick="markRiskAlert('${alert.id}', 'contacted')">Đã liên hệ</button>
        </div>
    `).join('');
}

// ============================================
// 6. CONSULTATION CASES
// ============================================
function getDefaultConsultationRows() {
    const element = document.getElementById(DEFAULT_CONSULTATION_ROWS_ID);
    return element ? element.innerHTML : '';
}

function renderConsultationCases(alerts) {
    const body = document.getElementById('consultation-case-body');
    if (!body) return;

    const bookings = dashboardState?.bookings || [];
    const dynamicRows = alerts.map(alert => {
        const rowId = `case-${alert.id}`;
        const badgeClass = alert.severity === 'critical' ? 'bg-high' : 'bg-med';
        return `
            <tr id="${rowId}" data-alert-id="${alert.id}">
                <td style="padding:8px;">#${escapeHtml(alert.id)}</td>
                <td>${escapeHtml(alert.class_name || alert.department || 'Chưa rõ')}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(alert.label)}</span></td>
                <td style="text-align:right;">
                    <button class="btn-action-sm btn-success" onclick="handleConsultation('success', '${rowId}')">✔ Xong</button>
                    <button class="btn-action-sm btn-warn" onclick="handleConsultation('fail', '${rowId}')">📅 Hẹn lại</button>
                </td>
            </tr>
        `;
    }).join('');

    const bookingRows = bookings
        .filter(booking => !['completed', 'cancelled'].includes(booking.status))
        .map(booking => {
            const rowId = `booking-${booking.id}`;
            return `
                <tr id="${rowId}" data-booking-id="${booking.id}">
                    <td style="padding:8px;">#${escapeHtml(booking.id)}</td>
                    <td>${escapeHtml(booking.class_name || booking.department || 'Chưa rõ')}</td>
                    <td><span class="badge bg-med">Yêu cầu tham vấn</span></td>
                    <td style="text-align:right;">
                        <button class="btn-action-sm btn-success" onclick="handleConsultation('success', '${rowId}')">✔ Xong</button>
                        <button class="btn-action-sm btn-warn" onclick="handleConsultation('fail', '${rowId}')">📅 Hẹn lại</button>
                    </td>
                </tr>
            `;
        }).join('');

    body.innerHTML = dynamicRows + bookingRows + getDefaultConsultationRows();
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
function renderMetrics() {
    const metrics = dashboardState?.metrics;
    if (!metrics) return;

    const sentimentEl = document.getElementById('metric-sentiment');
    const riskRateEl = document.getElementById('metric-risk-rate');
    const engagementEl = document.getElementById('metric-engagement');
    const interventionEl = document.getElementById('metric-intervention');

    if (sentimentEl) sentimentEl.innerText = `${metrics.sentiment}/10`;
    if (riskRateEl) riskRateEl.innerText = `${metrics.high_risk_rate}%`;
    if (engagementEl) engagementEl.innerText = String(metrics.engagement);
    if (interventionEl) interventionEl.innerText = `${metrics.intervention_reduction}%`;
}

function renderTopTopics() {
    const topics = dashboardState?.top_topics;
    const listEl = document.getElementById('top-topic-list');
    if (!Array.isArray(topics) || topics.length === 0 || !listEl) return;

    listEl.innerHTML = topics.map((topic, index) => `
        <li><strong>${index + 1}. ${escapeHtml(topic.tag)}</strong> (${escapeHtml(topic.count)})</li>
    `).join('');
}

// ============================================
// 9. RISK DASHBOARD MAIN RENDER
// ============================================
function renderRiskDashboard() {
    const timeRange = document.getElementById('timeSelect')?.value || '7';
    const backendAlerts = Array.isArray(dashboardState?.alerts) ? dashboardState.alerts : [];
    const localAlerts = filterAlertsByTime(getRiskAlerts(), timeRange);
    const mergedById = new Map([...backendAlerts, ...localAlerts].map(alert => [alert.id, alert]));
    const alerts = Array.from(mergedById.values())
        .filter(alert => alert.status !== 'resolved');
    const latestAlert = alerts[0];
    const redAlertBox = document.getElementById('red-alert-box');

    if (latestAlert) {
        const latestLabel = latestAlert.label || 'Cảnh báo rủi ro';
        redAlertBox.classList.remove('hidden');
        document.getElementById('red-alert-title').innerText =
            `${latestLabel.toUpperCase()}: ${latestAlert.class_name || latestAlert.department || 'Không rõ đơn vị'}`;
        document.getElementById('red-alert-summary').innerText =
            `${alerts.length} cảnh báo đang mở. Nguồn gần nhất: ${latestAlert.source || 'Không rõ'}, từ khóa: "${latestAlert.matched_keyword || 'N/A'}". Cần kích hoạt quy trình hỗ trợ.`;
    } else {
        redAlertBox.classList.add('hidden');
    }

    renderMetrics();
    renderTopTopics();
    renderRiskAlertPanel(alerts);
    renderConsultationCases(alerts);
}

// ============================================
// 10. ALERT ACTIONS
// ============================================
async function markRiskAlert(alertId, status) {
    const alerts = getRiskAlerts();
    const target = alerts.find(alert => alert.id === alertId);
    if (target) {
        target.status = status;
        target.updated_at = new Date().toISOString();
        saveRiskAlerts(alerts);
    }

    try {
        await apiRequest(`/api/risk-alerts/${alertId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    } catch (error) {
        // Local status update remains the offline fallback.
    }

    updateDashboardData();
}

async function activateSupportForLatestAlert() {
    const alerts = getRiskAlerts();
    const backendAlerts = Array.isArray(dashboardState?.alerts) ? dashboardState.alerts : [];
    const latestAlert = [...backendAlerts, ...alerts].find(alert => alert.status !== 'resolved');

    if (!latestAlert) {
        alert('Không có cảnh báo động mới để kích hoạt.');
        return;
    }

    if (alerts.some(alert => alert.id === latestAlert.id)) {
        latestAlert.status = 'contacted';
        latestAlert.updated_at = new Date().toISOString();
        saveRiskAlerts(alerts);
    }

    try {
        await apiRequest(`/api/risk-alerts/${latestAlert.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'contacted' })
        });
    } catch (error) {
        // Backend may be unavailable in demo mode.
    }

    alert('Đã gửi thông báo đến GVCN và Tổ tham vấn.');
    updateDashboardData();
}

// ============================================
// 11. DASHBOARD UPDATE (MAIN TRIGGER)
// ============================================
function updateDashboardData() {
    const metricsGrid = document.querySelector('.metrics-grid');
    if (!metricsGrid) return;

    // Loading effect
    metricsGrid.style.opacity = '0.5';
    setTimeout(async () => {
        metricsGrid.style.opacity = '1';
        try {
            await fetchDashboardData();
        } catch (error) {
            dashboardState = null;
        }
        renderRiskDashboard();
    }, 300);
}

// ============================================
// 12. CONSULTATION HANDLER
// ============================================
function handleConsultation(status, rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const alertId = row.dataset.alertId;
    const bookingId = row.dataset.bookingId;

    if (status === 'success') {
        const confirmSurvey = confirm("Xác nhận ca tư vấn THÀNH CÔNG?\nHệ thống sẽ tự động gửi Khảo sát đánh giá (Survey) cho sinh viên.");
        if (confirmSurvey) {
            row.style.backgroundColor = "#e8f5e9";
            row.querySelector('td:last-child').innerHTML = `<span style="color:green; font-size:12px;">⏳ Đã gửi Survey (Hạn 3 ngày)</span>`;
            if (alertId) markRiskAlert(alertId, 'resolved');
            if (bookingId) {
                apiRequest(`/api/bookings/${bookingId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'completed' })
                }).catch(() => {});
            }

            setTimeout(() => {
                alert("✅ Hệ thống đã lên lịch nhắc nhở phản hồi tự động sau 24h và 48h.");
            }, 500);
        }
    } else {
        const newDate = prompt("Tư vấn chưa hoàn tất. Vui lòng nhập ngày hẹn lại (DD/MM/YYYY):", "25/11/2025");
        if (newDate) {
            row.style.backgroundColor = "#fff3e0";
            row.querySelector('td:last-child').innerHTML = `<span style="color:#ef6c00; font-size:12px;">📅 Đã hẹn lại: ${newDate}</span>`;
            if (alertId) markRiskAlert(alertId, 'rescheduled');
            if (bookingId) {
                apiRequest(`/api/bookings/${bookingId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'rescheduled' })
                }).catch(() => {});
            }
        }
    }
}

// ============================================
// 13. NAVIGATION (SIDEBAR)
// ============================================
function switchView(view) {
    currentView = view;

    // Update sidebar active state
    document.querySelectorAll('.dash-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');

    // Handle view switching
    const content = document.getElementById('main-content');
    if (!content) return;

    switch (view) {
        case 'dashboard':
            renderDashboardView();
            break;
        case 'alerts':
            renderAlertsView();
            break;
        case 'interventions':
            renderInterventionsView();
            break;
        case 'feedback':
            renderFeedbackView();
            break;
        default:
            renderDashboardView();
    }
}

function renderDashboardView() {
    // Main dashboard view is already in HTML, just update data
    updateDashboardData();
}

function renderAlertsView() {
    const content = document.getElementById('main-content');
    if (!content) return;

    content.innerHTML = `
        <div class="dash-header">
            <div>
                <h2 style="color: var(--deep-rose);">Cảnh báo Rủi ro</h2>
                <span style="color: #666; font-size: 14px;">Danh sách cảnh báo từ sinh viên</span>
            </div>
            <button class="btn btn-primary" onclick="renderDashboardView(); switchView('dashboard');">← Quay lại Dashboard</button>
        </div>

        <div class="alert-panel">
            <div class="alert-panel-header">
                <div>
                    <h3>Luồng cảnh báo rủi ro</h3>
                    <p>Cảnh báo được tạo tự động từ Diary, Chat AI hoặc Quick Test</p>
                </div>
                <span id="risk-alert-count" class="badge bg-high">0 cảnh báo</span>
            </div>
            <div id="risk-alert-list" class="alert-list"></div>
        </div>
    `;

    updateDashboardData();
}

function renderInterventionsView() {
    const content = document.getElementById('main-content');
    if (!content) return;

    content.innerHTML = `
        <div class="dash-header">
            <div>
                <h2 style="color: var(--deep-rose);">Hiệu quả Can thiệp</h2>
                <span style="color: #666; font-size: 14px;">Đánh giá hiệu quả các can thiệp đã thực hiện</span>
            </div>
            <button class="btn btn-primary" onclick="renderDashboardView(); switchView('dashboard');">← Quay lại Dashboard</button>
        </div>

        <div class="roi-grid">
            <div class="stat-box">
                <h4 style="margin-bottom: 15px;">📊 Tỷ lệ thành công</h4>
                <div style="margin-bottom: 15px;">
                    <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom:5px;">
                        <span>Tỷ lệ Điều hướng Thành công</span>
                        <strong>78%</strong>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width: 78%; background: var(--success);"></div></div>
                </div>
                <div style="margin-bottom: 15px;">
                    <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom:5px;">
                        <span>Tỷ lệ Chuyển đổi Tư vấn</span>
                        <strong>12%</strong>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width: 12%; background: var(--warning);"></div></div>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom:5px;">
                        <span>Phản hồi tích cực về Nguồn lực</span>
                        <strong>4.5/5 ⭐</strong>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width: 90%; background: var(--accent-pink);"></div></div>
                </div>
            </div>

            <div class="stat-box">
                <h4 style="margin-bottom: 15px;">📋 Ca Tư vấn Cần xử lý</h4>
                <table style="width:100%; font-size: 13px; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #eee;">
                            <th style="text-align:left; padding:5px;">Case ID</th>
                            <th style="text-align:left; padding:5px;">Đơn vị</th>
                            <th style="text-align:left; padding:5px;">Trạng thái</th>
                            <th style="text-align:right; padding:5px;">Xử lý</th>
                        </tr>
                    </thead>
                    <tbody id="consultation-case-body">
                        ${getDefaultConsultationRows()}
                    </tbody>
                </table>
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
                <span style="color: #666; font-size: 14px;">Phản hồi từ sinh viên về các dịch vụ hỗ trợ</span>
            </div>
            <button class="btn btn-primary" onclick="renderDashboardView(); switchView('dashboard');">← Quay lại Dashboard</button>
        </div>

        <div class="feedback-list">
            <div class="feedback-item positive">
                <div class="feedback-header">
                    <span class="feedback-author">Sinh viên ẩn danh</span>
                    <span class="feedback-time">2 giờ trước</span>
                    <span class="feedback-tag positive">Tích cực</span>
                </div>
                <p class="feedback-text">"Tài liệu về quản lý stress rất hữu ích. Cảm ơn đội ngũ hỗ trợ!"</p>
            </div>
            <div class="feedback-item improvement">
                <div class="feedback-header">
                    <span class="feedback-author">Sinh viên ẩn danh</span>
                    <span class="feedback-time">5 giờ trước</span>
                    <span class="feedback-tag improvement">Cần cải thiện</span>
                </div>
                <p class="feedback-text">"Khung giờ tư vấn nên linh hoạt hơn, buổi tối sẽ tiện hơn."</p>
            </div>
            <div class="feedback-item positive">
                <div class="feedback-header">
                    <span class="feedback-author">Sinh viên ẩn danh</span>
                    <span class="feedback-time">1 ngày trước</span>
                    <span class="feedback-tag positive">Tích cực</span>
                </div>
                <p class="feedback-text">"Bài thiền 5 phút trên app giúp mình ngủ ngon hơn. Nên thêm nhiều bài tập như vậy."</p>
            </div>
        </div>
    `;
}

// ============================================
// 14. INITIALIZATION
// ============================================
window.onload = function() {
    updateDashboardData();
    setupSidebarNavigation();
};

window.addEventListener('storage', function(event) {
    if (event.key === RISK_ALERTS_KEY) updateDashboardData();
});

function setupSidebarNavigation() {
    const menuItems = document.querySelectorAll('.dash-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active from all
            menuItems.forEach(i => i.classList.remove('active'));
            // Add active to clicked
            this.classList.add('active');

            // Determine view based on content
            const text = this.textContent;
            if (text.includes('Tổng quan')) {
                switchView('dashboard');
            } else if (text.includes('Cảnh báo')) {
                switchView('alerts');
            } else if (text.includes('Can thiệp')) {
                switchView('interventions');
            } else if (text.includes('Báo cáo')) {
                switchView('feedback');
            }
        });
    });
}
