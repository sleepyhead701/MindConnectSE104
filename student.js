// student.js - FULL VERSION (MERGED)

// --- 1. DỮ LIỆU & TRẠNG THÁI (STATE) ---
import { 
    loadJson, savePrivateDiaryEntries, getStudentSession,
    getAuthSession, getResourcesDB, addResource, savePublicFeed,
    getBackendReadyState, setBackendReadyState, getStudentStorageKey,
    getStudentProfileKey, getUserFeed, addUserFeed, findUserBySession, 
    findUserByName, saveJson, getStudentProfile, getUserProfile,
    getPrivateDiaryEntries
    } from './student/state.js';
import { escapeHtml, apiRequest } from './student/utils.js';

function getAuthHeaders() {
    const session = getAuthSession();
    return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

function loadCustomResources() {
    return loadJson(CUSTOM_RESOURCES_KEY, []);
}

function saveCustomResources() {
    const customResources = getResourcesDB().filter(resource => resource.isCustom);
    saveJson(CUSTOM_RESOURCES_KEY, customResources);
}

function saveStudentProfile(profile) {
    saveJson(getStudentStorageKey(getStudentProfileKey()), {
        name: String(profile.name || '').trim() || 'Người dùng ẩn danh',
        avatarUrl: profile.avatarUrl || 'logo.png',
        bio: profile.bio || ''
    });
}

function getAuthorAvatar(item, index) {
    if (item?.author_avatar) return item.author_avatar;
    const profile = getUserProfile(item?.author);
    return profile?.avatarUrl || '';
}

import { addManualTag, getManualTags } from './student/tags.js';

function getSupportLocation() {
    return 'Phòng tham vấn 102 - Khu B';
}

import { trackInteraction } from './student/analytics.js';

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

function normalizeVietnamese(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
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

function getRiskAlerts() {
    try {
        return JSON.parse(localStorage.getItem(RISK_ALERTS_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function saveRiskAlerts(alerts) {
    localStorage.setItem(RISK_ALERTS_KEY, JSON.stringify(alerts.slice(0, 30)));
}

async function syncRiskAlert(alert) {
    try {
        await apiRequest('/api/risk-alerts', {
            method: 'POST',
            body: JSON.stringify(alert)
        });
    } catch (error) {
        // Local storage remains the fallback when the backend is unavailable.
    }
}

function createRiskAlert(source, text, extra = {}) {
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

function showLoadingScreen() {
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    loadingScreen.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 20px; animation: pulse 1s infinite;">⏳</div>
            <h2 style="font-family: var(--font-heading); font-size: 24px; color: #333; margin-bottom: 10px;">Đang tải...</h2>
            <p style="font-size: 14px; color: #999;">Vui lòng chờ trong giây lát</p>
            <div style="margin-top: 20px; display: flex; gap: 5px; justify-content: center;">
                <div style="width: 8px; height: 8px; background: var(--accent-pink); border-radius: 50%; animation: bounce 1.4s infinite;"></div>
                <div style="width: 8px; height: 8px; background: var(--accent-pink); border-radius: 50%; animation: bounce 1.4s infinite 0.2s;"></div>
                <div style="width: 8px; height: 8px; background: var(--accent-pink); border-radius: 50%; animation: bounce 1.4s infinite 0.4s;"></div>
            </div>
        </div>
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            @keyframes bounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
            }
        </style>
    `;
    document.body.appendChild(loadingScreen);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.transition = 'opacity 0.3s ease';
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.remove(), 300);
    }
}

function blockIfBackendNotReady() {
    if (getBackendReadyState()) return false;
    setTimeout(() => showNotification('⏳ Backend chưa sẵn sàng, vui lòng chỉ xem giao diện.'), 1000 );
    return true;
}

function logout() {
    localStorage.removeItem('mindconnect:auth');
    localStorage.removeItem('mindconnect:role');
    localStorage.removeItem('authSession');
    window.location.href = 'index.html';
}

function showNotification(text) {
    const notif = document.createElement('div');
    notif.className = 'notification-toast';
    notif.innerText = text;
    // Tìm mobile-frame để gắn vào, tránh lỗi nếu chưa load DOM
    const frame = document.querySelector('.mobile-frame');
    if(frame) {
        frame.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }
}

import { updateNav } from './student/updateNav.js';
import { animateMainContentSwap } from './student/animations.js';

function navigateResourceMenu(routeKey) {
    const routes = {
        topics: { hash: 'resources', filter: null },
        videos: { hash: 'resources/videos', filter: 'Video' },
        books: { hash: 'resources/books', filter: 'Book' },
        blog: { hash: 'resources/blog', filter: 'Blog' }
    };
    const target = routes[routeKey] || routes.topics;

    const nextHash = `#${target.hash}`;

    if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
    }

    if (target.filter) {
        renderResources(target.filter);
        return;
    }

    renderResources();
}

function formatChatMessage(value) {
    return escapeHtml(value)
        .replace(
            /(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        .replace(/\n/g, '<br>');
}

function formatDiaryContent(title, content) {
    const safeTitle = escapeHtml(title || '');
    const safeContent = escapeHtml(content || '').replace(/\n/g, '<br>');
    return safeTitle ? `<strong>${safeTitle}</strong><br>${safeContent}` : safeContent;
}

import { formatFeedTime, getFeedGradient, getInitials } from './student/utils.js';

function stripHtml(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ');
}

function setChatSuggestion(text) {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.value = text || '';
    input.focus();
}

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

// ==============================================
// 3. HOME (GIAO DIỆN LAI THREADS)
// ==============================================
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

import { updateStudentProfileBadge, renderStudentHome } from './student/NewsFeed.js';

// ==============================================
// 4. DIARY (QUICK TEST + NOTION EDITOR + AI TAG)
// ==============================================
import { renderStudentDiary } from './student/Diary.js';

function getChatApiHistory() {
    return chatHistory.slice(0, -1).slice(-8).map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: String(msg.text || '').replace(/<[^>]*>/g, '')
    }));
}

async function callChatBotAPI(message) {
    const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify({
            message,
            history: getChatApiHistory()
        })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
        const error = new Error(result.error || 'Chat API request failed');
        error.statusCode = response.status;
        throw error;
    }

    const reply = String(result.data?.reply || '').trim();
    if (!reply) {
        throw new Error('Chat API returned an empty reply');
    }

    return reply;
}

function buildFallbackChatReply(txt, riskAlert) {
    const lowerTxt = txt.toLowerCase();
    const suggestion = getFallbackResourceSuggestion(txt);

    if(riskAlert && riskAlert.severity === 'critical') {
        return "⚠️ Mình rất lo lắng cho sự an toàn của bạn. Cảnh báo ẩn danh đã được gửi đến tổ tham vấn. Nếu bạn đang có nguy cơ tự hại, hãy gọi hotline 1900.1267 hoặc liên hệ người tin cậy ngay.";
    }

    if(riskAlert) {
        return `Mình nhận thấy bạn đang có dấu hiệu căng thẳng cao. Mình đã ghi nhận cảnh báo ẩn danh để tổ tham vấn có thể hỗ trợ, và bạn có thể đặt lịch ngay nếu muốn. ${suggestion}`;
    }

    if(lowerTxt.includes("buồn") || lowerTxt.includes("khóc") || lowerTxt.includes("mệt") || lowerTxt.includes("stress")) {
        return `Mình cảm nhận được bạn đang có tâm trạng không tốt. Trước mắt, bạn hãy thử gọi tên cảm xúc của mình và hít thở chậm trong 1 phút. ${suggestion}`;
    }

    return `Cảm ơn bạn đã chia sẻ. Mình luôn ở đây lắng nghe bạn; bạn có thể kể rõ hơn chuyện gì đang làm bạn nặng lòng nhất không? ${suggestion}`;
}

function buildChatConnectionErrorReply(error) {
    const message = String(error?.message || '')
        .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-...');
    const isMissingKey = message.includes('GROQ_API_KEY');
    const reason = isMissingKey
        ? 'backend chưa có GROQ_API_KEY thật'
        : 'backend hoặc Groq API đang trả lỗi';
    const detail = message && !isMissingKey
        ? `\nChi tiết kỹ thuật: ${message.slice(0, 220)}`
        : '';

    return [
        `Mình chưa kết nối được Groq API thật lúc này (${reason}), nên mình sẽ không giả vờ trả lời như AI thật.`,
        'Bạn hãy kiểm tra backend đang chạy, file backend/.env có GROQ_API_KEY thật, rồi restart backend và thử gửi lại tin nhắn.',
        `Khi kết nối đúng, câu trả lời sẽ được tạo trực tiếp từ Groq theo từng nội dung bạn nhắn, không dùng câu fallback lặp lại.${detail}`
    ].join('\n');
}

async function analyzeDiary() {
    return savePrivateDiary();
}

function toggleTag(el) { el.classList.toggle('selected'); }

async function savePrivateDiary() {
    const title = document.getElementById('diary-title')?.value.trim() || '';
    const content = document.getElementById('diary-content')?.value.trim() || '';
    const tagInput = document.getElementById('diary-tag-input');
    if (tagInput?.value.trim()) addManualTag('diary-tag-input', 'diary-tag-container');
    const finalTags = getManualTags('diary-tag-container');

    if (content.length < 5) {
        alert('Hãy viết nhật ký dài hơn một chút nhé.');
        return;
    }

    if (!finalTags.length) {
        alert('Bạn cần thêm ít nhất 1 tag trước khi lưu nhật ký.');
        return;
    }

    const riskAlert = createRiskAlert('Diary', `${title} ${content}`, { diary_title: title || 'Không có tiêu đề' });
    const entry = {
        id: `diary-${Date.now()}`,
        title,
        content,
        tags: finalTags,
        mood_score: currentMoodScore,
        date: new Date().toISOString()
    };

    getPrivateDiaryEntries().unshift(entry);
    savePrivateDiaryEntries();

    try {
        await apiRequest('/api/diaries', {
            method: 'POST',
            body: JSON.stringify({
                title,
                content,
                tags: finalTags,
                mood_score: currentMoodScore
            })
        });
    } catch (error) {
        // Private local diary remains saved even if backend analytics are unavailable.
    }

    alert(riskAlert
        ? 'Đã lưu nhật ký riêng tư và gửi cảnh báo ẩn danh cho tổ tham vấn.'
        : 'Đã lưu nhật ký riêng tư.');
    renderStudentDiary();
}

function openDiaryEntryModal(entryId) {
    const entry = getPrivateDiaryEntries().find(item => String(item.id) === String(entryId));
    if (!entry) return;

    const existing = document.getElementById('diary-entry-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'diary-entry-modal';
    modal.className = 'modal-overlay';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div class="modal-content" style="max-height:90vh; overflow:auto;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:16px;">
                <div>
                    <p class="mc-kicker" style="margin:0 0 4px;">Nhật ký riêng tư</p>
                    <h3 style="margin:0; color:var(--deep-rose); font-family:var(--font-heading);">${escapeHtml(entry.title || 'Không có tiêu đề')}</h3>
                    <p style="margin:6px 0 0; color:#777; font-size:13px;">${formatFeedTime(entry.date)} · Mood ${escapeHtml(entry.mood_score || '-')} / 5</p>
                </div>
                <button type="button" aria-label="Đóng" onclick="document.getElementById('diary-entry-modal')?.remove()" style="border:0;background:transparent;font-size:24px;cursor:pointer;color:#999;">&times;</button>
            </div>
            <div class="mc-tag-row" style="margin-bottom:14px;">
                ${(entry.tags || []).map(tag => `<span>#${escapeHtml(tag)}</span>`).join('')}
            </div>
            <p style="white-space:pre-wrap; line-height:1.7; color:var(--mc-ink);">${escapeHtml(entry.content)}</p>
        </div>
    `;
    document.querySelector('.mobile-frame')?.appendChild(modal);
}

async function confirmAndPost() {
    return savePrivateDiary();
}

// ==============================================
// 5. RESOURCES (TÀI NGUYÊN)
// ==============================================
function trackResourceOpen(index) {
    const resource = currentResource[index];
    if (!resource) return;
    trackInteraction('resource_view', resource.title, {
        type: resource.type,
        title: resource.title
    });
}

function normalizeResourceType(url, requestedType) {
    if (requestedType && requestedType !== 'Tự nhận diện') return requestedType;
    const lowerUrl = String(url || '').toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'Video';
    if (lowerUrl.includes('spotify.com')) return 'Podcast';
    if (lowerUrl.endsWith('.pdf')) return 'Book';
    return 'Blog';
}

function addCustomResource() {
    const url = document.getElementById('resource-url')?.value.trim() || '';
    const title = document.getElementById('resource-title')?.value.trim() || '';
    const requestedType = document.getElementById('resource-type')?.value || 'Tự nhận diện';

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (error) {
        alert('Bạn cần nhập link resource hợp lệ.');
        return;
    }

    if (!title) {
        alert('Bạn cần đặt tên cho resource trước khi import.');
        return;
    }

    const resource = {
        type: normalizeResourceType(parsedUrl.href, requestedType),
        title,
        duration: 'User import',
        img: 'logo.png',
        url: parsedUrl.href,
        isCustom: true
    };

    resourcesDB.unshift(resource);
    saveCustomResources();
    showNotification('Đã import resource bằng link.');
    renderResources(resource.type);
}

function requestResourceByNeed() {
    const query = document.getElementById('resource-request-input')?.value.trim() || '';
    const resultBox = document.getElementById('resource-request-result');
    if (!resultBox) return;

    if (!query) {
        resultBox.innerHTML = '<p class="mc-empty">Bạn hãy nhập nhu cầu cần tìm tài nguyên.</p>';
        return;
    }

    const normalized = normalizeVietnamese(query);
    const matches = resourcesDB.filter(resource => {
        const haystack = normalizeVietnamese(`${resource.title} ${resource.type} ${resource.duration}`);
        return normalized.split(/\s+/).some(token => token.length > 2 && haystack.includes(token));
    }).slice(0, 4);

    if (matches.length) {
        resultBox.innerHTML = matches.map(resource => `
            <a href="${escapeHtml(resource.url || '#')}" target="_blank" rel="noopener noreferrer" class="feedback-item positive" style="display:block; text-decoration:none;">
                <strong>${escapeHtml(resource.title)}</strong>
                <p class="feedback-text">${escapeHtml(resource.type)} · ${escapeHtml(resource.duration || '')}</p>
            </a>
        `).join('');
        return;
    }

    const externalSearch = `https://scholar.google.com/scholar?q=${encodeURIComponent(query + ' mental health')}`;
    const wikiSearch = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
    resultBox.innerHTML = `
        <div class="feedback-item improvement">
            <strong>Chưa có resource phù hợp trong thư viện.</strong>
            <p class="feedback-text">Bạn có thể tìm nguồn học thuật bên ngoài, sau đó import link vào Resources.</p>
            <div class="feedback-action">
                <a class="btn-link" target="_blank" rel="noopener noreferrer" href="${externalSearch}">Google Scholar</a>
                <a class="btn-link" target="_blank" rel="noopener noreferrer" href="${wikiSearch}">Wikipedia</a>
            </div>
        </div>
    `;
}

function renderResources(filterType = 'Tất cả') {
    const container = document.getElementById('student-main-content');
    updateNav(2);
    animateMainContentSwap();

    const filteredDB = filterType === 'Tất cả'
        ? resourcesDB
        : resourcesDB.filter(res => res.type === filterType);
    currentResource = filteredDB;

    const types = ['Tất cả', ...new Set(resourcesDB.map(r => r.type))];

    const filterHtml = types.map(t => `
        <button class="filter-btn ${t === filterType ? 'active' : ''}" type="button"
                onclick="renderResources('${t}')">${escapeHtml(t)}</button>
    `).join('');

    const cardsHtml = filteredDB.map((res, index) => {
        const href = res.url || '#';
        const actionAttr = res.action
            ? `onclick="trackResourceOpen(${index}); ${res.action}(); return false;" href="#"`
            : `onclick="trackResourceOpen(${index})" href="${escapeHtml(href)}" ${href === '#' ? '' : 'target="_blank" rel="noopener noreferrer"'}`;

        return `
            <a ${actionAttr} class="res-link mc-resource-link">
                <article class="res-card mc-resource-card">
                    <div class="res-img-container mc-resource-cover" style="background-image: url('${res.img || 'https://via.placeholder.com/150'}')">
                        <span class="res-type-tag">${escapeHtml(res.type)}</span>
                        <span class="mc-resource-duration">${escapeHtml(res.duration || '')}</span>
                    </div>
                    <div class="res-info">
                        <div class="res-title-main">${escapeHtml(res.title)}</div>
                        <div class="res-footer">Xem thêm →</div>
                    </div>
                </article>
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Kho tài nguyên</p>
                <h1>Tài nguyên cho <span>tâm hồn.</span></h1>
                <p>Import resource bằng link, ưu tiên nguồn chính thống và học thuật cho nội dung tâm lý.</p>
            </div>
            <div class="mc-panel" style="margin-bottom:18px;">
                <label class="mc-field-label" for="resource-request-input">Request resource theo nhu cầu</label>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                    <input id="resource-request-input" class="mc-input" style="flex:1; min-width:220px;" placeholder="Ví dụ: mất ngủ, anxiety, stress deadline">
                    <button class="mc-btn mc-btn-outline" type="button" onclick="requestResourceByNeed()">Gợi ý resource</button>
                </div>
                <div id="resource-request-result" class="feedback-list"></div>
            </div>
            <div class="mc-panel" style="margin-bottom:18px;">
                <label class="mc-field-label" for="resource-url">Import resource bằng link</label>
                <div class="mc-resource-import-row">
                    <input id="resource-url" class="mc-input" placeholder="https://...">
                    <input id="resource-title" class="mc-input" placeholder="Tên resource">
                    <select id="resource-type" class="mc-input">
                        <option>Tự nhận diện</option>
                        <option>Blog</option>
                        <option>Video</option>
                        <option>Podcast</option>
                        <option>Book</option>
                        <option>Công cụ</option>
                    </select>
                    <button class="mc-btn mc-btn-primary" type="button" onclick="addCustomResource()">Import</button>
                </div>
            </div>
            <div class="filter-bar mc-filter-bar">${filterHtml}</div>
            <div class="resource-grid mc-resource-grid">
                ${cardsHtml}
            </div>
        </section>
    `;
}

function renderBreathingSpace() {
    const container = document.getElementById('student-main-content');
    updateNav(2);
    animateMainContentSwap();
    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-panel mc-breathing-panel">
                <p class="mc-kicker">Công cụ thở</p>
                <h1>Bài tập thở giảm Stress</h1>
                <p id="breath-text">Chuẩn bị...</p>
            <div id="breath-circle" class="breathing-circle"></div>
                <button class="mc-btn mc-btn-primary" type="button" onclick="startBreathing()">Bắt đầu</button>
            </div>
        </section>
    `;
}

function startBreathing() {
    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    let phase = 0; // 0: Hít, 1: Giữ, 2: Thở

    setInterval(() => {
        if(phase === 0) {
            circle.style.transform = "scale(1.5)";
            text.innerText = "Hít vào thật sâu...";
            phase = 1;
        } else if(phase === 1) {
            text.innerText = "Giữ hơi thở...";
            phase = 2;
        } else {
            circle.style.transform = "scale(1)";
            text.innerText = "Thở ra nhẹ nhàng...";
            phase = 0;
        }
    }, 4000);
}

function getProfileSession() {
    return getStudentSession();
}


function renderProfileLegacy() {
    const container = document.getElementById('student-main-content');
    updateNav(-1);
    animateMainContentSwap();

    const session = getProfileSession();
    if (!session || !session.name) {
        session.name = 'Người dùng ẩn danh';
    }

    // Tìm thông tin người dùng dựa trên username trên session, nếu có
    const currentUserProfile = findUserBySession(session) || {
        name: session.name,
        email: session.email,
        avatarUrl: 'logo.png'
    };


    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Thông tin cá nhân</p>
                <h1>User <span>Profile</span></h1>
                <p>Quản lý tài khoản và thiết lập riêng tư của bạn.</p>
            </div>
            <div class="mc-panel" style="max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                    <img src="${escapeHtml(currentUserProfile.avatarUrl)}" alt="Avatar" class="user-profile-badge" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h2 style="margin: 0; font-family: var(--font-heading); color: var(--mc-ink);">${escapeHtml(session.name)}</h2>
                        <p style="margin: 4px 0 0; color: var(--mc-ink-soft);">${escapeHtml(currentUserProfile.email || session.email)}</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label class="mc-field-label">Tên hiển thị (Ẩn danh)</label>
                    <input type="text" class="mc-input" value="${escapeHtml(currentUserProfile.name)}" disabled>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label class="mc-field-label">Email trường</label>
                    <input type="email" class="mc-input" value="${escapeHtml(currentUserProfile.email || session.email)}" disabled>
                </div>
                
                <button class="mc-btn mc-btn-primary" style="width: 100%; margin-top: 10px;" onclick="openFeedbackModal({ source_type: 'app' })">Gửi feedback cho nhà trường</button>
                <button class="mc-btn mc-btn-outline" style="width: 100%; margin-top: 10px;" onclick="logout()">Đăng xuất</button>
            </div>
        </section>
    `;
}

// ==============================================
// 6. STATS (THỐNG KÊ DYNAMIC)
// ==============================================
function renderStudentStatsLegacy() {
    const container = document.getElementById('student-main-content');
    updateNav(3);
    animateMainContentSwap();

    const latestAlert = getRiskAlerts()[0];
    const riskLevel = latestAlert
        ? (latestAlert.severity === 'critical' ? 'high' : 'medium')
        : 'medium';
    let alertColor = "var(--warning)";
    let aiMessage = "Có vẻ bạn đang hơi căng thẳng. Hãy nghỉ ngơi một chút nhé.";

    if(riskLevel === 'high') {
        alertColor = "#FF6961";
        aiMessage = "Mức độ lo âu CAO. Chúng tôi khuyến nghị bạn đặt lịch tham vấn ngay.";
    } else if (riskLevel === 'low') {
        alertColor = "var(--success)";
        aiMessage = "Trạng thái cảm xúc ổn định. Hãy duy trì nhé!";
    }

    const days = [
        { d: 'T2', value: 45, label: 'Bình thường', tone: 'neutral' },
        { d: 'T3', value: 70, label: 'Tốt', tone: 'rose' },
        { d: 'T4', value: 50, label: 'Bình thường', tone: 'neutral' },
        { d: 'T5', value: riskLevel === 'high' ? 38 : 85, label: riskLevel === 'high' ? 'Căng thẳng' : 'Tuyệt vời', tone: riskLevel === 'high' ? 'danger' : 'amber' },
        { d: 'T6', value: 30, label: 'Chưa ghi', future: true },
        { d: 'T7', value: 30, label: 'Chưa ghi', future: true },
        { d: 'CN', value: 30, label: 'Chưa ghi', future: true }
    ];

    const barsHtml = days.map(day => `
        <div class="mc-chart-day">
            <div class="mc-chart-track">
                <div class="mc-chart-bar ${day.future ? 'future' : `tone-${day.tone}`}" style="height:${day.value}%" title="${escapeHtml(day.label)}"></div>
            </div>
            <span>${day.d}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Tuần này</p>
                <h1>Thống kê <span>Cảm xúc</span></h1>
                <p>Theo dõi nhịp cảm xúc của bạn theo thời gian.</p>
            </div>

            <div class="mc-panel mc-stats-chart">
                <div class="mc-chart-header">
                    <div>
                        <h3>Cảm xúc 7 ngày qua</h3>
                        <p>Điểm trung bình: <strong>${riskLevel === 'high' ? '48' : '62'} / 100</strong></p>
                    </div>
                    <span class="mc-trend-pill">${riskLevel === 'high' ? 'Cần nghỉ ngơi' : '+12% so với tuần trước'}</span>
                </div>
                <div class="mc-chart-grid">${barsHtml}</div>
                <p class="mc-chart-note">T5 (Hôm nay) - ${riskLevel === 'high' ? 'nên ưu tiên chăm sóc bản thân' : 'cảm xúc tích cực nhất tuần'}</p>
            </div>

            <div class="mc-insight-grid">
                <div class="mc-panel mc-insight-card" style="border-left-color:${alertColor};">
                    <div class="mc-insight-icon">AI</div>
                    <div>
                        <h3>Tổng quan</h3>
                        <p>${escapeHtml(aiMessage)}</p>
                    </div>
                </div>

                <div class="mc-panel mc-insight-card" style="border-left-color:#d32f2f;">
                    <div class="mc-insight-icon muted">!</div>
                    <div>
                        <h3>Cảnh báo gần nhất</h3>
                        <p>${
                            latestAlert
                                ? `${escapeHtml(latestAlert.label)} từ ${escapeHtml(latestAlert.source)}. Trạng thái: đã gửi ẩn danh đến tổ tham vấn.`
                                : 'Chưa có cảnh báo mới. Nếu cần hỗ trợ, bạn vẫn có thể đặt lịch tham vấn bất cứ lúc nào.'
                        }</p>
                    </div>
                </div>
            </div>

            <div class="mc-action-grid">
                <button class="mc-btn mc-btn-outline" type="button" onclick="renderResources()">Xem Tài nguyên</button>
                <button class="mc-btn mc-btn-outline" type="button" onclick="openFeedbackModal({ source_type: 'feedback' })">Gửi feedback</button>
                ${riskLevel !== 'low' ? `<button class="mc-btn mc-btn-primary" type="button" onclick="openBookingModal()">Đặt lịch ngay</button>` : ''}
            </div>
        </section>
    `;
}

function getCurrentProfileNames(profile = getStudentProfile()) {
    const session = getStudentSession();
    return new Set([
        'Tôi',
        currentUser.name,
        session?.name,
        session?.user?.name,
        profile.name,
        profile.displayName
    ].filter(Boolean));
}

function isOwnedFeedPost(post) {
    const profile = getStudentProfile();
    if (post?.owner_email && profile.email) {
        return String(post.owner_email).toLowerCase() === String(profile.email).toLowerCase();
    }

    const names = getCurrentProfileNames(profile);
    return Boolean(post?.isUser && names.has(post.author));
}

function syncAuthProfileName(displayName) {
    const session = getAuthSession();
    if (!session) return;

    const nextSession = { ...session };
    if ('name' in nextSession) nextSession.name = displayName;
    if (nextSession.user) nextSession.user = { ...nextSession.user, name: displayName };

    localStorage.setItem('mindconnect:auth', JSON.stringify(nextSession));
}

function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedAvatarTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedAvatarTypes.includes(file.type)) {
        alert('Vui lòng chọn ảnh PNG, JPG, WebP hoặc GIF để làm avatar.');
        return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
        alert('Avatar nên nhỏ hơn 1.5MB để trình duyệt lưu ổn định.');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const preview = document.getElementById('profile-avatar-preview');
        if (!preview) return;
        preview.src = reader.result;
        preview.dataset.avatarUrl = reader.result;
    };
    reader.readAsDataURL(file);
}

function saveProfileSettings() {
    const previousProfile = getStudentProfile();
    const previousNames = getCurrentProfileNames(previousProfile);
    const nameInput = document.getElementById('profile-display-name');
    const bioInput = document.getElementById('profile-bio');
    const avatarPreview = document.getElementById('profile-avatar-preview');
    const nextName = nameInput?.value.trim() || '';

    if (nextName.length < 2) {
        alert('Tên hiển thị cần có ít nhất 2 ký tự.');
        return;
    }

    const updatedProfile = {
        name: nextName,
        email: previousProfile.email,
        avatarUrl: avatarPreview?.dataset.avatarUrl || avatarPreview?.getAttribute('src') || previousProfile.avatarUrl || 'logo.png',
        bio: bioInput?.value.trim() || ''
    };

    saveStudentProfile(updatedProfile);
    syncAuthProfileName(updatedProfile.name);
    currentUser.name = updatedProfile.name;
    currentUser.email = updatedProfile.email || currentUser.email;

    userFeed = userFeed.map(post => {
        const ownsPost = isOwnedFeedPost(post) || previousNames.has(post.author);
        const nextPost = { ...post };

        if (ownsPost) {
            nextPost.author = updatedProfile.name;
            nextPost.author_avatar = updatedProfile.avatarUrl;
            nextPost.owner_email = updatedProfile.email;
            nextPost.isUser = true;
        }

        if (Array.isArray(nextPost.commentObjects)) {
            nextPost.commentObjects = nextPost.commentObjects.map(comment => {
                const ownsComment = comment?.isUser || previousNames.has(comment?.author) || (
                    comment?.owner_email &&
                    updatedProfile.email &&
                    String(comment.owner_email).toLowerCase() === String(updatedProfile.email).toLowerCase()
                );
                return ownsComment
                    ? {
                        ...comment,
                        author: updatedProfile.name,
                        author_avatar: updatedProfile.avatarUrl,
                        owner_email: updatedProfile.email,
                        isUser: true
                    }
                    : comment;
            });
        }

        return nextPost;
    });
    savePublicFeed();

    updateStudentProfileBadge();
    showNotification('Đã cập nhật hồ sơ cá nhân.');
    renderProfile();
}

function renderProfile() {
    const container = document.getElementById('student-main-content');
    updateNav(-1);
    animateMainContentSwap();

    const profile = getStudentProfile();
    const avatarUrl = profile.avatarUrl || 'logo.png';

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Thông tin cá nhân</p>
                <h1>User <span>Profile</span></h1>
                <p>Đổi tên hiển thị, avatar và phần giới thiệu xuất hiện trên News feed.</p>
            </div>

            <div class="mc-panel mc-profile-panel">
                <div class="mc-profile-editor">
                    <div class="mc-profile-avatar-block">
                        <img
                            id="profile-avatar-preview"
                            src="${escapeHtml(avatarUrl)}"
                            data-avatar-url="${escapeHtml(avatarUrl)}"
                            alt="Avatar"
                            class="mc-profile-avatar"
                        >
                        <input id="profile-avatar-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onchange="handleAvatarUpload(event)">
                        <label class="mc-btn mc-btn-outline" for="profile-avatar-input">Upload avatar</label>
                    </div>

                    <div class="mc-profile-fields">
                        <label class="mc-field-label" for="profile-display-name">Tên hiển thị</label>
                        <input id="profile-display-name" type="text" class="mc-input" value="${escapeHtml(profile.displayName || profile.name)}" maxlength="40">

                        <label class="mc-field-label" for="profile-email">Email tài khoản</label>
                        <input id="profile-email" type="email" class="mc-input" value="${escapeHtml(profile.email || '')}" disabled>

                        <label class="mc-field-label" for="profile-bio">Giới thiệu ngắn</label>
                        <textarea id="profile-bio" class="mc-textarea mc-profile-bio" maxlength="220">${escapeHtml(profile.bio || '')}</textarea>

                        <div class="mc-action-grid mc-profile-actions">
                            <button class="mc-btn mc-btn-primary" type="button" onclick="saveProfileSettings()">Lưu hồ sơ</button>
                            <button class="mc-btn mc-btn-outline" type="button" onclick="openFeedbackModal({ source_type: 'app' })">Gửi feedback</button>
                            <button class="mc-btn mc-btn-outline" type="button" onclick="logout()">Đăng xuất</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function normalizeEmotionText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getEmotionScore(source) {
    const text = normalizeEmotionText(`${source.title || ''} ${source.content || ''} ${(source.tags || []).join(' ')}`);
    const negativeSignals = [
        ['tuyet vong', 24], ['tu hai', 28], ['khong muon song', 28], ['khung hoang', 22],
        ['burnout', 18], ['kiet suc', 18], ['mat ngu', 14], ['lo au', 16],
        ['cang thang', 15], ['stress', 15], ['ap luc', 14], ['so hai', 13],
        ['co don', 12], ['chan nan', 12], ['khoc', 10], ['deadline', 8], ['khong tot', 8]
    ];
    const positiveSignals = [
        ['binh yen', 16], ['nhe nhang', 14], ['on hon', 13], ['on dinh', 13],
        ['vui', 12], ['tot', 10], ['hy vong', 12], ['cam on', 10],
        ['thu gian', 10], ['nghi ngoi', 8], ['thanh cong', 8], ['duoc hon', 8]
    ];

    let score = Number.isFinite(Number(source.mood_score))
        ? Math.min(95, Math.max(12, Number(source.mood_score) * 18 + 8))
        : 58;

    negativeSignals.forEach(([signal, weight]) => {
        if (text.includes(signal)) score -= weight;
    });
    positiveSignals.forEach(([signal, weight]) => {
        if (text.includes(signal)) score += weight;
    });

    return Math.round(Math.min(96, Math.max(8, score)));
}

function getEmotionTone(score) {
    if (score < 40) return { tone: 'danger', label: 'Căng thẳng', color: '#d32f2f' };
    if (score < 60) return { tone: 'neutral', label: 'Dao động', color: '#f0a85f' };
    if (score < 78) return { tone: 'rose', label: 'Ổn định', color: 'var(--accent-pink)' };
    return { tone: 'amber', label: 'Tích cực', color: 'var(--success)' };
}

function getLocalDateKey(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekdayLabel(date) {
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
}

function getEmotionSourcesForCurrentUser() {
    const diarySources = getPrivateDiaryEntries().map(entry => ({
        id: entry.id,
        type: 'diary',
        title: entry.title || 'Nhật ký riêng tư',
        content: entry.content || '',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        mood_score: entry.mood_score,
        date: entry.date || new Date().toISOString()
    }));

    const postSources = userFeed
        .filter(isOwnedFeedPost)
        .map(post => ({
            id: post.id,
            type: 'post',
            title: 'Bài đăng Home',
            content: post.content || '',
            tags: Array.isArray(post.tags) ? post.tags : [],
            date: post.date || post.time || new Date().toISOString()
        }));

    return [...diarySources, ...postSources]
        .map(source => ({ ...source, score: getEmotionScore(source) }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function buildWeeklyEmotionStats(sources) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() - (6 - index));
        const key = getLocalDateKey(day);
        const daySources = sources.filter(source => getLocalDateKey(source.date) === key);
        const average = daySources.length
            ? Math.round(daySources.reduce((sum, source) => sum + source.score, 0) / daySources.length)
            : 0;
        const tone = getEmotionTone(average || 50);

        return {
            key,
            d: getWeekdayLabel(day),
            value: daySources.length ? average : 24,
            label: daySources.length ? tone.label : 'Chưa có dữ liệu',
            tone: tone.tone,
            empty: daySources.length === 0,
            count: daySources.length
        };
    });

    const filledDays = days.filter(day => !day.empty);
    const average = filledDays.length
        ? Math.round(filledDays.reduce((sum, day) => sum + day.value, 0) / filledDays.length)
        : 0;

    return { days, average, filledDays: filledDays.length };
}

function buildTodayEmotionInsight(sources) {
    const todayKey = getLocalDateKey(new Date());
    const todaySources = sources.filter(source => getLocalDateKey(source.date) === todayKey);
    const diaryCount = todaySources.filter(source => source.type === 'diary').length;
    const postCount = todaySources.filter(source => source.type === 'post').length;

    if (!todaySources.length) {
        return {
            sources: [],
            score: 0,
            tone: getEmotionTone(50),
            message: 'Hôm nay chưa có Diary hoặc bài đăng Home của bạn để AI phân tích. Khi bạn ghi nhật ký hoặc đăng bài, thống kê sẽ cập nhật theo đúng dữ liệu của bạn.',
            sourceSummary: '0 Diary, 0 bài đăng Home'
        };
    }

    const score = Math.round(todaySources.reduce((sum, source) => sum + source.score, 0) / todaySources.length);
    const tone = getEmotionTone(score);
    const message = score < 40
        ? 'Dữ liệu hôm nay cho thấy bạn đang chịu áp lực rõ rệt. Hãy ưu tiên nghỉ ngơi ngắn, giảm bớt việc phụ và cân nhắc đặt lịch tư vấn nếu cảm giác này kéo dài.'
        : score < 60
            ? 'Cảm xúc hôm nay có dao động. Bạn nên ghi thêm vài dòng Diary để gọi tên điều đang làm mình nặng lòng và chọn một việc nhỏ có thể hoàn thành ngay.'
            : score < 78
                ? 'Cảm xúc hôm nay khá ổn định. Hãy duy trì nhịp sinh hoạt hiện tại, nghỉ giữa các phiên học và tiếp tục theo dõi các tín hiệu căng thẳng.'
                : 'Cảm xúc hôm nay đang tích cực. Bạn có thể ghi lại điều đã giúp mình ổn hơn để dùng lại trong những ngày căng thẳng.';

    return {
        sources: todaySources,
        score,
        tone,
        message,
        sourceSummary: `${diaryCount} Diary, ${postCount} bài đăng Home`
    };
}

async function refreshTodayStatsAI(todaySources, fallbackInsight) {
    const insightBox = document.getElementById('today-ai-insight');
    if (!insightBox || !todaySources.length || !backendReady) return;

    const payload = todaySources.map(source => {
        const sourceName = source.type === 'diary' ? 'Diary riêng tư' : 'Bài đăng Home của user';
        return `${sourceName}: ${source.title}\nTags: ${(source.tags || []).join(', ')}\nText: ${source.content}`;
    }).join('\n\n').slice(0, 1500);

    try {
        const result = await apiRequest('/chat/support', {
            method: 'POST',
            body: JSON.stringify({
                message: `Bạn là AI phân tích cảm xúc cho MindConnect. Chỉ dựa trên dữ liệu hôm nay của chính người dùng dưới đây, không nhắc tới comment của người khác. Trả lời bằng tiếng Việt, 2-3 câu, đưa một lời khuyên cụ thể và nhẹ nhàng.\n\n${payload}`,
                history: []
            })
        });

        if (result?.reply && document.getElementById('today-ai-insight') === insightBox) {
            insightBox.textContent = result.reply;
        }
    } catch (error) {
        insightBox.textContent = `${fallbackInsight.message} Phần này đang dùng phân tích cục bộ vì backend AI chưa phản hồi.`;
    }
}

function renderStudentStats() {
    const container = document.getElementById('student-main-content');
    updateNav(3);
    animateMainContentSwap();

    const sources = getEmotionSourcesForCurrentUser();
    const weekly = buildWeeklyEmotionStats(sources);
    const todayInsight = buildTodayEmotionInsight(sources);
    const totalDiary = sources.filter(source => source.type === 'diary').length;
    const totalPosts = sources.filter(source => source.type === 'post').length;

    const barsHtml = weekly.days.map(day => `
        <div class="mc-chart-day">
            <div class="mc-chart-track">
                <div class="mc-chart-bar ${day.empty ? 'future' : `tone-${day.tone}`}" style="height:${day.value}%" title="${escapeHtml(day.label)}"></div>
            </div>
            <span>${day.d}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Tuần này</p>
                <h1>Thống kê <span>Cảm xúc</span></h1>
                <p>Chỉ dùng Diary riêng tư và bài đăng Home của chính bạn. Comment của người khác không được tính.</p>
            </div>

            <div class="mc-panel mc-stats-chart">
                <div class="mc-chart-header">
                    <div>
                        <h3>Cảm xúc 7 ngày qua</h3>
                        <p>Điểm trung bình: <strong>${weekly.average ? `${weekly.average} / 100` : 'Chưa có dữ liệu'}</strong></p>
                    </div>
                    <span class="mc-trend-pill">${weekly.filledDays}/7 ngày có dữ liệu thật</span>
                </div>
                <div class="mc-chart-grid">${barsHtml}</div>
                <p class="mc-chart-note">Nguồn: ${totalDiary} Diary riêng tư và ${totalPosts} bài đăng Home của bạn.</p>
            </div>

            <div class="mc-insight-grid">
                <div class="mc-panel mc-insight-card" style="border-left-color:${todayInsight.tone.color};">
                    <div class="mc-insight-icon">AI</div>
                    <div>
                        <h3>Phân tích AI hôm nay</h3>
                        <p id="today-ai-insight">${escapeHtml(todayInsight.message)}</p>
                    </div>
                </div>

                <div class="mc-panel mc-insight-card" style="border-left-color:#f0a85f;">
                    <div class="mc-insight-icon muted">i</div>
                    <div>
                        <h3>Nguồn dữ liệu</h3>
                        <p>${escapeHtml(todayInsight.sourceSummary)} trong ngày hiện tại. Stats không đọc comment của người khác và không lấy bài Diary đưa lên Home.</p>
                    </div>
                </div>
            </div>

            <div class="mc-action-grid">
                <button class="mc-btn mc-btn-outline" type="button" onclick="renderStudentDiary()">Ghi Diary</button>
                <button class="mc-btn mc-btn-outline" type="button" onclick="renderStudentHome()">Đăng Home</button>
                ${todayInsight.score && todayInsight.score < 45 ? `<button class="mc-btn mc-btn-primary" type="button" onclick="openBookingModal()">Đặt lịch tư vấn</button>` : ''}
            </div>
        </section>
    `;

    refreshTodayStatsAI(todayInsight.sources, todayInsight);
}

// ==============================================
// 7. CHATBOT (LOGIC CŨ ĐÃ KHÔI PHỤC)
// ==============================================
function renderChat() {
    const container = document.getElementById('student-main-content');
    updateNav(4);
    animateMainContentSwap();

    const suggestions = [
        'Mình đang căng thẳng vì deadline',
        'Gợi ý bài tập thở 5 phút',
        'Mình cần nói chuyện với ai đó'
    ];

    const messagesHtml = chatHistory.map(msg => `
        <div class="mc-message-row ${msg.sender === 'user' ? 'user' : 'ai'}">
            ${msg.sender === 'ai' ? '<div class="mc-ai-avatar">AI</div>' : ''}
            <div class="mc-message-bubble ${msg.sender === 'user' ? 'user' : 'ai'}">
                ${formatChatMessage(msg.text)}
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <section class="mc-page mc-chat-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Trò chuyện riêng tư</p>
                <h1>AI hỗ trợ <span>tâm lý</span></h1>
                <p>Tâm sự bằng lời của mình. AI sẽ lắng nghe, đưa lời khuyên và gợi ý tài nguyên phù hợp.</p>
            </div>

            <div class="mc-chat-panel">
                <div id="chat-box" class="chat-box mc-chat-box">
                    ${messagesHtml}
                </div>

                <div class="mc-chat-suggestions">
                    ${suggestions.map(s => `
                        <button type="button" data-suggestion="${escapeHtml(s)}" onclick="setChatSuggestion(this.dataset.suggestion)">
                            ${escapeHtml(s)}
                        </button>
                    `).join('')}
                </div>

                <div class="mc-chat-input-row">
                    <input type="text" id="chat-input" placeholder="Nhập tin nhắn..." onkeypress="handleEnter(event)">
                    <button class="mc-send-btn" type="button" aria-label="Gửi tin nhắn" onclick="sendMsg()">→</button>
                </div>
            </div>
        </section>
    `;
    setTimeout(() => {
        const box = document.getElementById('chat-box');
        if (box) box.scrollTop = box.scrollHeight;
    }, 0);
}

function handleEnter(e) { if (e.key === 'Enter') sendMsg(); }

async function sendMsg() {
    if (blockIfBackendNotReady()) return;

    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if(!txt) return;

    trackInteraction('chat', 'chat-support', {
        message_length: txt.length
    });

    chatHistory.push({ sender: 'user', text: txt });
    renderChat();
    const activeInput = document.getElementById('chat-input');
    if(activeInput) activeInput.focus();

    setTimeout(() => {
        const box = document.getElementById('chat-box');
        if (box) box.scrollTop = box.scrollHeight;
    }, 0);

    const chatBox = document.querySelector('.chat-box');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'ai-typing-indicator';
    typingDiv.style.display = 'flex';
    typingDiv.style.flexDirection = 'column';
    typingDiv.innerHTML = `
        <div class="typing-bubble">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    const riskAlert = createRiskAlert('Chat AI', txt);
    if(riskAlert && riskAlert.severity === 'critical') {
        showNotification("Đã gửi cảnh báo khẩn cấp ẩn danh.");
    } else if(riskAlert) {
        showNotification("Đã ghi nhận tín hiệu rủi ro ẩn danh.");
    }

    try {
        const aiResponse = riskAlert?.severity === 'critical'
            ? buildFallbackChatReply(txt, riskAlert)
            : await callChatBotAPI(txt);

        const indicator = document.getElementById('ai-typing-indicator');
        if (indicator) indicator.remove();

        chatHistory.push({ sender: 'ai', text: aiResponse });
        renderChat();
        setTimeout(() => {
            const box = document.getElementById('chat-box');
            if (box) box.scrollTop = box.scrollHeight;
        }, 0);
    } catch (error) {
        console.error('Chat API failed:', error);
        const indicator = document.getElementById('ai-typing-indicator');
        if (indicator) indicator.remove();

        chatHistory.push({
            sender: 'ai',
            text: buildChatConnectionErrorReply(error)
        });
        renderChat();
        setTimeout(() => {
            const box = document.getElementById('chat-box');
            if (box) box.scrollTop = box.scrollHeight;
        }, 0);
    }
}

// ==============================================
// 8. BOOKING MODAL (LOGIC CŨ ĐÃ KHÔI PHỤC)
// ==============================================
function openFeedbackModal(context = {}) {
    const existing = document.getElementById('student-feedback-modal');
    if (existing) existing.remove();

    const beforeScore = Number(context.before_mood_score || currentMoodScore || 3);
    const afterScore = Number(context.after_mood_score || currentMoodScore || 3);
    const modal = document.createElement('div');
    modal.id = 'student-feedback-modal';
    modal.className = 'modal-overlay';
    modal.dataset.sourceType = context.source_type || 'feedback';
    modal.dataset.bookingId = context.booking_id || '';
    modal.onclick = function(e) { if (e.target === modal) closeFeedbackModal(); };

    modal.innerHTML = `
        <div class="modal-content" style="max-height: 90vh; overflow:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom: 16px;">
                <div>
                    <h3 style="color: var(--deep-rose); font-family: var(--font-heading); margin:0;">Gửi feedback ẩn danh</h3>
                    <p style="margin:4px 0 0; color:#666; font-size:13px;">Nhà trường sẽ dùng phản hồi này để đo hiệu quả hỗ trợ.</p>
                </div>
                <button type="button" onclick="closeFeedbackModal()" aria-label="Đóng" style="font-size: 24px; cursor:pointer; color: #999; border:0; background:transparent;">&times;</button>
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

            <button class="mc-btn mc-btn-primary" style="width:100%; margin-top:18px;" type="button" onclick="submitStudentFeedback()">Gửi phản hồi</button>
        </div>
    `;
    document.querySelector('.mobile-frame')?.appendChild(modal);
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
    const beforeScore = Number(document.getElementById('feedback-before')?.value || currentMoodScore);
    const afterScore = Number(document.getElementById('feedback-after')?.value || currentMoodScore);

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
        currentMoodScore = afterScore || currentMoodScore;
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

function openBookingModal() {
    const modal = document.createElement('div');
    modal.id = 'booking-modal';
    modal.className = 'modal-overlay';
    
    modal.onclick = function(e) { if(e.target === modal) closeBookingModal(); }

    modal.innerHTML = `
        <div class="modal-content">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <h3 style="color: var(--deep-rose); font-family: var(--font-heading);">Đặt lịch tham vấn</h3>
                <span onclick="closeBookingModal()" style="font-size: 24px; cursor:pointer; color: #999;">&times;</span>
            </div>

            <div class="info-row"><span class="label">📞 Hotline hỗ trợ:</span><a href="tel:19001234" class="val" style="text-decoration:none;">1900.1234</a></div>
            <div class="info-row"><span class="label">📍 Địa điểm:</span><span class="val" style="font-size: 14px;">Phòng 102 - Khu B</span></div>

            <div style="margin-bottom: 15px;">
                <label style="display:block; font-size: 13px; margin-bottom: 5px; color:#666;">Chọn thời gian mong muốn:</label>
                <input type="datetime-local" id="booking-time" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size: 13px; margin-bottom: 5px; color:#666;">Ghi chú (Không bắt buộc):</label>
                <input type="text" id="booking-note" placeholder="Ví dụ: Mình muốn tư vấn về..." style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
            <button class="btn-primary" style="width:100%; padding: 12px;" onclick="handleConfirmBooking()">Xác nhận đặt lịch</button>
        </div>
    `;
    document.querySelector('.mobile-frame').appendChild(modal);
}

function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if(modal) modal.remove();
}

async function handleConfirmBooking() {
    if (blockIfBackendNotReady()) return;

    const requestedTime = document.getElementById('booking-time')?.value || null;
    const note = document.getElementById('booking-note')?.value || '';
    closeBookingModal();

    try {
        const booking = await apiRequest('/api/bookings', {
            method: 'POST',
            body: JSON.stringify({
                requested_time: requestedTime,
                note,
                location: getSupportLocation(),
                before_mood_score: currentMoodScore
            })
        });
        trackInteraction('booking', booking?.id || requestedTime || Date.now(), {
            requested_time: requestedTime,
            location: getSupportLocation(),
            before_mood_score: currentMoodScore
        });
    } catch (error) {
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
            location: getSupportLocation(),
            before_mood_score: currentMoodScore,
            excerpt: note || 'Sinh viên yêu cầu đặt lịch tham vấn.'
        };
        saveRiskAlerts([localBookingAlert, ...getRiskAlerts()]);
    }

    setTimeout(() => {
        alert("✅ Đã gửi yêu cầu thành công!\nCán bộ tham vấn sẽ liên hệ lại với bạn qua SĐT hoặc Email trong vòng 24h.\nSau buổi hỗ trợ, bạn có thể vào Profile để gửi feedback ẩn danh.");
    }, 300);
}
