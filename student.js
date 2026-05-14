// student.js - FULL VERSION (MERGED)

// --- 1. DỮ LIỆU & TRẠNG THÁI (STATE) ---
const defaultChatHistory = [
    { sender: 'ai', text: 'Chào bạn! Mình là AI của MindConnect. Mình có thể giúp gì cho bạn hôm nay?' }
];

class Comment {
    constructor(id, author, date, content, likes = [0, 0, 0, 0, 0], replies = []) {
        this.id = id;
        this.author = author;
        this.date = date;
        this.content = content;
        this.likes = likes;
        this.isLiked = false;
        this.replies = replies;
    }
}

class FeedUser {
    constructor(id, author, date, content, tags = [], likes = [0, 0, 0, 0, 0], comments = 0, isUser = false) {
        this.id = id;
        this.author = author;
        this.date = date;
        this.content = content;
        this.tags = tags;
        this.likes = likes;
        this.isLiked = false;
        this.comments = comments;
        this.isUser = isUser;
        this.commentObjects = [];
    }
}

const defaultUserFeed = [
    { 
        id: 1, 
        author: 'Sleepyhead', 
        date: '2024-11-01T14:30:00Z', 
        content: 'Cảm thấy áp lực deadline quá... Có ai biết cách quản lý thời gian hiệu quả không?', 
        tags: ['Áp lực học tập', 'Cần lời khuyên'], 
        likes: [5, 3, 2, 1, 0], 
        comments: 2, 
        isUser: false,
            commentObjects: [
                new Comment(1, 'Corn Candy', '2024-11-01T15:00:00Z', 'Mình cũng đang gặp vấn đề tương tự. Mình thường chia nhỏ công việc ra và đặt deadline ảo cho từng phần.', [2, 0, 0, 0, 0]),
                new Comment(2, 'MindConnect AI', '2024-11-01T15:05:00Z', 'Bạn có thể thử phương pháp Pomodoro: làm việc 25 phút, nghỉ 5 phút. Sau 4 lần, nghỉ dài hơn. Mình cũng có thể gợi ý một số công cụ quản lý thời gian nếu bạn muốn!', [3, 0, 0, 0, 0])
            ]
    },
    { 
        id: 2,
        author: 'Iuriam', 
        date: '2025-12-22T09:15:00Z', 
        content: 'Hôm nay mình đã thử bài tập thở mà AI gợi ý, cảm giác khá ổn đấy! Ai muốn thử cùng mình không?',
        tags: ['Thở', 'Giảm stress'], 
        likes: [3, 1, 0, 0, 0], 
        comments: 1, 
        isUser: false,
        commentObjects: [
            new Comment(3, 'MindConnect AI', '2025-12-22T09:30:00Z', 'Chúc bạn có một ngày tốt lành!', [1, 0, 0, 0, 0])
        ]
    }
];

const resourcesDB = [
    { 
        type: 'Video', 
        title: 'Thiền 5 phút giảm lo âu', 
        duration: '5 phút',
        img: 'https://img.youtube.com/vi/inpok4MKVLM/mqdefault.jpg', 
        url: 'https://www.youtube.com/watch?v=inpok4MKVLM' 
    },
    { 
        type: 'Blog', 
        title: 'Cách vượt qua Burnout mùa thi', 
        duration: '7 phút đọc',
        img: 'https://suckhoedoisong.qltns.mediacdn.vn/thumb_w/640/324455921873985536/2023/4/26/cang-thang-truoc-ky-thi-16824842727412019885995.png', 
        url: '#' 
    },
    { 
        type: 'Book', 
        title: 'Hiểu về trái tim - Minh Niệm', 
        duration: '12 chương',
        img: 'https://tramsach.vn/wp-content/uploads/2024/11/gioi-thieu-sach.jpg', 
        url: 'https://thuvienhoasen.org/images/file/y5sBQGYE1QgQAHou/hieu-ve-trai-tim.pdf' },
    { 
        type: 'Podcast', 
        title: 'Radio Cảm Xúc #12 - Chữa lành', 
        duration: '32 phút',
        img: 'https://i.scdn.co/image/ab67656300005f1ff6bed7462a8b94b0fb452114', 
        url: 'https://open.spotify.com/episode/63VvDWyELyutySrZSRU1Hq' },
    { 
        type: 'Công cụ', 
        title: 'Bài tập thở giảm Stress', 
        duration: '4 bài tập',
        img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlg1wCwbYTPH8TCqBnzGjRLEhlmNuhdWy44A&s', 
        action: 'renderBreathingSpace'
    },
    {
        type: 'Công cụ',
        title: 'Quản lý thời gian Pomodoro',
        duration: 'App',
        img: 'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=800&q=80',
        url: '#'
    }
];

const RISK_ALERTS_KEY = 'mindconnect:risk-alerts';
const API_BASE_URL = 'http://localhost:3000';
const CHAT_API_URL = `${API_BASE_URL}/chat/support`;

let chatHistory = defaultChatHistory;
let userFeed = defaultUserFeed;
let currentResource = resourcesDB;
let backendReady = false;

function setBackendReadyState(isReady) {
    backendReady = isReady;
}

function relativeTimeFrom(dateInput) {
    const date = new Date(dateInput);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng trước`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

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
    if (backendReady) return false;
    setTimeout(() => showNotification('⏳ Backend chưa sẵn sàng, vui lòng chỉ xem giao diện.'), 1000 );
    return true;
}

function logout() {
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

function updateNav(idx) {
    // 0:Home, 1:Diary, 2:Resources, 3:Stats, 4:Chat
    document.querySelectorAll('.nav-icon').forEach((el, i) => {
        const navIndex = Number(el.dataset.navIndex ?? i);
        el.classList.toggle('active', navIndex === idx);
        el.classList.remove('nav-tab-bounce');
        if (navIndex === idx) {
            void el.offsetWidth;
            el.classList.add('nav-tab-bounce');
        }
    });
}

function animateMainContentSwap() {
    const container = document.getElementById('student-main-content');
    if (!container) return;

    container.classList.remove('content-fade-in');
    void container.offsetWidth;
    container.classList.add('content-fade-in');

    if (!document.getElementById('student-tab-animations')) {
        const style = document.createElement('style');
        style.id = 'student-tab-animations';
        style.textContent = `
            .content-fade-in { animation: contentFadeIn 0.5s ease-out; }
            .nav-tab-bounce { animation: navTabBounce 0.5s ease-out; }
            @keyframes contentFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes navTabBounce {
                0% { transform: scale(1); }
                50% { transform: scale(1.12); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

function getInitials(name) {
    return String(name || 'SV')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'SV';
}

function getFeedGradient(index) {
    const gradients = ['mc-avatar-rose', 'mc-avatar-coral', 'mc-avatar-amber', 'mc-avatar-slate'];
    return gradients[index % gradients.length];
}

function formatFeedTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? escapeHtml(value || '') : relativeTimeFrom(value);
}

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
        const diaries = await apiRequest('/api/feed');
        if (!Array.isArray(diaries) || diaries.length === 0) return;

        userFeed = diaries.map(diary => ({
            id: diary.id,
            author: diary.author_alias || 'Tôi',
            time: new Date(diary.created_at).toLocaleString('vi-VN'),
            content: formatDiaryContent(diary.title, diary.content),
            tags: diary.tags || [],
            likes: 0,
            comments: 0,
            isUser: true
        }));

        renderStudentHome();
        setBackendReadyState(true);
    } catch (error) {
        // Keep built-in demo feed when backend is unavailable.
        setBackendReadyState(true); // Temporarily allow user to interact with the interface in demo mode.
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
function renderStudentHome() {
    const container = document.getElementById('student-main-content');
    updateNav(0);
    animateMainContentSwap();

    const feedHtml = userFeed.map((post, index) => {
        const postDate = post.date || post.time;
        const comments = Array.isArray(post.commentObjects) ? post.commentObjects : [];
        const commentCount = comments.length || post.comments || 0;
        const postBody = post.isUser ? post.content : escapeHtml(post.content);

        const commentsHtml = comments.length > 0
            ? `
                <div class="mc-reply-list">
                    ${comments.map(c => `
                        <div class="mc-reply-card">
                            <div class="mc-reply-meta">
                                <strong>${escapeHtml(c.author)}</strong>
                                <span>${formatFeedTime(c.date)}</span>
                            </div>
                            <p>${escapeHtml(c.content)}</p>
                            <div style="margin-top: 8px; position: relative; display: inline-block;" class="mc-reaction-wrapper" onmouseenter="this.querySelector('.mc-reaction-popup').style.display='flex'" onmouseleave="this.querySelector('.mc-reaction-popup').style.display='none'">
                                <button type="button" aria-label="Thả tim" style="background: none; border: none; cursor: pointer; padding: 0; font-size: 16px; color: #666; transition: transform 0.2s;" onclick="this.classList.toggle('mc-liked'); const num = this.querySelector('.mc-like-count'); if(this.classList.contains('mc-liked')){ num.textContent = parseInt(num.textContent) + 1; this.style.color = 'var(--deep-rose)'; this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200); } else { num.textContent = parseInt(num.textContent) - 1; this.style.color = '#666'; this.querySelector('.mc-reaction-icon').textContent = '♥'; }"><span class="mc-reaction-icon">♥</span> <span class="mc-like-count">${Array.isArray(c.likes) ? c.likes.length : (c.likes || 0)}</span></button>
                                <div class="mc-reaction-popup" style="display: none; position: absolute; bottom: 100%; left: 0; background: white; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 5px 10px; gap: 10px; z-index: 10;">
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='👍'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">👍</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='❤️'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">❤️</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='😂'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">😂</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='😮'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">😮</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='😢'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">😢</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `
            : '';

        return `
            <article class="mc-feed-card">
                <div class="mc-feed-content">
                    <div class="mc-avatar ${getFeedGradient(index)}">${escapeHtml(getInitials(post.author))}</div>
                    <div class="mc-feed-main">
                        <div class="mc-feed-meta">
                            <h3>${escapeHtml(post.author)}</h3>
                            <span>${formatFeedTime(postDate)}</span>
                        </div>
                        <p class="mc-feed-text">${postBody}</p>

                        ${post.tags && post.tags.length > 0 ?
                            `<div class="mc-tag-row">${post.tags.map(t => `<span>#${escapeHtml(t)}</span>`).join('')}</div>`
                            : ''}

                        <div class="mc-feed-actions">
                            <div class="mc-reaction-wrapper" style="position: relative; display: inline-block;" onmouseenter="this.querySelector('.mc-reaction-popup').style.display='flex'" onmouseleave="this.querySelector('.mc-reaction-popup').style.display='none'">
                                <button type="button" aria-label="Thả tim" style="transition: transform 0.2s;" onclick="this.classList.toggle('mc-liked'); const num = this.querySelector('.mc-like-count'); if(this.classList.contains('mc-liked')){ num.textContent = parseInt(num.textContent) + 1; this.style.color = 'var(--deep-rose)'; this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200); } else { num.textContent = parseInt(num.textContent) - 1; this.style.color = ''; this.querySelector('.mc-reaction-icon').textContent = '♥'; }"><span class="mc-reaction-icon">♥</span> <span class="mc-like-count">${Array.isArray(post.likes) ? post.likes.length : (post.likes || 0)}</span></button>
                                <div class="mc-reaction-popup" style="display: none; position: absolute; bottom: 100%; left: 0; background: white; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 5px 10px; gap: 10px; z-index: 10;">
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='👍'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">👍</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='❤️'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">❤️</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='😂'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">😂</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='😮'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">😮</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" onclick="const btn=this.parentElement.previousElementSibling; btn.querySelector('.mc-reaction-icon').textContent='😢'; btn.style.color='var(--deep-rose)'; if(!btn.classList.contains('mc-liked')) { btn.classList.add('mc-liked'); btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1; } this.parentElement.style.display='none';">😢</span>
                                </div>
                            </div>
                            <button type="button" aria-label="Bình luận" onclick="const box = this.parentElement.nextElementSibling; box.style.display = box.style.display === 'none' ? 'block' : 'none';"><span>💬</span> ${commentCount}</button>
                            <button type="button" aria-label="Chia sẻ"><span>➦</span></button>
                        </div>
                        <div class="mc-comment-input-box" style="display: none; margin-top: 16px;">
                            <input type="text" class="mc-input" placeholder="Viết bình luận của bạn..." style="margin-bottom: 8px; padding: 10px 14px; font-size: 14px;">
                            <button type="button" class="mc-btn mc-btn-primary" style="min-height: 32px; padding: 6px 14px; font-size: 13px;" onclick="if(this.previousElementSibling.value) { const newComment = { id: Date.now().toString(), author: 'Current User', content: this.previousElementSibling.value, date: new Date().toISOString() }; if(!${JSON.stringify(post)}.comments) ${JSON.stringify(post)}.comments = []; ${JSON.stringify(post)}.comments.push(newComment); renderStudentHome(); }">Gửi bình luận</button>
                        </div>
                    </div>
                </div>
                ${commentsHtml}
            </article>
        `;
    }).join('');

    container.innerHTML = `
        <section class="mc-page mc-home-page">
            <div class="mc-page-header mc-page-header-row">
                <div>
                    <p class="mc-kicker">Cộng đồng</p>
                    <h1>News feed</h1>
                    <p>Chia sẻ ẩn danh, lắng nghe nhau.</p>
                </div>
                <button class="mc-btn mc-btn-outline" type="button" onclick="renderStudentDiary()">+ Viết Nhật ký</button>
            </div>
            <div class="mc-feed-list">
                ${feedHtml}
            </div>
        </section>
    `;
}

// ==============================================
// 4. DIARY (QUICK TEST + NOTION EDITOR + AI TAG)
// ==============================================
function renderStudentDiary() {
    const container = document.getElementById('student-main-content');
    updateNav(1);
    animateMainContentSwap();

    const moodItems = [
        { score: 5, label: 'Tuyệt vời', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.7-4.4-9.1-8.1C.8 9.6 2.5 5.3 6.2 5c2-.2 3.5.8 4.4 2.3C11.5 5.8 13 4.8 15 5c3.7.3 5.4 4.6 3.3 7.9C15.9 16.6 12 21 12 21Z"/></svg>', tone: 'rose' },
        { score: 4, label: 'Ổn', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.3 10.2a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7ZM15.7 10.2a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7Z"/><path d="M7.4 14.1c1 2.1 2.6 3.1 4.6 3.1s3.6-1 4.6-3.1c.3-.6-.1-1.3-.8-1.3H8.2c-.7 0-1.1.7-.8 1.3Z"/></svg>', tone: 'amber' },
        { score: 3, label: 'Bình thường', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 10.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6ZM15.8 10.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z"/><path d="M8 15.1h8c.6 0 1-.4 1-1s-.4-1-1-1H8c-.6 0-1 .4-1 1s.4 1 1 1Z"/></svg>', tone: 'stone' },
        { score: 2, label: 'Mệt mỏi', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.8 10.1 5.9 8.7c-.5-.4-.6-1-.2-1.4.4-.5 1-.6 1.5-.2l1.9 1.4c.5.4.6 1 .2 1.4-.4.5-1 .6-1.5.2ZM16.2 10.1l1.9-1.4c.5-.4.6-1 .2-1.4-.4-.5-1-.6-1.5-.2l-1.9 1.4c-.5.4-.6 1-.2 1.4.4.5 1 .6 1.5.2Z"/><path d="M8.2 16.6c1-1.3 2.2-1.9 3.8-1.9s2.8.6 3.8 1.9c.4.5 1.1.5 1.5.1.4-.4.4-1 0-1.5-1.4-1.7-3.2-2.6-5.3-2.6s-3.9.9-5.3 2.6c-.4.5-.4 1.1 0 1.5.4.4 1.1.4 1.5-.1Z"/></svg>', tone: 'slate' },
        { score: 1, label: 'Tệ', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c4.7 0 8.5 3.8 8.5 8.5s-3.8 8.5-8.5 8.5S3.5 16.7 3.5 12 7.3 3.5 12 3.5Zm-1.1 4.2.4 5.7c0 .4.3.7.7.7s.7-.3.7-.7l.4-5.7c0-.7-.5-1.2-1.1-1.2s-1.1.5-1.1 1.2ZM12 17.7a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7Z"/></svg>', tone: 'violet' }
    ];

    const recentHtml = userFeed.slice(0, 3).map((entry, index) => `
        <div class="mc-recent-entry">
            <div class="mc-recent-top">
                <span class="mc-recent-dot ${getFeedGradient(index)}">${escapeHtml(getInitials(entry.author))}</span>
                <strong>${formatFeedTime(entry.date || entry.time)}</strong>
            </div>
            <p>${escapeHtml(stripHtml(entry.content)).slice(0, 120)}${stripHtml(entry.content).length > 120 ? '...' : ''}</p>
        </div>
    `).join('');

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Nhật ký riêng tư</p>
                <h1>Hôm nay bạn thấy thế nào?</h1>
                <p>Chỉ bạn nhìn thấy. AI sẽ phân tích ẩn danh để gợi ý phù hợp.</p>
            </div>

            <div class="mc-diary-grid">
                <div class="mc-panel mc-diary-editor">
                    <div class="quick-test-section mc-mood-section">
                        <label class="mc-field-label">Cảm xúc hiện tại</label>
                        <div class="mc-mood-grid">
                            ${moodItems.map(item => `
                                <button class="mood-card ${item.score === 4 ? 'active' : ''}" type="button" onclick="selectMood(${item.score}, this)">
                                    <span class="mood-mark mood-${item.tone}">${item.icon}</span>
                                    <span>${item.label}</span>
                                </button>
                            `).join('')}
                        </div>
                        <div id="quick-test-msg" class="mc-mood-msg"></div>
                    </div>

                    <label class="mc-field-label" for="diary-title">Tiêu đề</label>
                    <input type="text" id="diary-title" class="notion-title mc-input" placeholder="Tiêu đề...">

                    <label class="mc-field-label" for="diary-content">Hôm nay của bạn</label>
                    <textarea id="diary-content" class="notion-body mc-textarea" placeholder="Viết những suy nghĩ của bạn, nhấn '/' để AI gợi ý..."></textarea>

                    <div id="ai-suggestion-area" class="ai-tag-box mc-ai-tag-box hidden">
                        <div class="mc-ai-tag-title">AI đề xuất Tag</div>
                        <div id="tag-container"></div>
                        <button class="mc-btn mc-btn-primary mc-full-width" type="button" onclick="confirmAndPost()">Xác nhận & Đăng</button>
                    </div>

                    <div class="mc-editor-actions" id="action-area">
                        <button class="mc-btn mc-btn-primary" type="button" onclick="analyzeDiary()">Phân tích AI</button>
                    </div>
                </div>

                <aside class="mc-panel mc-recent-panel">
                    <h3>Gần đây</h3>
                    <div class="mc-recent-list">${recentHtml || '<p class="mc-empty">Chưa có nhật ký nào.</p>'}</div>
                </aside>
            </div>
        </section>
    `;
}

function selectMood(score, elem) {
    document.querySelectorAll('.emoji-btn, .mood-card').forEach(e => e.classList.remove('active'));
    elem.classList.add('active');
    
    const msg = document.getElementById('quick-test-msg');
    if(score === 1) {
        createRiskAlert('Quick Test', 'Sinh viên chọn mức cảm xúc rất thấp trong Quick Test', {
            force: true,
            label: 'Cảnh báo cảm xúc rất thấp',
            severity: 'high',
            excerpt: 'Quick Test ghi nhận mức cảm xúc 1/5.'
        });
        msg.innerHTML = `Mình đã ghi nhận mức cảm xúc rất thấp và gửi cảnh báo ẩn danh cho tổ tham vấn. <u onclick="openBookingModal()" style="cursor:pointer; font-weight:bold;">Đặt lịch hỗ trợ</u>`;
    } else if(score <= 2) {
        msg.innerHTML = `Bạn ổn không? <u onclick="renderStudentStats()" style="cursor:pointer; font-weight:bold;">Xem thống kê</u> hoặc <u onclick="renderResources()" style="cursor:pointer; font-weight:bold;">nghe nhạc</u> nhé.`;
    } else {
        msg.innerHTML = "Đã ghi nhận! Cảm xúc chủ đạo: " + (score==5?"Rất tốt":(score==4?"Tốt":"Bình thường"));
    }
}

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
        throw new Error(result.error || 'Chat API request failed');
    }

    return result.data.reply;
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

async function analyzeDiary() {
    if (blockIfBackendNotReady()) return;

    const content = document.getElementById('diary-content').value;
    const title = document.getElementById('diary-title').value;
    if(content.length < 5) return alert("Hãy viết dài hơn một chút nhé!");

    const btn = document.querySelector('#action-area button');
    btn.innerText = "⏳ Đang đọc..."; 
    btn.disabled = true;

    try {
        let suggestedTags = [];

        try {
            const result = await apiRequest('/api/diaries/tags', {
                method: 'POST',
                body: JSON.stringify({ title, content })
            });
            suggestedTags = Array.isArray(result.tags) ? result.tags : [];
        } catch (error) {
            if(content.includes("thi") || content.includes("điểm") || content.includes("học")) suggestedTags.push("Học tập");
            if(content.includes("buồn") || content.includes("khóc")) suggestedTags.push("Lo âu");
            if(content.includes("bạn") || content.includes("cãi")) suggestedTags.push("Mối quan hệ");
        }

        const riskAlert = createRiskAlert('Diary', `${title} ${content}`, { diary_title: title || 'Không có tiêu đề' });
        if(riskAlert) suggestedTags.unshift(riskAlert.label);
        if(suggestedTags.length === 0) suggestedTags.push("Tâm sự");

        document.getElementById('action-area').classList.add('hidden');
        const tagBox = document.getElementById('ai-suggestion-area');
        tagBox.classList.remove('hidden');
        tagBox.dataset.riskAlertCreated = riskAlert ? 'true' : 'false';
        
        const tagContainer = document.getElementById('tag-container');
        tagContainer.innerHTML = suggestedTags.map(tag => 
            `<span class="tag-chip selected" onclick="toggleTag(this)">${tag}</span>`
        ).join('') + `<span class="tag-chip" onclick="toggleTag(this)">+ Khác</span>`;

        if(riskAlert) {
            tagBox.insertAdjacentHTML('afterbegin', renderCrisisSupportNotice(riskAlert));
            showNotification("Đã gửi cảnh báo ẩn danh đến tổ tham vấn.");
        }
    } catch (error) {
        alert("Không thể phân tích nhật ký lúc này. Bạn thử lại sau nhé.");
        btn.innerText = "✨ Phân tích AI";
        btn.disabled = false;
    }
}

function toggleTag(el) { el.classList.toggle('selected'); }

async function confirmAndPost() {
    if (blockIfBackendNotReady()) return;

    const title = document.getElementById('diary-title').value;
    const content = document.getElementById('diary-content').value;
    const finalTags = [];
    document.querySelectorAll('.tag-chip.selected').forEach(el => finalTags.push(el.innerText));
    const tagBox = document.getElementById('ai-suggestion-area');
    const riskAlert = tagBox?.dataset.riskAlertCreated === 'true'
        ? null
        : createRiskAlert('Diary Post', `${title} ${content}`, { diary_title: title || 'Không có tiêu đề' });

    userFeed.unshift({
        id: Date.now(),
        author: 'Tôi',
        time: 'Vừa xong',
        content: formatDiaryContent(title, content),
        tags: finalTags,
        likes: 0, comments: 0, isUser: true
    });

    try {
        await apiRequest('/api/diaries', {
            method: 'POST',
            body: JSON.stringify({
                title,
                content,
                tags: finalTags
            })
        });
    } catch (error) {
        // The local feed still reflects the diary in offline/demo mode.
    }

    alert(riskAlert || tagBox?.dataset.riskAlertCreated === 'true'
        ? "Đã lưu nhật ký và gửi cảnh báo ẩn danh cho tổ tham vấn."
        : "✅ Đã lưu nhật ký & Gửi dữ liệu ẩn danh về trường!");
    renderStudentHome();
}

// ==============================================
// 5. RESOURCES (TÀI NGUYÊN)
// ==============================================
function renderResources(filterType = 'Tất cả') {
    const container = document.getElementById('student-main-content');
    updateNav(2);
    animateMainContentSwap();

    const filteredDB = filterType === 'Tất cả' 
        ? resourcesDB 
        : resourcesDB.filter(res => res.type === filterType);

    const types = ['Tất cả', ...new Set(resourcesDB.map(r => r.type))];

    const filterHtml = types.map(t => `
        <button class="filter-btn ${t === filterType ? 'active' : ''}" type="button"
                onclick="renderResources('${t}')">${escapeHtml(t)}</button>
    `).join('');

    const cardsHtml = filteredDB.map(res => {
        const href = res.url || '#';
        const actionAttr = res.action
            ? `onclick="${res.action}(); return false;" href="#"`
            : `href="${escapeHtml(href)}" ${href === '#' ? '' : 'target="_blank" rel="noopener noreferrer"'}`;

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
                <p>Thiền, podcast, sách và công cụ được tuyển chọn để đồng hành cùng bạn.</p>
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


// ==============================================
// 6. STATS (THỐNG KÊ DYNAMIC)
// ==============================================
function renderStudentStats() {
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
                        <h3>Phân tích AI</h3>
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
                ${riskLevel !== 'low' ? `<button class="mc-btn mc-btn-primary" type="button" onclick="openBookingModal()">Đặt lịch ngay</button>` : ''}
            </div>
        </section>
    `;
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
        const indicator = document.getElementById('ai-typing-indicator');
        if (indicator) indicator.remove();

        chatHistory.push({
            sender: 'ai',
            text: buildFallbackChatReply(txt, riskAlert)
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
        await apiRequest('/api/bookings', {
            method: 'POST',
            body: JSON.stringify({
                requested_time: requestedTime,
                note
            })
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
            excerpt: note || 'Sinh viên yêu cầu đặt lịch tham vấn.'
        };
        saveRiskAlerts([localBookingAlert, ...getRiskAlerts()]);
    }

    setTimeout(() => {
        alert("✅ Đã gửi yêu cầu thành công!\nCán bộ tham vấn sẽ liên hệ lại với bạn qua SĐT hoặc Email trong vòng 24h.");
    }, 300);
}
