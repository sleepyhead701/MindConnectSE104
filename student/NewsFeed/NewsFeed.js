import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { getUserFeed, getAuthorAvatar, addUserFeed, savePublicFeed, syncPublicFeedWithBackend, hasLoadedPublicFeedFromBackend } from '../../shared/state.js';
import { getCurrentProfileNames, getStudentProfile, getUserProfile, isOwnedFeedPost } from '../studentState.js';
import { escapeHtml, formatFeedTime, getInitials, renderAvatar } from '../utils/utils.js';
import { addManualTag, getManualTags } from '../utils/tags.js';
import { trackInteraction } from '../API/analytics.js';
import { renderStudentDiary } from '../Diary/Diary.js';
import { openBookingModal } from '../Booking/Booking.js';

function getReactionCount(likes) {
    if (Array.isArray(likes)) {
        return likes.reduce((sum, value) => sum + (Number(value) || 0), 0);
    }
    return Number(likes) || 0;
}

function setReactionCount(target, nextCount) {
    target.likes = Math.max(0, Number(nextCount) || 0);
}

function getReactionTarget(button) {
    const postIndex = Number(button?.dataset?.postIndex);
    const commentIndex = button?.dataset?.commentIndex === undefined ? null : Number(button.dataset.commentIndex);
    const feed = getUserFeed();
    const post = feed[postIndex];
    if (!post) return null;

    if (Number.isFinite(commentIndex)) {
        const comment = Array.isArray(post.commentObjects) ? post.commentObjects[commentIndex] : null;
        return comment ? { post, target: comment, targetType: 'comment', targetId: comment.id || `${post.id}-comment-${commentIndex}` } : null;
    }

    return { post, target: post, targetType: 'post', targetId: post.id || `post-${postIndex}` };
}

function persistReaction(button, reaction, active) {
    const resolved = getReactionTarget(button);
    if (!resolved) return;

    const currentCount = getReactionCount(resolved.target.likes);
    setReactionCount(resolved.target, active ? currentCount + 1 : currentCount - 1);
    savePublicFeed();
    trackInteraction('reaction', resolved.targetId, {
        source: 'public-feed',
        target_type: resolved.targetType,
        post_id: resolved.post.id || '',
        reaction,
        action: active ? 'add' : 'remove'
    });
}


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
    renderStudentHome();
}

function deleteFeedPost(postIndex) {
    const feed = getUserFeed();
    const post = feed[postIndex];
    if (!post) return;

    if (!isOwnedFeedPost(post)) {
        alert('Bạn chỉ có thể xóa bài đăng của chính mình.');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa bài đăng này không?')) {
        return;
    }

    const [removedPost] = feed.splice(postIndex, 1);
    savePublicFeed();
    trackInteraction('post', removedPost?.id || `post-${postIndex}`, {
        source: 'public-feed',
        action: 'delete',
        tag_count: Array.isArray(removedPost?.tags) ? removedPost.tags.length : 0,
        comment_count: Array.isArray(removedPost?.commentObjects) ? removedPost.commentObjects.length : Number(removedPost?.comments || 0)
    });
    renderStudentHome();
}

function isOwnedFeedComment(comment) {
    const profile = getStudentProfile();
    if (comment?.owner_email && profile.email) {
        return String(comment.owner_email).toLowerCase() === String(profile.email).toLowerCase();
    }

    const names = getCurrentProfileNames(profile);
    return Boolean(comment?.isUser && names.has(comment.author));
}

function deleteFeedComment(postIndex, commentIndex) {
    const feed = getUserFeed();
    const post = feed[postIndex];
    const comments = Array.isArray(post?.commentObjects) ? post.commentObjects : [];
    const comment = comments[commentIndex];
    if (!post || !comment) return;

    if (!isOwnedFeedComment(comment)) {
        alert('Bạn chỉ có thể xóa bình luận của chính mình.');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa bình luận này không?')) {
        return;
    }

    const [removedComment] = comments.splice(commentIndex, 1);
    post.comments = comments.length;
    savePublicFeed();
    trackInteraction('comment', removedComment?.id || `${post.id || `post-${postIndex}`}-comment-${commentIndex}`, {
        source: 'public-feed',
        action: 'delete',
        post_id: post.id || ''
    });
    renderStudentHome();
}

function renderCommentDeleteButton(postIndex, commentIndex, comment) {
    if (!isOwnedFeedComment(comment)) return '';
    return `<button type="button" class="mc-post-delete-btn mc-comment-delete-btn" data-action="delete-comment" data-post-index="${postIndex}" data-comment-index="${commentIndex}" aria-label="Xóa bình luận">Xóa</button>`;
}

function renderNestedReplyDeleteButton(postIndex, commentIndex, replyIndex, reply) {
    if (!isOwnedFeedComment(reply)) return '';
    return `<button type="button" class="mc-post-delete-btn mc-comment-delete-btn" data-action="delete-reply" data-post-index="${postIndex}" data-comment-index="${commentIndex}" data-reply-index="${replyIndex}" aria-label="Xóa phản hồi">Xóa</button>`;
}

export function renderStudentHome() {
    const container = document.getElementById('student-main-content');
    updateNav(0);
    animateMainContentSwap();

    if (!hasLoadedPublicFeedFromBackend()) {
        syncPublicFeedWithBackend().then(hasChanged => {
            if (hasChanged && document.getElementById('student-main-content')) {
                renderStudentHome();
            }
        });
    }

    const feedItems = getUserFeed();
    const feedHtml = feedItems.map((post, index) => {
        const postDate = post.date || post.time;
        const comments = Array.isArray(post.commentObjects) ? post.commentObjects : [];
        const commentCount = comments.reduce((sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0), 0);
        const postBody = escapeHtml(post.content);
        const canDeletePost = isOwnedFeedPost(post);

        const commentsHtml = comments.length > 0
            ? `
                <div class="mc-reply-list">
                    ${comments.map((c, commentIndex) => {
                        const repliesHtml = Array.isArray(c.replies) && c.replies.length > 0
                            ? `
                                <div class="mc-nested-replies-list" style="margin-top: 12px; padding-left: 20px; border-left: 2px solid rgba(212, 46, 112, 0.12); display: grid; gap: 8px;">
                                    ${c.replies.map((r, replyIndex) => `
                                        <div class="mc-reply-card mc-nested-reply-card" style="background: #fafaf9 !important; border: 1px solid rgba(0,0,0,0.06) !important; padding: 10px 12px !important; margin-bottom: 0 !important;">
                                            ${renderAvatar(r.author, r.author_avatar || getUserProfile(r.author)?.avatarUrl, index)}
                                            <div class="mc-reply-content-box">
                                                <div class="mc-reply-meta">
                                                    <strong>${escapeHtml(r.author)}</strong>
                                                    <div class="mc-reply-tools">
                                                        <span>${formatFeedTime(r.date)}</span>
                                                        ${renderNestedReplyDeleteButton(index, commentIndex, replyIndex, r)}
                                                    </div>
                                                </div>
                                                <p>${escapeHtml(r.content)}</p>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `
                            : '';

                        return `
                            <div class="mc-reply-card">
                                ${renderAvatar(c.author, c.author_avatar || getUserProfile(c.author)?.avatarUrl, index)}
                                <div class="mc-reply-content-box">
                                    <div class="mc-reply-meta">
                                        <strong>${escapeHtml(c.author)}</strong>
                                        <div class="mc-reply-tools">
                                            <span>${formatFeedTime(c.date)}</span>
                                            ${renderCommentDeleteButton(index, commentIndex, c)}
                                        </div>
                                    </div>
                                    <p>${escapeHtml(c.content)}</p>
                                    <div style="margin-top: 8px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                        <div style="position: relative; display: inline-block;" class="mc-reaction-wrapper" onmouseenter="this.querySelector('.mc-reaction-popup').style.display='flex'" onmouseleave="this.querySelector('.mc-reaction-popup').style.display='none'">
                                            <button type="button" aria-label="Thả tim" style="background: none; border: none; cursor: pointer; padding: 0; font-size: 13px; color: #666; transition: transform 0.2s;" data-action="toggle-like" data-post-index="${index}" data-comment-index="${commentIndex}"><span class="mc-reaction-icon" style="filter: grayscale(100%);">❤️</span> <span class="mc-like-count">${getReactionCount(c.likes)}</span></button>
                                            <div class="mc-reaction-popup" style="display: none; position: absolute; bottom: 100%; left: 0; background: white; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 5px 10px; gap: 10px; z-index: 10;">
                                                <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="👍">👍</span>
                                                <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="❤️">❤️</span>
                                                <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😂">😂</span>
                                                <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😮">😮</span>
                                                <span style="cursor: pointer; font-size: 20px; transition: transform 0.2s;" onmouseenter="this.style.transform='scale(1.3)'" onmouseleave="this.style.transform='scale(1)'" data-action="select-reaction" data-reaction="😢">😢</span>
                                            </div>
                                        </div>
                                        <button type="button" class="mc-reply-action-btn" data-action="show-reply-box" data-post-index="${index}" data-comment-index="${commentIndex}" style="background:none; border:none; color:var(--mc-ink-soft); font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(100, 59, 77, 0.08);">💬 Phản hồi</button>
                                    </div>
                                    
                                    <div class="mc-nested-reply-input-box" id="reply-box-${index}-${commentIndex}" style="display: none; margin-top: 12px; background: #fffcfd; padding: 10px; border-radius: 10px; border: 1px solid rgba(212, 46, 112, 0.1);">
                                        <input type="text" class="mc-input mc-nested-input" placeholder="Phản hồi ${escapeHtml(c.author)}..." style="margin-bottom: 8px; padding: 8px 12px; font-size: 13px; height: 38px; width: 100%; box-sizing: border-box; border: 1.5px solid rgba(100, 59, 77, 0.12) !important; border-radius: 10px;">
                                        <div style="display:flex; gap:6px; justify-content: flex-end;">
                                            <button type="button" class="mc-btn mc-btn-outline" style="min-height: 28px; height: 28px; padding: 4px 10px; font-size: 11px; border-radius: 8px !important;" onclick="document.getElementById('reply-box-${index}-${commentIndex}').style.display='none'">Hủy</button>
                                            <button type="button" class="mc-btn mc-btn-primary" style="min-height: 28px; height: 28px; padding: 4px 10px; font-size: 11px; border-radius: 8px !important; border:none !important;" onclick="const val = this.parentElement.parentElement.firstElementChild.value; if(val.trim()) { window.submitNestedReply(${index}, ${commentIndex}, val); this.parentElement.parentElement.firstElementChild.value = ''; }">Gửi</button>
                                        </div>
                                    </div>

                                    ${repliesHtml}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `
            : '';

        return `
            <article class="mc-feed-card" data-post-id="${escapeHtml(post.id || `post-${index}`)}">
                <div class="mc-feed-content">
                    ${renderAvatar(post.author, post.author_avatar || getUserProfile(post.author)?.avatarUrl || getAuthorAvatar(post), index)}
                    <div class="mc-feed-main">
                        <div class="mc-feed-meta">
                            <div>
                                <h3>${escapeHtml(post.author)}</h3>
                                <span>${formatFeedTime(postDate)}</span>
                            </div>
                            ${canDeletePost ? `<button type="button" class="mc-post-delete-btn" data-action="delete-post" data-post-index="${index}" aria-label="Xóa bài đăng">Xóa</button>` : ''}
                        </div>
                        <p class="mc-feed-text">${postBody}</p>

                        ${post.tags && post.tags.length > 0 ?
                            `<div class="mc-tag-row">${post.tags.map(t => `<span>#${escapeHtml(t)}</span>`).join('')}</div>`
                            : ''}

                        <div class="mc-feed-actions">
                            <div class="mc-reaction-wrapper" style="position: relative; display: inline-block;" onmouseenter="this.querySelector('.mc-reaction-popup').style.display='flex'" onmouseleave="this.querySelector('.mc-reaction-popup').style.display='none'">
                                <button type="button" aria-label="Thả tim" style="transition: transform 0.2s;" data-action="toggle-like" data-post-index="${index}"><span class="mc-reaction-icon" style="filter: grayscale(100%);">❤️</span> <span class="mc-like-count">${getReactionCount(post.likes)}</span></button>
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
                <div class="mc-header-actions">
                    <button class="mc-btn mc-btn-primary" type="button" data-action="book-session">Đặt lịch tư vấn</button>
                    <button class="mc-btn mc-btn-outline" type="button" data-action="diary">+ Viết Nhật ký</button>
                </div>
            </div>
            <div class="mc-panel mc-feed-creator" style="margin-bottom: 18px;">
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

window.submitComment = function submitComment(postIndex, rawContent) {
    const content = String(rawContent || '').trim();
    const feed = getUserFeed();
    const post = feed[postIndex];
    if (!content || !post) return;

    const profile = getStudentProfile();
    if (!Array.isArray(post.commentObjects)) {
        post.commentObjects = [];
    }

    const comment = {
        id: `comment-${Date.now()}`,
        author: profile.displayName || profile.name,
        author_avatar: profile.avatarUrl,
        owner_email: profile.email,
        date: new Date().toISOString(),
        content,
        likes: 0,
        isUser: true,
        replies: []
    };

    post.commentObjects.push(comment);
    post.comments = post.commentObjects.length;
    savePublicFeed();
    trackInteraction('comment', comment.id, {
        source: 'public-feed',
        post_id: post.id || '',
        content_length: content.length
    });
    renderStudentHome();
};

window.submitNestedReply = function submitNestedReply(postIndex, commentIndex, rawContent) {
    const content = String(rawContent || '').trim();
    const feed = getUserFeed();
    const post = feed[postIndex];
    const comment = Array.isArray(post?.commentObjects) ? post.commentObjects[commentIndex] : null;
    if (!content || !comment) return;

    const profile = getStudentProfile();
    if (!Array.isArray(comment.replies)) {
        comment.replies = [];
    }

    const reply = {
        id: `reply-${Date.now()}`,
        author: profile.displayName || profile.name,
        author_avatar: profile.avatarUrl,
        owner_email: profile.email,
        date: new Date().toISOString(),
        content,
        likes: 0,
        isUser: true
    };

    comment.replies.push(reply);
    savePublicFeed();
    trackInteraction('comment', reply.id, {
        source: 'public-feed',
        action: 'create_nested',
        post_id: post.id || '',
        content_length: content.length
    });
    renderStudentHome();
};

function deleteNestedReply(postIndex, commentIndex, replyIndex) {
    const feed = getUserFeed();
    const post = feed[postIndex];
    const comments = Array.isArray(post?.commentObjects) ? post.commentObjects : [];
    const comment = comments[commentIndex];
    const replies = Array.isArray(comment?.replies) ? comment.replies : [];
    const reply = replies[replyIndex];
    if (!post || !comment || !reply) return;

    if (!isOwnedFeedComment(reply)) {
        alert('Bạn chỉ có thể xóa phản hồi của chính mình.');
        return;
    }

    if (!confirm('Bạn có chắc muốn xóa phản hồi này không?')) {
        return;
    }

    replies.splice(replyIndex, 1);
    savePublicFeed();
    trackInteraction('comment', reply?.id || `${post.id}-comment-${commentIndex}-reply-${replyIndex}`, {
        source: 'public-feed',
        action: 'delete_nested',
        post_id: post.id || ''
    });
    renderStudentHome();
}

document.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='addTag']")) {
        addManualTag("feed-tag-input", "feed-tag-container");
    }
    else if (event.target.closest("[data-action='publishPost']")) {
        publishFeedPost();
    }
    else if (event.target.closest("[data-action='delete-post']")) {
        const btn = event.target.closest("[data-action='delete-post']");
        deleteFeedPost(Number(btn?.dataset?.postIndex));
    }
    else if (event.target.closest("[data-action='delete-comment']")) {
        const btn = event.target.closest("[data-action='delete-comment']");
        deleteFeedComment(Number(btn?.dataset?.postIndex), Number(btn?.dataset?.commentIndex));
    }
    else if (event.target.closest("[data-action='show-reply-box']")) {
        const btn = event.target.closest("[data-action='show-reply-box']");
        const postIndex = btn.dataset.postIndex;
        const commentIndex = btn.dataset.commentIndex;
        const box = document.getElementById(`reply-box-${postIndex}-${commentIndex}`);
        if (box) {
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
            if (box.style.display === 'block') {
                box.querySelector('input')?.focus();
            }
        }
    }
    else if (event.target.closest("[data-action='delete-reply']")) {
        const btn = event.target.closest("[data-action='delete-reply']");
        deleteNestedReply(Number(btn?.dataset?.postIndex), Number(btn?.dataset?.commentIndex), Number(btn?.dataset?.replyIndex));
    }
    else if (event.target.closest("[data-action='diary']")) {
        renderStudentDiary();
    }
    else if (event.target.closest("[data-action='book-session']")) {
        openBookingModal();
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
            persistReaction(btn, icon?.textContent || '❤️', true);
        } else {
            num.textContent = parseInt(num.textContent) - 1;
            btn.style.color = '';
            if (icon) icon.style.filter = 'grayscale(100%)';
            persistReaction(btn, icon?.textContent || '❤️', false);
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
            persistReaction(btn, reaction, true);
        } else {
            trackInteraction('reaction', getReactionTarget(btn)?.targetId || '', {
                source: 'public-feed',
                reaction,
                action: 'change'
            });
        }
        event.target.parentElement.style.display = 'none';
    }

});
