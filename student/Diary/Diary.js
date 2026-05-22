import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { getPrivateDiaryEntries, getCurrentMoodScore, setCurrentMoodScore } from '../studentState.js';
import { savePrivateDiaryEntries } from '../studentState.js';
import { addManualTag, getManualTags } from '../utils/tags.js';
import { createRiskAlert } from '../RiskAlert.js';
import { normalizeVietnamese } from '../utils/normalizeVietnamese.js';
import { escapeHtml, getFeedGradient, formatFeedTime, stripHtml } from '../utils/utils.js';
import { apiRequest } from '../utils/utils.js';
import { openBookingModal } from '../Booking/Booking.js';
import { renderStudentStats } from '../Stats/Stats.js';
import { renderResourcesLibrary } from '../Resources/Resources.js';

export function renderStudentDiary() {
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

    const recentHtml = getPrivateDiaryEntries().slice(0, 6).map((entry, index) => `
        <button type="button" class="mc-recent-entry" style="width:100%; text-align:left; border:0; cursor:pointer;" data-action="open-diary-entry" data-entry-id="${escapeHtml(entry.id)}">
            <div class="mc-recent-top">
                <span class="mc-recent-dot ${getFeedGradient(index)}">${escapeHtml(String(entry.mood_score || getCurrentMoodScore()))}</span>
                <strong>${formatFeedTime(entry.date || entry.time)}</strong>
            </div>
            <p><strong>${escapeHtml(entry.title || 'Không có tiêu đề')}</strong></p>
            <p>${escapeHtml(stripHtml(entry.content)).slice(0, 120)}${stripHtml(entry.content).length > 120 ? '...' : ''}</p>
        </button>
    `).join('');

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Nhật ký riêng tư</p>
                <h1>Hôm nay bạn thấy thế nào?</h1>
                <p>Chỉ bạn nhìn thấy. Nội dung này không xuất hiện trên News feed.</p>
            </div>

            <div class="mc-diary-grid">
                <div class="mc-panel mc-diary-editor">
                    <div class="quick-test-section mc-mood-section">
                        <label class="mc-field-label">Cảm xúc hiện tại</label>
                        <div class="mc-mood-grid">
                            ${moodItems.map(item => `
                                <button class="mood-card ${item.score === getCurrentMoodScore() ? 'active' : ''}" type="button" data-score="${item.score}" data-action="select-mood">
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
                    <textarea id="diary-content" class="notion-body mc-textarea" placeholder="Viết những suy nghĩ riêng tư của bạn..."></textarea>

                    <label class="mc-field-label" for="diary-tag-input">Tag bắt buộc</label>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <input id="diary-tag-input" class="mc-input" style="flex:1; min-width:180px;" placeholder="Ví dụ: Stress, Học tập, Mất ngủ">
                        <button class="mc-btn mc-btn-outline" type="button" data-action="addTag">+ Tag</button>
                    </div>
                    <div id="diary-tag-container" class="mc-tag-row" style="margin-top:10px;"></div>

                    <div class="mc-editor-actions" id="action-area">
                        <button class="mc-btn mc-btn-primary" type="button" data-action="save-diary">Lưu nhật ký riêng tư</button>
                    </div>
                </div>

                <aside class="mc-panel mc-recent-panel">
                    <h3>Nhật ký gần đây</h3>
                    <div class="mc-recent-list">${recentHtml || '<p class="mc-empty">Chưa có nhật ký nào.</p>'}</div>
                </aside>
            </div>
        </section>
    `;
}
document.addEventListener("click", (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;

    switch (actionEl.getAttribute('data-action')) {
        case 'addTag':
            addManualTag('diary-tag-input', 'diary-tag-container');
            break;
        case 'select-mood':
            selectMood(actionEl.getAttribute('data-score'), actionEl);
            break;
        case 'save-diary':
            confirmAndPost();
            break;
        case 'open-diary-entry':
            openDiaryEntryModal(actionEl.getAttribute('data-entry-id'));
            break;
        case 'close-diary-modal':
            document.getElementById('diary-entry-modal')?.remove();
            break;
        case 'booking-modal':
            openBookingModal();
            break;
        case 'student-stats':
            renderStudentStats();
            break;
        case 'resources':
            renderResourcesLibrary("Podcast");
            break;
    }
});

function selectMood(score, elem) {
    setCurrentMoodScore(Number(score) || getCurrentMoodScore());
    document.querySelectorAll('.emoji-btn, .mood-card').forEach(e => e.classList.remove('active'));
    elem.classList.add('active');
    
    const msg = document.getElementById('quick-test-msg');
    if(score == 1) {
        console.log('Creating risk alert for very low mood score...');
        msg.innerHTML = `Mình đã ghi nhận mức cảm xúc rất thấp và gửi cảnh báo ẩn danh cho tổ tham vấn. <u data-action="booking-modal" style="cursor:pointer; font-weight:bold;">Đặt lịch hỗ trợ</u>`;
        createRiskAlert('Quick Test', 'Sinh viên chọn mức cảm xúc rất thấp trong Quick Test', {
            force: true,
            label: 'Cảnh báo cảm xúc rất thấp',
            severity: 'high',
            excerpt: 'Quick Test ghi nhận mức cảm xúc 1/5.'
        });
    } else if(score <= 2) {
        msg.innerHTML = `Bạn ổn không? <u data-action="student-stats" style="cursor:pointer; font-weight:bold;">Xem thống kê</u> hoặc <u data-action="resources" style="cursor:pointer; font-weight:bold;">nghe nhạc</u> nhé.`;
    } else {
        msg.innerHTML = "Đã ghi nhận! Cảm xúc chủ đạo: " + (score==5?"Rất tốt":(score==4?"Tốt":"Bình thường"));
    }
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
        mood_score: getCurrentMoodScore(),
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
                mood_score: getCurrentMoodScore(),
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
                <button type="button" aria-label="Đóng" data-action="close-diary-modal" style="border:0;background:transparent;font-size:24px;cursor:pointer;color:#999;">&times;</button>
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

function formatDiaryContent(title, content) {
    const safeTitle = escapeHtml(title || '');
    const safeContent = escapeHtml(content || '').replace(/\n/g, '<br>');
    return safeTitle ? `<strong>${safeTitle}</strong><br>${safeContent}` : safeContent;
}