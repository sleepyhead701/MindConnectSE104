// student.js - FULL VERSION (MERGED)

const _authSession = JSON.parse(localStorage.getItem('mindconnect:auth') || 'null');
const _authRole = localStorage.getItem('mindconnect:role');
if (!_authSession || _authRole !== 'student') {
    window.location.href = 'index.html';
}

// --- 1. DỮ LIỆU & TRẠNG THÁI (STATE) ---
import { loadJson, savePublicFeed,  saveJson } from '../shared/state.js';
import { getAuthSession, getStudentSession, resetChatForNewWebVisit } from './studentState.js';
import { getStudentProfileKey } from './studentState.js';
import { getUserFeed, addUserFeed } from '../shared/state.js';
import { getStudentProfile, getPrivateDiaryEntries } from './studentState.js';
import { findUserBySession, findUserByName } from './studentState.js';
import { getBackendReadyState, setBackendReadyState } from '../shared/state.js';
import { escapeHtml, apiRequest, installCustomAlertDialog } from './utils/utils.js';
import { getAPIBaseUrl } from '../shared/state.js';

import { saveStudentProfile } from './studentState.js';

import { addManualTag, getManualTags } from './utils/tags.js';

import { trackInteraction } from './API/analytics.js';

import { normalizeVietnamese } from './utils/normalizeVietnamese.js';


// --- 2. KHỞI TẠO (INIT) ---
installCustomAlertDialog();

window.onload = async function() {
    setBackendReadyState(false);
    resetChatForNewWebVisit();
    showLoadingScreen(); // Hiển thị màn hình
    updateStudentProfileBadge();
    await loadFeedFromBackend();
    hideLoadingScreen();
    renderStudentHome(); // Mặc định vào trang chủ
    setTimeout(() => {
        showNotification({
            variant: 'mood-reminder',
            title: 'Quick Test cảm xúc',
            message: 'Dành 30 giây để ghi nhận tâm trạng hôm nay.',
            actionLabel: 'Làm ngay',
            actionSelector: '.nav-icon[data-action="diary"]',
            duration: 7000
        });
    }, 1000);
};

import { showLoadingScreen, hideLoadingScreen } from './loadingScreen.js';

import { showNotification } from './utils/utils.js';

import { updateNav } from './utils/updateNav.js';
import { animateMainContentSwap } from './animations.js';

import { formatFeedTime, getFeedGradient, getInitials } from './utils/utils.js';

export async function loadFeedFromBackend() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    try {
        const response = await fetch(`${getAPIBaseUrl()}/`, { signal: controller.signal });
        setBackendReadyState(response.ok);
        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }
    } catch (error) {
        setBackendReadyState(false);
        showNotification('Backend chưa sẵn sàng. Các tính năng cần API sẽ tạm khóa cho tới khi backend chạy lại.');
    } finally {
        clearTimeout(timeoutId);
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

import { updateStudentProfileBadge, renderStudentHome } from './NewsFeed/NewsFeed.js';

import { renderStudentDiary } from './Diary/Diary.js';
import { getCurrentMoodScore, setCurrentMoodScore } from './studentState.js';
import { callChatBotAPI } from './API/callChatBotAPI.js'

import { renderResourcesLibrary } from './Resources/Resources.js';

import { isOwnedFeedPost } from './studentState.js';
