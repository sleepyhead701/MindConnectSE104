import { getStudentProfile, saveStudentProfile, getStudentSession } from '../studentState.js';
import { escapeHtml } from '../utils/utils.js';
import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { showNotification } from '../utils/utils.js';
import {
    defaultChatHistory,
    getChatHistory,
    addChatMessage,
    clearChatHistory,
    setChatHistory,
    saveChatHistory
} from '../studentState.js';
import { callChatBotAPI } from '../API/callChatBotAPI.js';
import { blockIfBackendNotReady } from '../API/blockIfBackendNotReady.js'
import { trackInteraction } from "../API/analytics.js";
import { createRiskAlert } from '../RiskAlert.js';
import { getBackendReadyState } from '../../state.js';
import { getChatHistoryRemoteLoaded, setChatHistoryRemoteLoaded } from '../studentState.js';
import { apiRequest } from '../utils/utils.js';


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

export function renderChat(options = {}) {
    const container = document.getElementById('student-main-content');
    updateNav(4);
    animateMainContentSwap();
    const shouldSyncHistory = options.syncHistory !== false;

    const suggestions = [
        'Mình đang căng thẳng vì deadline',
        'Gợi ý bài tập thở 5 phút',
        'Mình cần nói chuyện với ai đó'
    ];

    const messagesHtml = getChatHistory().map(msg => `
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
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
                    <div style="font-weight:700; color:var(--deep-rose);">Lịch sử chat của tôi</div>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span style="font-size:12px; color:#777;">${Math.max(getChatHistory().length - 1, 0)} tin đã lưu</span>
                        <button class="mc-btn mc-btn-outline" type="button" data-action="refresh">Tải lịch sử</button>
                        <button class="mc-btn mc-btn-danger" type="button" data-action="delete">Xóa lịch sử</button>
                    </div>
                </div>
                <div id="chat-box" class="chat-box mc-chat-box">
                    ${messagesHtml}
                </div>

                <div class="mc-chat-suggestions">
                    ${suggestions.map(s => `
                        <button type="button" data-action="suggest" data-suggestion="${escapeHtml(s)}">
                            ${escapeHtml(s)}
                        </button>
                    `).join('')}
                </div>

                <div class="mc-chat-input-row">
                    <input type="text" id="chat-input" placeholder="Nhập tin nhắn...">
                    <button class="mc-send-btn" type="button" aria-label="Gửi tin nhắn" data-action="send">→</button>
                </div>
            </div>
        </section>
    `;
    setTimeout(() => {
        const box = document.getElementById('chat-box');
        if (box) box.scrollTop = box.scrollHeight;
    }, 0);

    // Event delegation for click actions inside the chat container
    // Add the listener only once to avoid duplicate handlers when re-rendering
    if (!container.__mcListenerAdded) {
        container.addEventListener('click', function onContainerClick(e) {
            // no-op
        });
        // replace with the real handler reference so we can avoid adding again
        container.removeEventListener('click', function onContainerClick(e) {});
        container.addEventListener('click', function onContainerClick(e) {
        const btn = e.target.closest && e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (action === 'refresh') {
            refreshChatHistoryFromBackend();
        } else if (action === 'delete') {
            if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) return;
            clearChatHistory();
            try {
                if (getBackendReadyState()) {
                    apiRequest('/chat/clear', { method: 'POST' }).catch(() => {});
                }
            } catch (e) {}
            showNotification('Đã xóa lịch sử chat.');
            renderChat({ syncHistory: false });
        } else if (action === 'suggest') {
            setChatSuggestion(btn.getAttribute('data-suggestion'));
        } else if (action === 'send') {
            sendMsg();
        }
        });
        container.__mcListenerAdded = true;
    }

    // Enter key handler for chat input
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) { if (e.key === 'Enter') sendMsg(); });
    }

    if (shouldSyncHistory && !getChatHistoryRemoteLoaded()) {
        setChatHistoryRemoteLoaded(true);
        refreshChatHistoryFromBackend({ silent: true });
    }
}

async function refreshChatHistoryFromBackend(options = {}) {
    if (!getBackendReadyState()) return;
    try {
        const remoteHistory = await apiRequest('/chat/history');
        if (Array.isArray(remoteHistory) && remoteHistory.length) {
            const rebuiltHistory = defaultChatHistory.map(message => ({
                ...message,
                created_at: message.created_at || new Date().toISOString()
            }));

            remoteHistory.forEach(item => {
                if (item.user_message) {
                    rebuiltHistory.push({
                        sender: 'user',
                        text: item.user_message,
                        created_at: item.created_at
                    });
                }
                if (item.ai_reply) {
                    rebuiltHistory.push({
                        sender: 'ai',
                        text: item.ai_reply,
                        created_at: item.created_at
                    });
                }
            });

            clearChatHistory();
            setChatHistory(rebuiltHistory);
            saveChatHistory();
            renderChat({ syncHistory: false });
        } else if (!options.silent) {
            showNotification('Chưa có lịch sử chat từ backend. Mình vẫn giữ lịch sử local trên máy bạn.');
        }
    } catch (error) {
        if (!options.silent) {
            showNotification('Chưa tải được lịch sử chat từ backend, đang dùng lịch sử local.');
        }
    }
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

    addChatMessage('user', txt);
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

        addChatMessage('ai', aiResponse);
        renderChat();
        setTimeout(() => {
            const box = document.getElementById('chat-box');
            if (box) box.scrollTop = box.scrollHeight;
        }, 0);
    } catch (error) {
        console.error('Chat API failed:', error);
        const indicator = document.getElementById('ai-typing-indicator');
        if (indicator) indicator.remove();

        addChatMessage('ai', buildChatConnectionErrorReply(error));
        renderChat();
        setTimeout(() => {
            const box = document.getElementById('chat-box');
            if (box) box.scrollTop = box.scrollHeight;
        }, 0);
    }
}

function formatChatMessage(value) {
    return escapeHtml(value)
        .replace(
            /(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        )
        .replace(/\n/g, '<br>');
}

function setChatSuggestion(text) {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.value = text || '';
    input.focus();
}

export function buildFallbackChatReply(txt, riskAlert) {
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

function getFallbackResourceSuggestion(text) {
    const normalized = String(text || '').toLowerCase();
    if (normalized.includes('deadline') || normalized.includes('học') || normalized.includes('thi')) {
        return 'Bạn có thể thử Pomodoro 25 phút, chia việc thành bước nhỏ và xem thêm tài nguyên về vượt qua căng thẳng trước kỳ thi trong Resources.';
    }
    if (normalized.includes('ngủ') || normalized.includes('mất ngủ')) {
        return 'Tối nay bạn thử giảm màn hình 30 phút trước khi ngủ, viết vài dòng Diary để xả suy nghĩ, và tìm resource về giấc ngủ trong Resources nhé.';
    }
    if (normalized.includes('lo') || normalized.includes('stress') || normalized.includes('căng thẳng')) {
        return 'Một bước nhẹ nhàng bây giờ là thở chậm 4-4-6 trong vài vòng, rồi ghi lại điều đang làm bạn lo nhất để mình cùng gỡ từng phần.';
    }
    return 'Nếu muốn, bạn có thể mở Resources để tìm bài đọc, video hoặc công cụ thở phù hợp với điều mình đang trải qua.';
}
