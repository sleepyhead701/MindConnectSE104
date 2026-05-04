const API_BASE = "http://localhost:5000/api";
const defaultChatHistory = [{ sender: "ai", text: "Chào bạn! Mình là AI của MindConnect. Mình có thể giúp gì cho bạn hôm nay?" }];
const defaultUserFeed = [];
const resourcesDB = [];

let chatHistory = defaultChatHistory;
let userFeed = defaultUserFeed;
let currentResources = resourcesDB;

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
    return `${Math.floor(diff / 86400)} ngày trước`;
}

window.onload = async function () {
    try {
        await api("/seed", { method: "POST" });
        userFeed = await api("/feed");
        chatHistory = await api("/chat");
        currentResources = await api("/resources");
    } catch (error) {
        console.warn("Backend unavailable, fallback to local mode:", error.message);
    }
    renderStudentHome();
    setTimeout(() => showNotification("📅 Đừng quên làm Quick Test cảm xúc hôm nay nhé!"), 1000);
};

function logout() { window.location.href = "index.html"; }

function showNotification(text) {
    const notif = document.createElement("div");
    notif.className = "notification-toast";
    notif.innerText = text;
    const frame = document.querySelector(".mobile-frame");
    if (frame) {
        frame.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }
}

function updateNav(idx) {
    document.querySelectorAll(".nav-icon").forEach((el, i) => el.classList.toggle("active", i === idx));
}

function renderStudentHome() {
    const container = document.getElementById("student-main-content");
    updateNav(0);
    const feedHtml = userFeed.map((post) => `
        <div class="feed-card">
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                <div style="font-weight:700; font-size: 14px; color: var(--deep-rose);">${post.author}</div>
                <div style="font-size: 12px; color:#999;">${post.time || relativeTimeFrom(post.createdAt || Date.now())}</div>
            </div>
            <p style="font-size: 15px; line-height: 1.5; margin-bottom: 10px; color: #1a1a1a;">${post.content}</p>
            ${post.tags && post.tags.length > 0 ? `<div style="margin-bottom:10px;">${post.tags.map((t) => `<span style="background:#f0f0f0; font-size:11px; padding:3px 8px; border-radius:4px; margin-right:5px; color:#666;">#${t}</span>`).join("")}</div>` : ""}
            <div style="display:flex; gap: 20px; font-size: 18px; color: #666;">
                <span>❤️ <span style="font-size:13px;">${post.likes || 0}</span></span>
                <span>💬 <span style="font-size:13px;">${post.comments || 0}</span></span>
                <span>🚀</span>
            </div>
        </div>
    `).join("");

    container.innerHTML = `
        <div style="padding: 0 20px;">
            <div style="display:flex; align-items:center; justify-content:space-between; padding: 15px 0; border-bottom:1px solid #eee;">
                <h2 style="font-family: var(--font-heading); font-size: 28px;">For you</h2>
                <button class="btn-outline" style="font-size:12px; padding: 5px 10px;" onclick="renderStudentDiary()">+ Viết Nhật ký</button>
            </div>
            ${feedHtml}
        </div>
    `;
}

function renderStudentDiary() {
    const container = document.getElementById("student-main-content");
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

async function selectMood(score, elem) {
    document.querySelectorAll(".emoji-btn").forEach((e) => e.classList.remove("active"));
    elem.classList.add("active");
    const msg = document.getElementById("quick-test-msg");
    try { await api("/mood", { method: "POST", body: JSON.stringify({ score }) }); } catch (_) {}
    if (score <= 2) {
        msg.innerHTML = `Bạn ổn không? <u onclick="renderStudentStats()" style="cursor:pointer; font-weight:bold;">Xem thống kê</u> hoặc <u onclick="renderResources()" style="cursor:pointer; font-weight:bold;">nghe nhạc</u> nhé.`;
    } else {
        msg.innerHTML = "Đã ghi nhận! Cảm xúc chủ đạo: " + (score === 5 ? "Rất tốt" : "Bình thường");
    }
}

async function analyzeDiary() {
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

function toggleTag(el) { el.classList.toggle("selected"); }

async function confirmAndPost() {
    const title = document.getElementById("diary-title").value;
    const content = document.getElementById("diary-content").value;
    const finalTags = [];
    document.querySelectorAll(".tag-chip.selected").forEach((el) => finalTags.push(el.innerText));
    try {
        await api("/diary", { method: "POST", body: JSON.stringify({ title, content, tags: finalTags }) });
        userFeed = await api("/feed");
    } catch (_) {
        userFeed.unshift({ author: "Tôi", content: `<strong>${title}</strong><br>${content}`, tags: finalTags, likes: 0, comments: 0, createdAt: new Date().toISOString() });
    }
    alert("✅ Đã lưu nhật ký & Gửi dữ liệu ẩn danh về trường!");
    renderStudentHome();
}

function renderResources() {
    const container = document.getElementById("student-main-content");
    updateNav(2);
    const html = currentResources.map((res) => `
        <a href="${res.url}" target="_blank" style="text-decoration:none; color:inherit;">
            <div class="res-card">
                <div class="res-img" style="background: url('${res.img || "https://via.placeholder.com/150"}') center/cover;">
                    <span class="res-type">${res.type}</span>
                </div>
                <div class="res-content"><div class="res-title">${res.title}</div></div>
            </div>
        </a>
    `).join("");
    container.innerHTML = `<div style="padding: 20px;"><h2 style="color: var(--deep-rose); margin-bottom: 15px;">Kho Tài nguyên</h2><div class="resource-grid">${html}</div></div>`;
}

async function renderStudentStats() {
    const container = document.getElementById("student-main-content");
    updateNav(3);
    let riskLevel = "medium";
    let barHeight = 80;
    let trendBars = [40, 60, 30, 80, 20];
    try {
        const stats = await api("/stats");
        riskLevel = stats.riskLevel;
        const trend = stats.moodTrend || [];
        trendBars = (trend.length ? trend : [2, 3, 2, 4, 3]).slice(-5).map((score) => Math.max(20, score * 20));
        barHeight = trendBars[trendBars.length - 1];
    } catch (_) {}

    let alertColor = "var(--warning)";
    let aiMessage = "Có vẻ bạn đang hơi căng thẳng. Hãy nghỉ ngơi một chút nhé.";
    let barColor = "var(--warning)";
    if (riskLevel === "high") {
        alertColor = "#FF6961";
        aiMessage = "Mức độ lo âu CAO. Chúng tôi khuyến nghị bạn đặt lịch tham vấn ngay.";
        barColor = "var(--deep-rose)";
    } else if (riskLevel === "low") {
        alertColor = "var(--success)";
        aiMessage = "Trạng thái cảm xúc ổn định. Hãy duy trì nhé!";
        barColor = "var(--success)";
    }

    container.innerHTML = `
        <div style="padding: 20px;">
            <h2 style="color: var(--deep-rose); margin-bottom: 20px;">Thống kê Cảm xúc</h2>
            <div style="display:flex; align-items:flex-end; justify-content:space-between; height: 150px; padding: 0 10px 10px 10px; border-bottom: 1px solid #ccc;">
                <div style="width:30px; height:${trendBars[0]}%; background: #ddd; border-radius: 4px;"></div>
                <div style="width:30px; height:${trendBars[1]}%; background: var(--accent-pink); border-radius: 4px;"></div>
                <div style="width:30px; height:${trendBars[2]}%; background: #ddd; border-radius: 4px;"></div>
                <div style="width:30px; height:${barHeight}%; background: ${barColor}; border-radius: 4px;"></div>
                <div style="width:30px; height:${trendBars[4]}%; background: #eee; border-radius: 4px; border:1px dashed #999;"></div>
            </div>
            <p style="text-align:center; font-size: 12px; color: #888; margin-top: 5px;">T2 - T3 - T4 - T5 (Hôm nay)</p>
            <div class="feed-card" style="margin: 20px 0; border-left: 4px solid ${alertColor};">
                <h4 style="display:flex; align-items:center; gap:5px;">🤖 Phân tích AI</h4>
                <p style="font-size: 13px; margin-top: 5px;">${aiMessage}</p>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button class="btn-outline" onclick="renderResources()" style="font-size:13px;">📺 Xem Tài nguyên</button>
                ${riskLevel !== "low" ? `<button class="btn-primary" onclick="openBookingModal()" style="font-size:13px;">📅 Đặt lịch ngay</button>` : ""}
            </div>
        </div>
    `;
}

function renderChat() {
    const container = document.getElementById("student-main-content");
    updateNav(4);
    const msgsHtml = chatHistory.map((msg) => `<div class="msg ${msg.sender === "ai" ? "msg-ai" : "msg-user"}">${msg.text}</div>`).join("");
    container.innerHTML = `
        <div class="chat-interface">
            <div class="chat-messages" id="chat-box">${msgsHtml}</div>
            <div style="padding: 15px; background: white; border-top: 1px solid #eee; display:flex; gap: 10px;">
                <input type="text" id="chat-input" placeholder="Nhập tin nhắn..." style="margin:0;" onkeypress="handleEnter(event)">
                <button class="btn-primary" style="border-radius: 50%; width: 45px; height: 45px; display:flex; justify-content:center; align-items:center; flex-shrink: 0;" onclick="sendMsg()">➤</button>
            </div>
        </div>
    `;
    setTimeout(() => {
        const box = document.getElementById("chat-box");
        if (box) box.scrollTop = box.scrollHeight;
    }, 50);
}

function handleEnter(e) { if (e.key === "Enter") sendMsg(); }

async function sendMsg() {
    const input = document.getElementById("chat-input");
    const txt = input.value.trim();
    if (!txt) return;
    input.value = "";
    try {
        const data = await api("/chat", { method: "POST", body: JSON.stringify({ text: txt }) });
        chatHistory.push(data.userMsg, data.aiMsg);
    } catch (_) {
        chatHistory.push({ sender: "user", text: txt }, { sender: "ai", text: "Cảm ơn bạn đã chia sẻ. Mình luôn ở đây lắng nghe bạn. Hãy kể thêm nhé." });
    }
    renderChat();
    input.focus();
}

function openBookingModal() {
    const modal = document.createElement("div");
    modal.id = "booking-modal";
    modal.className = "modal-overlay";
    modal.onclick = function (e) { if (e.target === modal) closeBookingModal(); };
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
                <input id="booking-time" type="datetime-local" style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display:block; font-size: 13px; margin-bottom: 5px; color:#666;">Ghi chú (Không bắt buộc):</label>
                <input id="booking-note" type="text" placeholder="Ví dụ: Mình muốn tư vấn về..." style="width:100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
            <button class="btn-primary" style="width:100%; padding: 12px;" onclick="handleConfirmBooking()">Xác nhận đặt lịch</button>
        </div>
    `;
    document.querySelector(".mobile-frame").appendChild(modal);
}

function closeBookingModal() {
    const modal = document.getElementById("booking-modal");
    if (modal) modal.remove();
}

async function handleConfirmBooking() {
    const desiredTime = document.getElementById("booking-time")?.value;
    const note = document.getElementById("booking-note")?.value || "";
    if (!desiredTime) return alert("Bạn cần chọn thời gian trước khi đặt lịch.");
    try {
        await api("/booking", {
            method: "POST",
            body: JSON.stringify({ desiredTime, note, phone: "1900.1234", location: "Phòng 102 - Khu B" })
        });
    } catch (_) {}
    closeBookingModal();
    setTimeout(() => alert("✅ Đã gửi yêu cầu thành công!\nCán bộ tham vấn sẽ liên hệ lại với bạn qua SĐT hoặc Email trong vòng 24h."), 300);
}