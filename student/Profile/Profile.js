import { getStudentProfile, saveStudentProfile, getStudentSession } from '../studentState.js';
import { escapeHtml } from '../utils/utils.js';
import { updateNav } from '../utils/updateNav.js';
import { animateMainContentSwap } from '../animations.js';
import { showNotification } from '../utils/utils.js';
import { isOwnedFeedPost, getCurrentProfileNames } from '../studentState.js';
import { getAuthSession } from '../studentState.js';
import { getCurrentUserName, getCurrentUserEmail } from '../studentState.js';
import { setCurrentUserName, setCurrentUserEmail } from '../studentState.js';
import { syncAuthProfileName } from '../studentState.js';
import { getUserFeed, savePublicFeed } from '../../state.js';
import { updateStudentProfileBadge } from '../NewsFeed/NewsFeed.js';
import { openFeedbackModal } from '../Booking/Booking.js';
import { getStudentBookings, saveStudentBookings } from '../studentState.js';
import { getBackendReadyState } from '../../state.js';
import { apiRequest} from '../utils/utils.js';
import { getAuthHeaders } from '../API/getAuthHeaders.js';

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
    setCurrentUserName(updatedProfile.name);
    setCurrentUserEmail(updatedProfile.email);

    const userFeed = getUserFeed();
    const updatedUserFeed = userFeed.map(post => {
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
    userFeed.splice(0, userFeed.length, ...updatedUserFeed);
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
    const bookingsHtml = renderStudentBookingsHtml(getStudentBookings());

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
                        <input id="profile-avatar-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
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
                            <button class="mc-btn mc-btn-primary" type="button" data-action="save-profile">Lưu hồ sơ</button>
                            <button class="mc-btn mc-btn-outline" type="button" data-action="feedback">Gửi feedback</button>
                            <button class="mc-btn mc-btn-outline" type="button" data-action="logout">Đăng xuất</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mc-panel" style="margin-top:16px;">
                <div class="mc-chart-header">
                    <div>
                        <h3>Lịch hẹn của tôi</h3>
                        <p>Theo dõi các yêu cầu tham vấn bạn đã gửi cho nhà trường.</p>
                    </div>
                    <button class="mc-btn mc-btn-outline" type="button" data-action="refresh-bookings">Làm mới</button>
                </div>
                <div id="student-booking-list">
                    ${bookingsHtml}
                </div>
            </div>
        </section>
    `;
    const avatarInput = document.getElementById('profile-avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarUpload);
    }
    refreshStudentBookings({ silent: true });
}
document.addEventListener('click', event => {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');
    if (action === 'save-profile') {
        saveProfileSettings();
    } else if (action === 'logout') {
        logout();
    } else if (action === 'feedback') {
        openFeedbackModal();
    } else if (action === 'refresh-bookings') {
        refreshStudentBookings();
    } else if (action === 'reschedule-booking') {
        const bookingId = actionBtn.getAttribute('data-booking-id');
        if (bookingId) {
            openFeedbackModal({ bookingId });
        }
    }
});

function renderStudentBookingsHtml(bookings = []) {
    if (!bookings.length) {
        return `
            <div style="padding:16px; border:1px dashed #ead7df; border-radius:12px; color:#777; background:#fffafa;">
                Bạn chưa có lịch hẹn nào. Khi đặt lịch tham vấn, trạng thái lịch hẹn sẽ xuất hiện ở đây.
            </div>
        `;
    }

    return bookings.map(booking => `
        <div style="padding:14px; border:1px solid #f0dfe6; border-radius:12px; margin-top:10px; background:#fff;">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
                <div>
                    <strong>${formatBookingDateTime(booking.requested_time)}</strong>
                    <p style="margin:4px 0 0; color:#666; font-size:13px;">${escapeHtml(booking.location || getSupportLocation())}</p>
                </div>
                <span class="badge ${booking.status === 'completed' ? 'bg-low' : booking.status === 'rescheduled' ? 'bg-med' : 'bg-high'}">
                    ${escapeHtml(getBookingStatusLabel(booking.status))}
                </span>
            </div>
            ${booking.note ? `<p style="margin:10px 0 0; color:#555; font-size:13px;">${escapeHtml(booking.note)}</p>` : ''}
            ${booking.rescheduled_from ? `<p style="margin:8px 0 0; color:#9a6b00; font-size:12px;">Lịch này được tạo từ một lần hẹn lại.</p>` : ''}
        </div>
    `).join('');
}

function renderStudentBookingsList() {
    const list = document.getElementById('student-booking-list');
    if (list) list.innerHTML = renderStudentBookingsHtml(getStudentBookings());
}

async function refreshStudentBookings(options = {}) {
    if (!getBackendReadyState()) return;
    try {
        const remoteBookings = await apiRequest('/api/bookings/my');
        const hasAuthToken = Boolean(getAuthHeaders().Authorization);
        if (Array.isArray(remoteBookings) && (remoteBookings.length || hasAuthToken)) {
            setStudentBookings(remoteBookings);
            saveStudentBookings();
            renderStudentBookingsList();
        }
    } catch (error) {
        if (!options.silent) {
            showNotification('Chưa tải được lịch hẹn từ backend, đang hiển thị dữ liệu local.');
        }
    }
}

export function logout() {
    localStorage.removeItem('mindconnect:auth');
    localStorage.removeItem('mindconnect:role');
    localStorage.removeItem('authSession');
    window.location.href = 'index.html';
}