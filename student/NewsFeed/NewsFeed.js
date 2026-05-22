import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { getUserFeed, getAuthorAvatar, addUserFeed } from '../../state.js';
import { getStudentProfile, getUserProfile } from '../studentState.js';
import { escapeHtml, formatFeedTime, getInitials, renderAvatar } from '../utils/utils.js';
import { addManualTag, getManualTags } from '../utils/tags.js';
import { trackInteraction } from '../API/analytics.js';
import { renderStudentDiary } from '../Diary/Diary.js';

var currentUserFeed = getUserFeed();


export function updateStudentProfileBadge() {
    const badge = document.getElementById('profileAvatar');
    if (!badge) return;

    const profile = getStudentProfile();
    badge.title = profile.displayName || profile.name;
    if (profile.avatarUrl) {
        badge.innerHTML = `<img src="${escapeHtml(profile.avatarUrl)}" alt="" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        return;
    }

    badge.textContent = getInitials(profile.displayName || profile.name || 'SV');
}

function publishFeedPost() {
    const content = document.getElementById('feed-post-content')?.value.trim() || '';
    const tagInput = document.getElementById('feed-tag-input');
    if (tagInput?.value.trim()) addManualTag('feed-tag-input', 'feed-tag-container');
    const tags = getManualTags('feed-tag-container');

    if (content.length < 3) {
        alert('Bạn hãy viết nội dung bài đăng trước nhé.');
        return;
    }

    if (!tags.length) {
        alert('Bạn cần thêm ít nhất 1 tag trước khi đăng bài lên News feed.');
        return;
    }

    const profile = getStudentProfile();
    const post = {
        id: `feed-${Date.now()}`,
        author: profile.displayName || profile.name,
        author_avatar: profile.avatarUrl,
        owner_email: profile.email,
        date: new Date().toISOString(),
        content,
        tags,
        likes: 0,
        comments: 0,
        isUser: true,
        commentObjects: []
    };

    addUserFeed(post);
    trackInteraction('post', post.id, {
        source: 'public-feed',
        tags,
        content_length: content.length
    });
    currentUserFeed.push(post);
    renderStudentHome();
}

export function renderStudentHome() {
    const container = document.getElementById('student-main-content');
    updateNav(0);
    animateMainContentSwap();

    const feedHtml = currentUserFeed.map((post, index) => {
        const postDate = post.date || post.time;
        const comments = Array.isArray(post.commentObjects) ? post.commentObjects : [];
        const commentCount = comments.length || post.comments || 0;
        const postBody = escapeHtml(post.content);

        const commentsHtml = comments.length > 0
            ? `
                <div class="mc-reply-list">
                    ${comments.map(c => `
                        <div class="mc-reply-card">
                            ${renderAvatar(c.author, c.author_avatar || getUserProfile(c.author)?.avatarUrl, index)}
                            <div class="mc-reply-content-box">
                                <div class="mc-reply-meta">
                                    <strong>${escapeHtml(c.author)}</strong>
                                <span>${formatFeedTime(c.date)}</span>
                            </div>
                            <p>${escapeHtml(c.content)}</p>
                            <div style="margin-top: 8px; position: relative; display: inline-block;" class="mc-reaction-wrapper" onmouseenter="this.querySelector('.mc-reaction-popup').style.display='flex'" onmouseleave="this.querySelector('.mc-reaction-popup').style.display='none'">
                                <button type="button" aria-label="Thả tim" style="background: none; border: none; cursor: pointer; padding: 0; font-size: 16px; color: #666; transition: transform 0.2s;" data-action="toggle-like""><span class="mc-reaction-icon" style="filter: grayscale(100%);">❤️</span> <span class="mc-like-count">${Array.isArray(c.likes) ? c.likes.length : (c.likes || 0)}</span></button>
                                <div class="mc-reaction-popup" style="display: none; position: absolute; bottom: 100%; left: 0; background: white; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 5px 10px; gap: 10px; z-index: 10;">
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="👍">👍</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="❤️">❤️</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😂">😂</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😮">😮</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😢">😢</span>
                                </div>
                            </div>
                        </div>
                        </div>
                    `).join('')}
                </div>
            `
            : '';

        return `
            <article class="mc-feed-card" data-post-id="${escapeHtml(post.id || `post-${index}`)}">
                <div class="mc-feed-content">
                    ${renderAvatar(post.author, post.author_avatar || getUserProfile(post.author)?.avatarUrl || getAuthorAvatar(post.author), index)}
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
                                <button type="button" aria-label="Thả tim" style="transition: transform 0.2s;" data-action="toggle-like"><span class="mc-reaction-icon" style="filter: grayscale(100%);">❤️</span> <span class="mc-like-count">${Array.isArray(post.likes) ? post.likes.length : (post.likes || 0)}</span></button>
                                <div class="mc-reaction-popup" style="display: none; position: absolute; bottom: 100%; left: 0; background: white; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 5px 10px; gap: 10px; z-index: 10;">
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="👍">👍</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="❤️">❤️</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😂">😂</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😮">😮</span>
                                    <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😢">😢</span>
                                </div>
                            </div>
                            <button type="button" aria-label="Bình luận" onclick="const box = this.parentElement.nextElementSibling; box.style.display = box.style.display === 'none' ? 'block' : 'none';"><span>💬</span> ${commentCount}</button>
                            <button type="button" aria-label="Chia sẻ"><span>➦</span></button>
                        </div>
                        <div class="mc-comment-input-box" style="display: none; margin-top: 16px;">
                            <input type="text" class="mc-input" placeholder="Viết bình luận của bạn..." style="margin-bottom: 8px; padding: 10px 14px; font-size: 14px;">
                            <button type="button" class="mc-btn mc-btn-primary" style="min-height: 32px; padding: 6px 14px; font-size: 13px;" onclick="if(this.previousElementSibling.value) { window.submitComment(${index}, this.previousElementSibling.value); this.previousElementSibling.value = ''; }">Gửi bình luận</button>
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
                <button class="mc-btn mc-btn-outline" type="button" data-action="diary">+ Viết Nhật ký</button>
            </div>
            <div class="mc-panel" style="margin-bottom: 18px;">
                <label class="mc-field-label" for="feed-post-content">Đăng bài lên News feed</label>
                <textarea id="feed-post-content" class="mc-textarea" style="min-height:90px;" placeholder="Chia sẻ với cộng đồng..."></textarea>
                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                    <input id="feed-tag-input" class="mc-input" style="flex:1; min-width:180px;" placeholder="Thêm tag, ví dụ: Stress, Học tập">
                    <button class="mc-btn mc-btn-outline" type="button" data-action="addTag">+ Tag</button>
                    <button class="mc-btn mc-btn-primary" type="button" data-action="publishPost">Đăng lên Home</button>
                </div>
                <div id="feed-tag-container" class="mc-tag-row" style="margin-top:10px;"></div>
            </div>
            <div class="mc-feed-list">
                ${feedHtml}
            </div>
        </section>
    `;
}

document.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='addTag']")) {
        addManualTag("feed-tag-input", "feed-tag-container");
    }
    else if (event.target.closest("[data-action='publishPost']")) {
        publishFeedPost();
    }
    else if (event.target.closest("[data-action='diary']")) {
        renderStudentDiary();
    }
    else if (event.target.closest("[data-action='toggle-like']")) {
        const btn = event.target.closest('button');
        const icon = btn.querySelector('.mc-reaction-icon');
        btn.classList.toggle('mc-liked');
        const num = btn.querySelector('.mc-like-count');
        if(btn.classList.contains('mc-liked')) {
            num.textContent = parseInt(num.textContent) + 1;
            btn.style.color = 'var(--deep-rose)';
            if (icon) icon.style.filter = 'grayscale(0%)';
            btn.style.transform = 'scale(1.2)';
            setTimeout(() => btn.style.transform = 'scale(1)', 200);
        } else {
            num.textContent = parseInt(num.textContent) - 1;
            btn.style.color = '';
            if (icon) icon.style.filter = 'grayscale(100%)';
        }
    }
    else if (event.target.closest("[data-action='select-reaction']")) {
        const reaction = event.target.getAttribute('data-reaction');
        const btn = event.target.closest('.mc-reaction-popup').previousElementSibling;
        const icon = btn.querySelector('.mc-reaction-icon');
        icon.textContent = reaction;
        icon.style.filter = 'grayscale(0%)';
        btn.style.color = 'var(--deep-rose)';
        if(!btn.classList.contains('mc-liked')) {
            btn.classList.add('mc-liked');
            btn.querySelector('.mc-like-count').textContent = parseInt(btn.querySelector('.mc-like-count').textContent) + 1;
        }
        event.target.parentElement.style.display = 'none';
    }

});