import { escapeHtml } from '../utils/utils.js';
import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { showNotification } from '../utils/utils.js';
import {
    getChatHistory,
    addChatMessage,
    clearAllChatHistory,
    archiveCurrentChatSession,
    getArchivedChatSessions
} from '../studentState.js';
import { callChatBotAPI } from '../API/callChatBotAPI.js';
import { blockIfBackendNotReady } from '../API/blockIfBackendNotReady.js'
import { trackInteraction } from "../API/analytics.js";
import { createRiskAlert } from '../RiskAlert.js';
import { getBackendReadyState } from '../../state.js';
import { apiRequest } from '../utils/utils.js';

let selectedChatSessionId = 'current';

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

function formatSessionTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Không rõ thời gian';
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function renderArchivedChatSessions(activeSessionId = selectedChatSessionId) {
    const sessions = getArchivedChatSessions();
    if (!sessions.length) {
        return `
            <div class="mc-chat-history-empty">
                Chưa có phiên chat cũ. Khi bạn vào web lần sau, phiên hiện tại sẽ tự lưu vào đây.
            </div>
        `;
    }

    return sessions.map(session => {
        const messageCount = Number(session.message_count || session.messages?.length || 0);
        const isActive = activeSessionId === session.id;

        return `
            <button class="mc-chat-session ${isActive ? 'active' : ''}" type="button" data-action="select-session" data-session-id="${escapeHtml(session.id)}">
                <span>
                    <strong>${escapeHtml(session.title || 'Phiên chat')}</strong>
                    <small>${escapeHtml(formatSessionTime(session.ended_at || session.started_at))} · ${messageCount} tin</small>
                </span>
                <span class="mc-chat-session-source">${escapeHtml(session.source === 'backend' ? 'Backend' : 'Local')}</span>
            </button>
        `;
    }).join('');
}

function findArchivedChatSession(sessionId) {
    return getArchivedChatSessions().find(session => session.id === sessionId) || null;
}

function getVisibleChatSession(currentMessages) {
    if (selectedChatSessionId !== 'current') {
        const archivedSession = findArchivedChatSession(selectedChatSessionId);
        if (archivedSession) {
            return {
                id: archivedSession.id,
                title: archivedSession.title || 'Phiên chat cũ',
                messages: archivedSession.messages || [],
                isCurrent: false
            };
        }
        selectedChatSessionId = 'current';
    }

    return {
        id: 'current',
        title: 'Đoạn chat mới',
        messages: currentMessages,
        isCurrent: true
    };
}

function renderChatMessages(messages = []) {
    return messages.map(msg => `
        <div class="mc-message-row ${msg.sender === 'user' ? 'user' : 'ai'}">
            ${msg.sender === 'ai' ? '<div class="mc-ai-avatar">AI</div>' : ''}
            <div class="mc-message-bubble ${msg.sender === 'user' ? 'user' : 'ai'}">
                ${formatChatMessage(msg.text)}
            </div>
        </div>
    `).join('');
}

export function renderChat(options = {}) {
    const container = document.getElementById('student-main-content');
    updateNav(4);
    animateMainContentSwap();

    const suggestions = [
        'Mình đang căng thẳng vì deadline',
        'Gợi ý bài tập thở 5 phút',
        'Mình cần nói chuyện với ai đó'
    ];

    const currentMessages = getChatHistory();
    const visibleSession = getVisibleChatSession(currentMessages);
    const messagesHtml = renderChatMessages(visibleSession.messages);
    const archivedCount = getArchivedChatSessions().length;
    const currentMessageCount = Math.max(currentMessages.length - 1, 0);

    container.innerHTML = `
        <section class="mc-page mc-chat-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Trò chuyện riêng tư</p>
                <h1>AI hỗ trợ <span>tâm lý</span></h1>
                <p>Tâm sự bằng lời của mình. AI sẽ lắng nghe, đưa lời khuyên và gợi ý tài nguyên phù hợp.</p>
            </div>

            <div class="mc-chat-panel">
                <div class="mc-chat-toolbar">
                    <div>
                        <strong>${escapeHtml(visibleSession.title)}</strong>
                        <span>${visibleSession.isCurrent ? `${currentMessageCount} tin trong phiên mới` : `${Number(visibleSession.messages.length || 0)} tin trong phiên cũ`}</span>
                    </div>
                    <div>
                        ${visibleSession.isCurrent ? '<button class="mc-btn mc-btn-outline" type="button" data-action="archive">Lưu phiên này</button>' : '<button class="mc-btn mc-btn-outline" type="button" data-action="select-session" data-session-id="current">Đoạn chat mới</button>'}
                        <button class="mc-btn mc-btn-danger" type="button" data-action="delete">Xóa lịch sử</button>
                    </div>
                </div>
                <div id="chat-box" class="chat-box mc-chat-box">
                    ${messagesHtml}
                </div>

                ${visibleSession.isCurrent ? `
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
                ` : `
                    <div class="mc-chat-readonly-note">
                        Phiên chat cũ đang ở chế độ xem lại.
                    </div>
                `}

                <div class="mc-chat-history-panel">
                    <div class="mc-chat-history-heading">
                        <strong>Lịch sử chat cũ</strong>
                        <span>${archivedCount} phiên đã lưu</span>
                    </div>
                    <button class="mc-chat-new-session ${visibleSession.isCurrent ? 'active' : ''}" type="button" data-action="select-session" data-session-id="current">
                        <span>
                            <strong>Đoạn chat mới</strong>
                            <small>${currentMessageCount} tin hiện tại</small>
                        </span>
                    </button>
                    ${renderArchivedChatSessions()}
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
        const btn = e.target.closest && e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (action === 'select-session') {
            selectedChatSessionId = btn.getAttribute('data-session-id') || 'current';
            renderChat({ syncHistory: false });
        } else if (action === 'archive') {
            const archived = archiveCurrentChatSession({ reset: true });
            selectedChatSessionId = 'current';
            showNotification(archived ? 'Đã lưu phiên chat hiện tại vào lịch sử.' : 'Phiên hiện tại chưa có tin nhắn mới để lưu.');
            renderChat({ syncHistory: false });
        } else if (action === 'delete') {
            if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat và phiên hiện tại?')) return;
            clearAllChatHistory();
            selectedChatSessionId = 'current';
            try {
                if (getBackendReadyState()) {
                    apiRequest('/chat/clear', { method: 'POST' }).catch(() => {});
                }
            } catch (e) {}
            showNotification('Đã xóa toàn bộ lịch sử chat và bắt đầu phiên mới.');
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

}

function handleEnter(e) { if (e.key === 'Enter') sendMsg(); }

async function sendMsg() {
    if (blockIfBackendNotReady()) return;
    if (selectedChatSessionId !== 'current') {
        selectedChatSessionId = 'current';
        renderChat({ syncHistory: false });
    }

    const input = document.getElementById('chat-input');
    if (!input) return;
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
