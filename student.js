// student.js - FULL VERSION (MERGED)

// --- 1. DỮ LIỆU & TRẠNG THÁI (STATE) ---
import { loadJson, savePublicFeed,  saveJson } from './state.js';
import { getAuthSession, getStudentSession } from './student/studentState.js';
import { getStudentProfileKey } from './student/studentState.js';
import { getUserFeed, addUserFeed } from './state.js';
import { getStudentProfile, getPrivateDiaryEntries } from './student/studentState.js';
import { findUserBySession, findUserByName } from './student/studentState.js';
import { getBackendReadyState, setBackendReadyState } from './state.js';
import { escapeHtml, apiRequest } from './student/utils/utils.js';

function getAuthHeaders() {
    const session = getAuthSession();
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

import { saveStudentProfile } from './student/studentState.js';

import { addManualTag, getManualTags } from './student/utils/tags.js';

function getSupportLocation(value) {
    const selected = String(value || '').trim();
    return SUPPORT_LOCATIONS.includes(selected) ? selected : SUPPORT_LOCATIONS[0];
}

function renderSupportLocationOptions(selectedLocation = getSupportLocation()) {
    return SUPPORT_LOCATIONS.map(location => `
        <option value="${escapeHtml(location)}" ${location === selectedLocation ? 'selected' : ''}>
            ${escapeHtml(location)}
        </option>
    `).join('');
}

function getBookingStatusLabel(status) {
    const labels = {
        new: 'Đang chờ',
        scheduled: 'Đã xếp lịch',
        rescheduled: 'Đã hẹn lại',
        completed: 'Hoàn tất',
        cancelled: 'Đã hủy',
        offline: 'Lưu tạm trên máy'
    };
    return labels[status] || status || 'Đang chờ';
}

function formatBookingDateTime(value) {
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

import { trackInteraction } from './student/API/analytics.js';

import { normalizeVietnamese } from './student/utils/normalizeVietnamese.js';

function getRiskAlerts() {
    try {
        return JSON.parse(localStorage.getItem(RISK_ALERTS_KEY)) || [];
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

// --- 2. KHỞI TẠO (INIT) ---
window.onload = function() {
    setBackendReadyState(false);
    showLoadingScreen(); // Hiển thị màn hình
    updateStudentProfileBadge();
    loadFeedFromBackend();
    hideLoadingScreen();
    renderStudentHome(); // Mặc định vào trang chủ
    setTimeout(() => {
        showNotification("📅 Đừng quên làm Quick Test cảm xúc hôm nay nhé!");
    }, 1000);
};

import { showLoadingScreen, hideLoadingScreen } from './student/loadingScreen.js';

import { showNotification } from './student/utils/utils.js';

import { updateNav } from './student/utils/updateNav.js';
import { animateMainContentSwap } from './student/animations.js';

function formatDiaryContent(title, content) {
    const safeTitle = escapeHtml(title || '');
    const safeContent = escapeHtml(content || '').replace(/\n/g, '<br>');
    return safeTitle ? `<strong>${safeTitle}</strong><br>${safeContent}` : safeContent;
}

import { formatFeedTime, getFeedGradient, getInitials } from './student/utils/utils.js';

async function loadFeedFromBackend() {
    try {
        await fetch(`${API_BASE_URL}/`);
    } catch (error) {
        // Keep the local public feed available when backend is unavailable.
    } finally {
        setBackendReadyState(true);
    }
}


function getFallbackResourceSuggestion(txt) {
    const normalizedText = normalizeVietnamese(txt);

    if (normalizedText.includes('thi') || normalizedText.includes('hoc') || normalizedText.includes('deadline') || normalizedText.includes('burnout')) {
        return 'Bạn có thể xem thêm bài Blog "Cách vượt qua Burnout mùa thi" trong Resources.';
    }

    if (normalizedText.includes('lo au') || normalizedText.includes('stress') || normalizedText.includes('cang thang')) {
        return 'Bạn có thể thử video "Thiền 5 phút giảm lo âu": https://www.youtube.com/watch?v=inpok4MKVLM';
    }

    if (normalizedText.includes('co don') || normalizedText.includes('buon') || normalizedText.includes('khoc')) {
        return 'Bạn có thể nghe Podcast "Radio Cảm Xúc #12 - Chữa lành": https://open.spotify.com/episode/63VvDWyELyutySrZSRU1Hq';
    }

    if (normalizedText.includes('mat ngu') || normalizedText.includes('kho ngu')) {
        return 'Bạn có thể mở "Bài tập thở giảm Stress" trong mục Resources để điều hòa nhịp thở trước khi ngủ.';
    }

    return 'Nếu bạn muốn, mình có thể gợi ý một video, podcast hoặc bài tập thở trong mục Resources.';
}

window.submitComment = function(postIndex, content) {
    const profile = getStudentProfile();
    const userName = profile.displayName || profile.name;
    const post = getUserFeed()[postIndex];
    if (!getUserFeed()[postIndex].commentObjects) {
        getUserFeed()[postIndex].commentObjects = [];
        
    }
    getUserFeed()[postIndex].commentObjects.push({
        author: userName,
        author_avatar: profile.avatarUrl,
        owner_email: profile.email,
        isUser: true,
        content: content,
        date: new Date().toISOString(),
        likes: 0
    });
    trackInteraction('comment', post?.id || `post-${postIndex}`, {
        content_length: String(content || '').length
    });
    savePublicFeed();
    renderStudentHome();
};

import { updateStudentProfileBadge, renderStudentHome } from './student/NewsFeed/NewsFeed.js';

import { renderStudentDiary } from './student/Diary/Diary.js';
import { getCurrentMoodScore, setCurrentMoodScore } from './student/studentState.js';
import { callChatBotAPI } from './student/API/callChatBotAPI.js'

import { renderResourcesLibrary } from './student/Resources/Resources.js';

import { isOwnedFeedPost } from './student/studentState.js';
