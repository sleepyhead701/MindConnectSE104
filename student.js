// student.js - FULL VERSION (MERGED)

// --- 1. DỮ LIỆU & TRẠNG THÁI (STATE) ---
const defaultChatHistory = [
    { sender: 'ai', text: 'Chào bạn! Mình là AI của MindConnect. Mình có thể giúp gì cho bạn hôm nay?' }
];

class Comment {
    constructor(id, author, date, content, likes = 0, replies = []) {
        this.id = id;
        this.author = author;
        this.date = date;
        this.content = content;
        this.likes = likes;
        this.replies = replies;
    }
}

class FeedUser {
    constructor(id, author, date, content, tags = [], likes = 0, comments = 0, isUser = false) {
        this.id = id;
        this.author = author;
        this.date = date;
        this.content = content;
        this.tags = tags;
        this.likes = likes;
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
        likes: 5, 
        comments: 2, 
        isUser: false,
            commentObjects: [
                new Comment(1, 'Corn Candy', '2024-11-01T15:00:00Z', 'Mình cũng đang gặp vấn đề tương tự. Mình thường chia nhỏ công việc ra và đặt deadline ảo cho từng phần.', 2),
                new Comment(2, 'MindConnect AI', '2024-11-01T15:05:00Z', 'Bạn có thể thử phương pháp Pomodoro: làm việc 25 phút, nghỉ 5 phút. Sau 4 lần, nghỉ dài hơn. Mình cũng có thể gợi ý một số công cụ quản lý thời gian nếu bạn muốn!', 3)
            ]
    },
    { 
        id: 2,
        author: 'Iuriam', 
        date: '2025-12-22T09:15:00Z', 
        content: 'Hôm nay mình đã thử bài tập thở mà AI gợi ý, cảm giác khá ổn đấy! Ai muốn thử cùng mình không?',
        tags: ['Thở', 'Giảm stress'], 
        likes: 3, 
        comments: 1, 
        isUser: false,
        commentObjects: [
            new Comment(3, 'MindConnect AI', '2025-12-22T09:30:00Z', 'Chúc bạn có một ngày tốt lành!', 1)
        ]
    }
];

const resourcesDB = [
    { 
        type: 'Video', 
        title: 'Thiền 5 phút giảm lo âu', 
        img: 'https://img.youtube.com/vi/inpok4MKVLM/mqdefault.jpg', 
        url: 'https://www.youtube.com/watch?v=inpok4MKVLM' 
    },
    { 
        type: 'Blog', 
        title: 'Cách vượt qua Burnout mùa thi', 
        img: 'https://suckhoedoisong.qltns.mediacdn.vn/thumb_w/640/324455921873985536/2023/4/26/cang-thang-truoc-ky-thi-16824842727412019885995.png', 
        url: '#' 
    },
    { 
        type: 'Book', 
        title: 'Hiểu về trái tim - Minh Niệm', 
        img: 'https://tramsach.vn/wp-content/uploads/2024/11/gioi-thieu-sach.jpg', 
        url: 'https://thuvienhoasen.org/images/file/y5sBQGYE1QgQAHou/hieu-ve-trai-tim.pdf' },
    { 
        type: 'Podcast', 
        title: 'Radio Cảm Xúc #12 - Chữa lành', 
        img: 'https://i.scdn.co/image/ab67656300005f1ff6bed7462a8b94b0fb452114', 
        url: 'https://open.spotify.com/episode/63VvDWyELyutySrZSRU1Hq' },
    { 
        type: 'Công cụ', 
        title: 'Bài tập thở giảm Stress', 
        img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlg1wCwbYTPH8TCqBnzGjRLEhlmNuhdWy44A&s', 
        action: 'renderBreathingSpace'
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
        el.classList.toggle('active', i === idx);
        el.classList.remove('nav-tab-bounce');
        if (i === idx) {
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

    let feedHtml = userFeed.map(post => {
        const postDate = post.date || post.time;
        const comments = Array.isArray(post.commentObjects) ? post.commentObjects : [];

        const commentsHtml = comments.length > 0
            ? `
                <div style="margin-top:12px; border-top:1px solid #f1f1f1; padding-top:10px;">
                    ${comments.map(c => `
                        <div style="background:#fafafa; border:1px solid #f0f0f0; border-radius:8px; padding:8px 10px; margin-bottom:8px;">
                            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;">
                                <strong style="font-size:12px; color: var(--deep-rose);">${escapeHtml(c.author)}</strong>
                                <span style="font-size:11px; color:#999;">${relativeTimeFrom(c.date)}</span>
                            </div>
                            <div style="font-size:13px; color:#333; line-height:1.45;">${escapeHtml(c.content)}</div>
                        </div>
                    `).join('')}
                </div>
            `
            : `<div style="margin-top:10px; font-size:12px; color:#999;">Chưa có bình luận nào.</div>`;

        return `
            <div class="feed-card">
                <div style="display:flex; justify-content:space-between; margin-bottom: 5px; margin-left: 5px;">
                    <div style="font-weight:700; font-size: 14px; color: var(--deep-rose);">${post.author}</div>
                    <div style="font-size: 12px; color:#999; margin-right: 5px;">${relativeTimeFrom(postDate)}</div>
                </div>
                <p style="font-size: 15px; line-height: 1.5; margin-bottom: 10px; margin-left: 5px; color: #1a1a1a;">${post.content}</p>
                
                ${post.tags && post.tags.length > 0 ? 
                    `<div style="margin-bottom:10px; margin-left: 5px;">${post.tags.map(t => `<span style="background:#f0f0f0; font-size:11px; padding:3px 8px; border-radius:4px; margin-right:5px; color:#666;">#${t}</span>`).join('')}</div>` 
                    : ''}

                <div style="display:flex; gap: 20px; font-size: 18px; color: #666;">
                    <span>❤️ <span style="font-size:13px;">${post.likes}</span></span>
                    <span>💬 <span style="font-size:13px;">${post.comments}</span></span>
                    <span>🚀</span>
                </div>

                ${commentsHtml}
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="padding: 0 20px;">
            <div style="display:flex; align-items:center; justify-content:space-between; padding: 15px 0; border-bottom:1px solid #eee;">
                <h1 style="font-size: var(--font-heading); font-size: 30px; color: var(--deep-rose); margin-bottom: 5px;">News feed</h1>
                <button class="btn-outline" style="font-size:12px; padding: 5px 10px;" onclick="renderStudentDiary()">+ Viết Nhật ký</button>
            </div>
            ${feedHtml}
        </div>
    `;
}

// ==============================================
// 4. DIARY (QUICK TEST + NOTION EDITOR + AI TAG)
// ==============================================
function renderStudentDiary() {
    const container = document.getElementById('student-main-content');
    updateNav(1);
    animateMainContentSwap();

    container.innerHTML = `
        <div style="padding: 20px;">
            <div class="quick-test-section">
                <h1 style="font-size: var(--font-heading); font-size: 30px; color: var(--deep-rose); margin-bottom: 5px;">Chào bạn!</h1>
                <h3 style="font-size: 16px; color: #666;">Hôm nay bạn cảm thấy thế nào?</h3>
                <div class="emoji-scale">
                    <div class="emoji-btn" onclick="selectMood(1, this)">😭</div>
                    <div class="emoji-btn" onclick="selectMood(2, this)">😔</div>
                    <div class="emoji-btn" onclick="selectMood(3, this)">😐</div>
                    <div class="emoji-btn" onclick="selectMood(4, this)">🙂</div>
                    <div class="emoji-btn" onclick="selectMood(5, this)">😁</div>
                </div>
                <div id="quick-test-msg" style="font-size:13px; color:var(--accent-pink); margin-top:10px; min-height:20px;"></div>
            </div>

            <h3 style="margin: 20px 0 10px 0; color: var(--deep-rose);">Nhật ký chuyên sâu</h3>
            <div class="notion-editor-container">
                <input type="text" id="diary-title" class="notion-title" placeholder="Tiêu đề...">
                <textarea id="diary-content" class="notion-body" placeholder="Viết những suy nghĩ của bạn, nhấn '/' để AI gợi ý..."></textarea>
                
                <div id="ai-suggestion-area" class="ai-tag-box hidden">
                    <div style="font-size:12px; font-weight:600; margin-bottom:5px;">🤖 AI đề xuất Tag:</div>
                    <div id="tag-container"></div>
                    <button class="btn-primary" style="width:100%; margin-top:10px; font-size:13px;" onclick="confirmAndPost()">Xác nhận & Đăng</button>
                </div>

                <div style="text-align:right; margin-top:16px;" id="action-area">
                    <button class="btn-primary" onclick="analyzeDiary()" style="font-size:16px;">✨ Phân tích AI</button>
                </div>
            </div>
        </div>
    `;
}

function selectMood(score, elem) {
    document.querySelectorAll('.emoji-btn').forEach(e => e.classList.remove('active'));
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

    // Lọc dữ liệu dựa trên tab được chọn
    const filteredDB = filterType === 'Tất cả' 
        ? resourcesDB 
        : resourcesDB.filter(res => res.type === filterType);

    const types = ['Tất cả', ...new Set(resourcesDB.map(r => r.type))];

    const filterHtml = types.map(t => `
        <button class="filter-btn ${t === filterType ? 'active' : ''}" 
                onclick="renderResources('${t}')">${t}</button>
    `).join('');

    const cardsHtml = filteredDB.map(res => {
        const actionAttr = res.action 
            ? `onclick="${res.action}(); return false;" href="#"` 
            : `href="${res.url}" target="_blank"`;

        return `
            <a ${actionAttr} class="res-link">
                <div class="res-card">
                    <div class="res-img-container" style="background-image: url('${res.img || 'https://via.placeholder.com/150'}')">
                        <span class="res-type-tag">${res.type}</span>
                    </div>
                    <div class="res-info">
                        <div class="res-title-main">${res.title}</div>
                        <div class="res-footer">Xem thêm →</div>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    container.innerHTML = `
        <div style="padding: 20px 0;">
            <h1 style="font-size: var(--font-heading); font-size: 30px; color: var(--deep-rose); margin-bottom: 5px;">Kho Tài nguyên</h1>
            <div class="filter-bar">${filterHtml}</div>
            <div class="resource-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
}

function renderBreathingSpace() {
    const container = document.getElementById('student-main-content');
    container.innerHTML = `
        <div style="text-align:center; padding: 40px;">
            <h1 style="font-size: var(--font-heading); font-size: 30px; color: var(--deep-rose); margin-bottom: 5px;">Bài tập thở giảm Stress</h1>
            <p id="breath-text" style="color: #666; height: 30px;">Chuẩn bị...</p>
            <div id="breath-circle" class="breathing-circle"></div>
            <button class="btn-primary" onclick="startBreathing()">Bắt đầu</button>
        </div>
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
    let barColor = "var(--warning)";

    if(riskLevel === 'high') {
        alertColor = "#FF6961";
        aiMessage = "Mức độ lo âu CAO. Chúng tôi khuyến nghị bạn đặt lịch tham vấn ngay.";
        barColor = "var(--deep-rose)";
    } else if (riskLevel === 'low') {
        alertColor = "var(--success)";
        aiMessage = "Trạng thái cảm xúc ổn định. Hãy duy trì nhé!";
        barColor = "var(--success)";
    }

    container.innerHTML = `
        <div style="padding: 20px;">
            <h1 style="font-size: var(--font-heading); font-size: 30px; color: var(--deep-rose); margin-bottom: 5px;">Thống kê Cảm xúc</h2>
            
            <div style="display:flex; align-items:flex-end; justify-content:space-between; height: 150px; padding: 0 10px 10px 10px; border-bottom: 1px solid #ccc;">
                <div style="width:30px; height:40%; background: #ddd; border-radius: 4px;"></div>
                <div style="width:30px; height:60%; background: var(--accent-pink); border-radius: 4px;"></div>
                <div style="width:30px; height:30%; background: #ddd; border-radius: 4px;"></div>
                <div style="width:30px; height:80%; background: ${barColor}; border-radius: 4px;"></div>
                <div style="width:30px; height:20%; background: #eee; border-radius: 4px; border:1px dashed #999;"></div>
            </div>
            <p style="text-align:center; font-size: 12px; color: #888; margin-top: 5px;">T2 - T3 - T4 - T5 (Hôm nay)</p>

            <div class="feed-card" style="margin: 20px 0; border-left: 4px solid ${alertColor};">
                <h4 style="display:flex; align-items:center; gap:5px;">🤖 Phân tích AI</h4>
                <p style="font-size: 13px; margin-top: 5px;">${aiMessage}</p>
            </div>

            ${latestAlert ? `
                <div class="feed-card" style="margin: 20px 0; border-left: 4px solid #d32f2f;">
                    <h4>Cảnh báo gần nhất</h4>
                    <p style="font-size: 13px; margin-top: 5px;">
                        ${latestAlert.label} từ ${latestAlert.source}. Trạng thái: đã gửi ẩn danh đến tổ tham vấn.
                    </p>
                </div>
            ` : ''}

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button class="btn-outline" onclick="renderResources()" style="font-size:13px;">📺 Xem Tài nguyên</button>
                ${riskLevel !== 'low' ? `<button class="btn-primary" onclick="openBookingModal()" style="font-size:13px;">📅 Đặt lịch ngay</button>` : ''}
            </div>
        </div>
    `;
}

// ==============================================
// 7. CHATBOT (LOGIC CŨ ĐÃ KHÔI PHỤC)
// ==============================================
function renderChat() {
    const container = document.getElementById('student-main-content');
    updateNav(4);
    animateMainContentSwap();

    container.innerHTML = `
        <div class="chat-container" style="display:flex; flex-direction:column; height: 80vh;">
            <div style="padding: 0 20px 12px; border-bottom: 1px solid #eee;">
                <h1 style="font-size: var(--font-heading); font-size: 30px; color: var(--deep-rose); margin-bottom: 5px;">AI hỗ trợ tâm lý</h1>
                <p style="font-size: 13px; color: #666;">Bạn có thể tâm sự bằng lời của mình. AI sẽ lắng nghe, đưa lời khuyên và gợi ý tài nguyên phù hợp.</p>
            </div>
            <div id="chat-box" class="chat-box" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:15px;">
                ${chatHistory.map(msg => `
                    <div style="align-self: ${msg.sender === 'user' ? 'flex-end' : 'flex-start'}; max-width: 80%;">
                        <div style="
                            background: ${msg.sender === 'ai' ? 'var(--primary-pink)' : '#f3f3f3'};
                            color: #333;
                            padding: 12px 16px;
                            border-radius: 15px;
                            border-bottom-${msg.sender === 'ai' ? 'right' : 'left'}-radius: 4px;
                            font-size: 15px;
                            line-height: 1.5;
                        ">
                            ${formatChatMessage(msg.text)}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="padding: 15px; background: white; border-top: 1px solid #eee; display:flex; gap: 10px;">
                <input type="text" id="chat-input" placeholder="Nhập tin nhắn..." style="margin:0;" onkeypress="handleEnter(event)">
                <button class="btn-primary" style="border-radius: 50%; width: 45px; height: 45px; display:flex; justify-content:center; align-items:center; flex-shrink: 0;" onclick="sendMsg()">➤</button>
            </div>
        </div>
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
