const API_BASE = "http://localhost:5000/api";
const defaultChatHistory = [{ sender: "ai", text: "Chào bạn! Mình là AI của MindConnect. Mình có thể giúp gì cho bạn hôm nay?" }];
const defaultUserFeed = [
    { 
        id: 1, 
        author: 'Sleepyhead', 
        date: '2024-11-01T14:30:00Z', 
        content: 'Cảm thấy áp lực deadline quá... Có ai biết cách quản lý thời gian hiệu quả không?', 
        tags: ['Áp lực học tập', 'Cần lời khuyên'], 
        likes: 5, 
        comments: 2, 
        isUser: false 
    },
    { 
        id: 2,
        author: 'Iuriam', 
        date: '2025-12-22T09:15:00Z', 
        content: 'Hôm nay mình đã thử bài tập thở mà AI gợi ý, cảm giác khá ổn đấy! Ai muốn thử cùng mình không?',
        tags: ['Thở', 'Giảm stress'], 
        likes: 3, 
        comments: 1, 
        isUser: false 
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

let chatHistory = defaultChatHistory;
let userFeed = defaultUserFeed;
let currentResource = resourcesDB;
let backendReady = false;

function setBackendReadyState(isReady) {
    backendReady = isReady;
}

async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options
    });
    if (!res.ok) throw new Error(`API failed: ${path}`);
    return res.json();
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

window.onload = async function () {
    setBackendReadyState(false);
    showLoadingScreen();
    try {
        await api("/seed", { method: "POST" });
        userFeed = await api("/feed");
        chatHistory = await api("/chat");
        currentResources = await api("/resources");
        setBackendReadyState(true);
    } catch (error) {
        console.warn("Backend unavailable, fallback to local mode:", error.message);
    }
    hideLoadingScreen();
    renderStudentHome();
    setTimeout(() => showNotification("📅 Đừng quên làm Quick Test cảm xúc hôm nay bạn nhé!"), 1000);
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
    document.querySelectorAll('.nav-icon').forEach((el, i) => el.classList.toggle('active', i === idx));
}

function blockIfBackendNotReady() {
    if (backendReady) return false;
    setTimeout(() => showNotification('⏳ Backend chưa sẵn sàng, vui lòng chỉ xem giao diện.'), 1000 );
    return true;
}

// ==============================================
// 3. HOME (GIAO DIỆN LAI THREADS)
// ==============================================
function renderStudentHome() {
    const container = document.getElementById('student-main-content');
    updateNav(0);

    let feedHtml = userFeed.map(post => `
        <div class="feed-card">
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px; margin-left: 5px;">
                <div style="font-weight:700; font-size: 14px; color: var(--deep-rose);">${post.author}</div>
                <div style="font-size: 12px; color:#999; margin-right: 5px;">${relativeTimeFrom(post.date)}</div>
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
        </div>
    `).join('');

    container.innerHTML = `
        <div style="padding: 0 20px;">
            <div style="display:flex; align-items:center; justify-content:space-between; padding: 15px 0; border-bottom:1px solid #eee;">
                <h2 style="font-family: var(--font-heading); font-size: 28px;">News feed</h2>
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

    container.innerHTML = `
        <div style="padding: 20px;">
            <div class="quick-test-section">
                <h3 style="font-size: 16px; color: #666;">Hôm nay bạn cảm thấy thế nào?</h3>
                <div class="emoji-scale">
                    <div class="emoji-btn" onclick="selectMood(1, this)">😭</div>
                    <div class="emoji-btn" onclick="selectMood(2, this)">😔</div>
                    <div class="emoji-btn" onclick="selectMood(3, this)">😐</div>
                    <div class="emoji-btn" onclick="selectMood(4, this)">🙂</div>
                    <div class="emoji-btn" onclick="selectMood(5, this)">😁</div>
                </div>
                <div id="quick-test-msg" style="font-size:12px; color:var(--accent-pink); margin-top:10px; min-height:20px;"></div>
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

                <div style="text-align:right; margin-top:10px;" id="action-area">
                    <button class="btn-primary" onclick="analyzeDiary()">✨ Phân tích AI</button>
                </div>
            </div>
        </div>
    `;
}

function selectMood(score, elem) {
    document.querySelectorAll('.emoji-btn').forEach(e => e.classList.remove('active'));
    elem.classList.add('active');
    
    const msg = document.getElementById('quick-test-msg');
    if(score <= 2) {
        msg.innerHTML = `Bạn ổn không? <u onclick="renderStudentStats()" style="cursor:pointer; font-weight:bold;">Xem thống kê</u> hoặc <u onclick="renderResources()" style="cursor:pointer; font-weight:bold;">nghe nhạc</u> nhé.`;
    } else {
        msg.innerHTML = "Đã ghi nhận! Cảm xúc chủ đạo: " + (score==5?"Rất tốt":(score==4?"Tốt":"Bình thường"));
    }
}

async function analyzeDiary() {
    if (blockIfBackendNotReady()) return;
    const content = document.getElementById("diary-content").value;
    if (content.length < 5) return alert("Hãy viết dài hơn một chút nhé!");
    const btn = document.querySelector("#action-area button");
    btn.innerText = "⏳ Đang đọc...";
    btn.disabled = true;

    let suggestedTags = ["Tâm sự", "Suy nghĩ"];
    try {
        const data = await api("/diary/analyze", { method: "POST", body: JSON.stringify({ content }) });
        suggestedTags = data.tags || suggestedTags;
    } catch (_) {}

    document.getElementById("action-area").classList.add("hidden");
    const tagBox = document.getElementById("ai-suggestion-area");
    tagBox.classList.remove("hidden");
    const tagContainer = document.getElementById("tag-container");
    tagContainer.innerHTML = suggestedTags.map((tag) => `<span class="tag-chip selected" onclick="toggleTag(this)">${tag}</span>`).join("") + `<span class="tag-chip" onclick="toggleTag(this)">+ Khác</span>`;
}

function toggleTag(el) { el.classList.toggle('selected'); }

function confirmAndPost() {
    if (blockIfBackendNotReady()) return;
    const title = document.getElementById('diary-title').value;
    const content = document.getElementById('diary-content').value;
    const finalTags = [];
    document.querySelectorAll('.tag-chip.selected').forEach(el => finalTags.push(el.innerText));

    userFeed.unshift({
        id: Date.now(),
        author: 'Tôi',
        time: 'Vừa xong',
        content: `<strong>${title}</strong><br>${content}`,
        tags: finalTags,
        likes: 0, comments: 0, isUser: true
    });

    alert("✅ Đã lưu nhật ký & Gửi dữ liệu ẩn danh về trường!");
    renderStudentHome();
}

// ==============================================
// 5. RESOURCES (TÀI NGUYÊN)
// ==============================================
function renderResources(filterType = 'Tất cả') {
    const container = document.getElementById('student-main-content');
    updateNav(2);

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
            <h2 style="font-family: var(--font-heading); font-size: 32px; margin-bottom: 10px;">Kho Tài nguyên</h2>
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
            <h2 style="font-family: var(--font-heading);">Bài tập thở giảm Stress</h2>
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

    // Logic cũ: Risk Level
    const riskLevel = 'medium'; // Bạn đổi thành 'low' hoặc 'high' để test
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
            <h2 style="color: var(--deep-rose); margin-bottom: 20px;">Thống kê Cảm xúc</h2>
            
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
    
    let msgsHtml = chatHistory.map(msg => 
        `<div class="msg ${msg.sender === 'ai' ? 'msg-ai' : 'msg-user'}">${msg.text}</div>`
    ).join('');
    
    container.innerHTML = `
        <div class="chat-container" style="display:flex; flex-direction:column; height: 80vh;">
            <div class="chat-box" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:15px;">
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
                            ${msg.text}
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
        if(box) box.scrollTop = box.scrollHeight; 
    }, 50);
}

function handleEnter(e) { if (e.key === 'Enter') sendMsg(); }

async function sendMsg() {
    if (blockIfBackendNotReady()) return;
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if(!txt) return;

    chatHistory.push({ sender: 'user', text: txt });
    renderChat();
    input.value = '';
    input.focus();

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

    // ------------------------------------------
    // Uncomment phần này nếu đã có API chatbot
    // -----------------------------------------
    // try {
    //     const aiResponse = await callChatBotAPI(txt);
        
    //     // 4. Xóa hiệu ứng Typing và cập nhật tin nhắn thật của AI
    //     const indicator = document.getElementById('ai-typing-indicator');
    //     if (indicator) indicator.remove();

    //     chatHistory.push({ sender: 'ai', text: aiResponse });
    //     renderChat();
        
    //     if (typeof saveData === "function") saveData();
    // } catch (error) {
    //     document.getElementById('ai-typing-indicator').remove();
    //     chatHistory.push({ sender: 'ai', text: "Lỗi kết nối rồi, bạn thử lại nhé!" });
    //     renderChat();
    // }

    // Logic phân tích từ khóa (Đã khôi phục)
    setTimeout(() => {
        let aiRes = "";
        const lowerTxt = txt.toLowerCase();
        if(lowerTxt.includes("buồn") || lowerTxt.includes("khóc") || lowerTxt.includes("mệt") || lowerTxt.includes("stress")) {
            aiRes = "Mình cảm nhận được bạn đang có tâm trạng không tốt. Bạn có muốn thực hiện bài kiểm tra nhanh hoặc nghe nhạc thư giãn không?";
        } else if (lowerTxt.includes("chết") || lowerTxt.includes("tự tử") || lowerTxt.includes("kết thúc")) {
            aiRes = "⚠️ CẢNH BÁO: Mình rất lo lắng cho bạn. Xin hãy bình tĩnh. Mình sẽ kết nối bạn với chuyên gia tâm lý ngay lập tức. Hotline: 1900.1267";
        } else {
            aiRes = "Cảm ơn bạn đã chia sẻ. Mình luôn ở đây lắng nghe bạn. Hãy kể thêm nhé.";
        }
        chatHistory.push({ sender: 'ai', text: aiRes });
        renderChat();
    }, 1500);
}

// ==============================================
// 8. BOOKING MODAL (LOGIC CŨ ĐÃ KHÔI PHỤC)
// ==============================================
function openBookingModal() {
    if (blockIfBackendNotReady()) return;
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
                <input type="datetime-local" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size: 13px; margin-bottom: 5px; color:#666;">Ghi chú (Không bắt buộc):</label>
                <input type="text" placeholder="Ví dụ: Mình muốn tư vấn về..." style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
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

function handleConfirmBooking() {
    if (blockIfBackendNotReady()) return;
    closeBookingModal();
    setTimeout(() => {
        alert("✅ Đã gửi yêu cầu thành công!\nCán bộ tham vấn sẽ liên hệ lại với bạn qua SĐT hoặc Email trong vòng 24h.");
    }, 300);
}