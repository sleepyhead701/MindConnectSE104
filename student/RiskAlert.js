import { normalizeVietnamese } from './utils/normalizeVietnamese.js';
import { apiRequest } from './utils/utils.js';
import { getRiskAlertsKey } from '../shared/state.js';

const riskDetectionRules = [
    {
        severity: 'critical',
        label: 'Cảnh báo tự tử',
        keywords: [
            'tự tử', 'tu tu', 'tự hại', 'tu hai', 'muốn chết', 'muon chet',
            'không muốn sống', 'khong muon song', 'kết thúc cuộc đời', 'ket thuc cuoc doi',
            'biến mất mãi mãi', 'bien mat mai mai'
        ]
    },
    {
        severity: 'high',
        label: 'Rủi ro tâm lý cao',
        keywords: [
            'trầm cảm', 'tram cam', 'hoảng loạn', 'hoang loan', 'kiệt sức', 'kiet suc',
            'stress', 'khóc', 'khoc', 'mệt mỏi', 'met moi', 'tuyệt vọng', 'tuyet vong'
        ]
    }
];

export function createRiskAlert(source, text, extra = {}) {
    const signal = detectRiskSignal(text);
    const { force, ...alertExtra } = extra;
    if (!signal && !force) return null;

    const alert = {
        id: `RA-${Date.now()}`,
        created_at: new Date().toISOString(),
        source,
        severity: signal?.severity || alertExtra.severity || 'high',
        label: signal?.label || alertExtra.label || 'Rủi ro tâm lý cao',
        matched_keyword: signal?.matchedKeyword || alertExtra.matched_keyword || 'manual-trigger',
        status: 'new',
        student_alias: 'SV ẩn danh',
        class_name: 'CNTT_K48',
        department: 'CNTT',
        excerpt: (text || '').replace(/\s+/g, ' ').trim().slice(0, 180),
        ...alertExtra
    };

    saveRiskAlerts([alert, ...getRiskAlerts()]);
    syncRiskAlert(alert);
    return alert;
}

export function saveRiskAlerts(alerts) {
    localStorage.setItem(getRiskAlertsKey(), JSON.stringify(alerts.slice(0, 30)));
}

export async function syncRiskAlert(alert) {
    try {
        await apiRequest('/api/risk-alerts', {
            method: 'POST',
            body: JSON.stringify(alert)
        });
    } catch (error) {
        // Local storage remains the fallback when the backend is unavailable.
    }
}

function detectRiskSignal(text) {
    const rawText = (text || '').toLowerCase();
    const normalizedText = normalizeVietnamese(text);

    for (const rule of riskDetectionRules) {
        const matchedKeyword = rule.keywords.find(keyword => {
            const normalizedKeyword = normalizeVietnamese(keyword);
            return rawText.includes(keyword) || normalizedText.includes(normalizedKeyword);
        });

        if (matchedKeyword) {
            return { ...rule, matchedKeyword };
        }
    }

    return null;
}
export function getRiskAlerts() {
    try {
        return JSON.parse(localStorage.getItem(getRiskAlertsKey())) || [];
    } catch (error) {
        return [];
    }
}

function renderCrisisSupportNotice(alert) {
    if (!alert) return '';

    const isCritical = alert.severity === 'critical';
    return `
        <div class="crisis-support-card ${isCritical ? 'critical' : ''}">
            <strong>${isCritical ? 'Cần hỗ trợ khẩn cấp' : 'Tín hiệu rủi ro đã được ghi nhận'}</strong>
            <p>
                Hệ thống đã tạo cảnh báo ẩn danh cho tổ tham vấn. Nếu bạn đang không an toàn,
                hãy gọi hotline <a href="tel:19001267">1900.1267</a> hoặc liên hệ người tin cậy ngay.
            </p>
            <button class="btn-primary" onclick="openBookingModal()">Đặt lịch tham vấn</button>
        </div>
    `;
}
