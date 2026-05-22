import { getStudentProfile, saveStudentProfile, getStudentSession } from '../studentState.js';
import { escapeHtml } from '../utils/utils.js';
import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { showNotification } from '../utils/utils.js';
import { isOwnedFeedPost, getCurrentProfileNames } from '../studentState.js';

function syncAuthProfileName(displayName) {
    const session = getAuthSession();
    if (!session) return;

    const nextSession = { ...session };
    if ('name' in nextSession) nextSession.name = displayName;
    if (nextSession.user) nextSession.user = { ...nextSession.user, name: displayName };

    localStorage.setItem('mindconnect:auth', JSON.stringify(nextSession));
}

function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedAvatarTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedAvatarTypes.includes(file.type)) {
        alert('Vui lòng chọn ảnh PNG, JPG, WebP hoặc GIF để làm avatar.');
        return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
        alert('Avatar nên nhỏ hơn 1.5MB để trình duyệt lưu ổn định.');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const preview = document.getElementById('profile-avatar-preview');
        if (!preview) return;
        preview.src = reader.result;
        preview.dataset.avatarUrl = reader.result;
    };
    reader.readAsDataURL(file);
}

function saveProfileSettings() {
    const previousProfile = getStudentProfile();
    const previousNames = getCurrentProfileNames(previousProfile);
    const nameInput = document.getElementById('profile-display-name');
    const bioInput = document.getElementById('profile-bio');
    const avatarPreview = document.getElementById('profile-avatar-preview');
    const nextName = nameInput?.value.trim() || '';

    if (nextName.length < 2) {
        alert('Tên hiển thị cần có ít nhất 2 ký tự.');
        return;
    }

    const updatedProfile = {
        name: nextName,
        email: previousProfile.email,
        avatarUrl: avatarPreview?.dataset.avatarUrl || avatarPreview?.getAttribute('src') || previousProfile.avatarUrl || 'logo.png',
        bio: bioInput?.value.trim() || ''
    };

    saveStudentProfile(updatedProfile);
    syncAuthProfileName(updatedProfile.name);
    currentUser.name = updatedProfile.name;
    currentUser.email = updatedProfile.email || currentUser.email;

    userFeed = userFeed.map(post => {
        const ownsPost = isOwnedFeedPost(post) || previousNames.has(post.author);
        const nextPost = { ...post };

        if (ownsPost) {
            nextPost.author = updatedProfile.name;
            nextPost.author_avatar = updatedProfile.avatarUrl;
            nextPost.owner_email = updatedProfile.email;
            nextPost.isUser = true;
        }

        if (Array.isArray(nextPost.commentObjects)) {
            nextPost.commentObjects = nextPost.commentObjects.map(comment => {
                const ownsComment = comment?.isUser || previousNames.has(comment?.author) || (
                    comment?.owner_email &&
                    updatedProfile.email &&
                    String(comment.owner_email).toLowerCase() === String(updatedProfile.email).toLowerCase()
                );
                return ownsComment
                    ? {
                        ...comment,
                        author: updatedProfile.name,
                        author_avatar: updatedProfile.avatarUrl,
                        owner_email: updatedProfile.email,
                        isUser: true
                    }
                    : comment;
            });
        }

        return nextPost;
    });
    savePublicFeed();

    updateStudentProfileBadge();
    showNotification('Đã cập nhật hồ sơ cá nhân.');
    renderProfile();
}

export function renderProfile() {
    const container = document.getElementById('student-main-content');
    updateNav(-1);
    animateMainContentSwap();

    const profile = getStudentProfile();
    const avatarUrl = profile.avatarUrl || 'logo.png';

    container.innerHTML = `
        <section class="mc-page">
            <div class="mc-page-header">
                <p class="mc-kicker">Thông tin cá nhân</p>
                <h1>User <span>Profile</span></h1>
                <p>Đổi tên hiển thị, avatar và phần giới thiệu xuất hiện trên News feed.</p>
            </div>

            <div class="mc-panel mc-profile-panel">
                <div class="mc-profile-editor">
                    <div class="mc-profile-avatar-block">
                        <img
                            id="profile-avatar-preview"
                            src="${escapeHtml(avatarUrl)}"
                            data-avatar-url="${escapeHtml(avatarUrl)}"
                            alt="Avatar"
                            class="mc-profile-avatar"
                        >
                        <input id="profile-avatar-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onchange="handleAvatarUpload(event)">
                        <label class="mc-btn mc-btn-outline" for="profile-avatar-input">Upload avatar</label>
                    </div>

                    <div class="mc-profile-fields">
                        <label class="mc-field-label" for="profile-display-name">Tên hiển thị</label>
                        <input id="profile-display-name" type="text" class="mc-input" value="${escapeHtml(profile.displayName || profile.name)}" maxlength="40">

                        <label class="mc-field-label" for="profile-email">Email tài khoản</label>
                        <input id="profile-email" type="email" class="mc-input" value="${escapeHtml(profile.email || '')}" disabled>

                        <label class="mc-field-label" for="profile-bio">Giới thiệu ngắn</label>
                        <textarea id="profile-bio" class="mc-textarea mc-profile-bio" maxlength="220">${escapeHtml(profile.bio || '')}</textarea>

                        <div class="mc-action-grid mc-profile-actions">
                            <button class="mc-btn mc-btn-primary" type="button" onclick="saveProfileSettings()">Lưu hồ sơ</button>
                            <button class="mc-btn mc-btn-outline" type="button" onclick="openFeedbackModal({ source_type: 'app' })">Gửi feedback</button>
                            <button class="mc-btn mc-btn-outline" type="button" onclick="logout()">Đăng xuất</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

export function logout() {
    localStorage.removeItem('mindconnect:auth');
    localStorage.removeItem('mindconnect:role');
    localStorage.removeItem('authSession');
    window.location.href = 'index.html';
}