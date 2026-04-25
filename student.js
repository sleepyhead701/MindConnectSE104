// student.js - FULL VERSION (MERGED)

// --- 1. DỮ LIỆU & TRẠNG THÁI (STATE) ---
let chatHistory = [
    { sender: 'ai', text: 'Chào bạn! Mình là AI của MindConnect. Mình có thể giúp gì cho bạn hôm nay?' }
];

let userFeed = [
    { 
        id: 1, 
        author: 'User #992', 
        time: '10p trước', 
        content: 'Cảm thấy áp lực deadline quá... Có ai biết cách quản lý thời gian hiệu quả không?', 
        tags: ['Áp lực học tập', 'Cần lời khuyên'], 
        likes: 5, 
        comments: 2, 
        isUser: false 
    }
];

const resourcesDB = [
    { type: 'Video', title: 'Thiền 5 phút giảm lo âu', img: 'https://img.youtube.com/vi/inpok4MKVLM/mqdefault.jpg', url: 'https://www.youtube.com/watch?v=inpok4MKVLM' },
    { type: 'Blog', title: 'Cách vượt qua Burnout mùa thi', img: '', url: '#' },
    { type: 'Book', title: 'Hiểu về trái tim - Minh Niệm', img: '', url: '#' },
    { type: 'Podcast', title: 'Radio Cảm Xúc #12 - Chữa lành', img: '', url: '#' }
];

// --- 2. KHỞI TẠO (INIT) ---
window.onload = function() {
    renderStudentHome(); // Mặc định vào trang chủ
    setTimeout(() => {
        showNotification("📅 Đừng quên làm Quick Test cảm xúc hôm nay nhé!");
    }, 1000);
};

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

// ==============================================
// 3. HOME (GIAO DIỆN LAI THREADS)
// ==============================================
function renderStudentHome() {
    const container = document.getElementById('student-main-content');
    updateNav(0);

    let feedHtml = userFeed.map(post => `
        <div class="feed-card">
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                <div style="font-weight:700; font-size: 14px; color: var(--deep-rose);">${post.author}</div>
                <div style="font-size: 12px; color:#999;">${post.time}</div>
            </div>
            <p style="font-size: 15px; line-height: 1.5; margin-bottom: 10px; color: #1a1a1a;">${post.content}</p>
            
            ${post.tags && post.tags.length > 0 ? 
                `<div style="margin-bottom:10px;">${post.tags.map(t => `<span style="background:#f0f0f0; font-size:11px; padding:3px 8px; border-radius:4px; margin-right:5px; color:#666;">#${t}</span>`).join('')}</div>` 
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
                <h2 style="font-family: var(--font-heading); font-size: 28px;">For you</h2>
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
        msg.innerHTML = "Đã ghi nhận! Cảm xúc chủ đạo: " + (score==5?"Rất tốt":"Bình thường");
    }
}

function analyzeDiary() {
    const content = document.getElementById('diary-content').value;
    if(content.length < 5) return alert("Hãy viết dài hơn một chút nhé!");

    const btn = document.querySelector('#action-area button');
    btn.innerText = "⏳ Đang đọc..."; 
    btn.disabled = true;

    // Giả lập API Call
    setTimeout(() => {
        let suggestedTags = [];
        if(content.includes("thi") || content.includes("điểm") || content.includes("học")) suggestedTags.push("Học tập");
        if(content.includes("buồn") || content.includes("khóc")) suggestedTags.push("Lo âu");
        if(content.includes("bạn") || content.includes("cãi")) suggestedTags.push("Mối quan hệ");
        if(suggestedTags.length === 0) suggestedTags.push("Tâm sự");

        document.getElementById('action-area').classList.add('hidden');
        const tagBox = document.getElementById('ai-suggestion-area');
        tagBox.classList.remove('hidden');
        
        const tagContainer = document.getElementById('tag-container');
        tagContainer.innerHTML = suggestedTags.map(tag => 
            `<span class="tag-chip selected" onclick="toggleTag(this)">${tag}</span>`
        ).join('') + `<span class="tag-chip" onclick="toggleTag(this)">+ Khác</span>`;
    }, 1000);
}

function toggleTag(el) { el.classList.toggle('selected'); }

function confirmAndPost() {
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
function renderResources() {
    const container = document.getElementById('student-main-content');
    updateNav(2);

    let html = resourcesDB.map(res => `
        <a href="${res.url}" target="_blank" style="text-decoration:none; color:inherit;">
            <div class="res-card">
                <div class="res-img" style="background: url('${res.img || 'https://via.placeholder.com/150'}') center/cover;">
                    <span class="res-type">${res.type}</span>
                </div>
                <div class="res-content">
                    <div class="res-title">${res.title}</div>
                </div>
            </div>
        </a>
    `).join('');

    container.innerHTML = `
        <div style="padding: 20px;">
            <h2 style="color: var(--deep-rose); margin-bottom: 15px;">Kho Tài nguyên</h2>
            <div class="resource-grid">
                ${html}
            </div>
        </div>
    `;
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
    closeBookingModal();
    setTimeout(() => {
        alert("✅ Đã gửi yêu cầu thành công!\nCán bộ tham vấn sẽ liên hệ lại với bạn qua SĐT hoặc Email trong vòng 24h.");
    }, 300);
}